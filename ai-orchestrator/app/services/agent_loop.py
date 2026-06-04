from collections.abc import AsyncIterator, Callable
import json
from pathlib import Path
from uuid import uuid4

from app.models.events import StreamEventType, StreamEventWriter
from app.models.event_display import tool_call_display, tool_result_display
from app.models.schemas import AppChatStreamRequest, ModelConfig
from app.builder.workspace_manager import WorkspaceManager
from app.tools.base import BaseTool, ToolResult


class BuilderAgentLoop:
    WRITE_TOOLS = {"builder_write_file", "builder_apply_patch"}
    VERIFY_TOOL = "builder_run_script"
    PREVIEW_CHECK_TOOL = "builder_check_preview_h5"
    DEFAULT_VERIFY_SCRIPTS = ["build:h5"]
    OPTIONAL_VERIFY_SCRIPTS = ["type-check", "lint", "test"]

    def __init__(
        self,
        *,
        tool_resolver: Callable[[dict], tuple[BaseTool, dict]],
        tool_call_id: Callable[[dict], str],
        assistant_tool_call_message: Callable[[dict], dict],
        tool_result_message: Callable[[str, ToolResult], dict],
        stream_complete: Callable[[ModelConfig, AppChatStreamRequest, list[dict], bool], AsyncIterator[str | dict]],
        max_repair_attempts: int = 3,
        allowed_tool_names: list[str] | None = None,
    ) -> None:
        self.tool_resolver = tool_resolver
        self.tool_call_id = tool_call_id
        self.assistant_tool_call_message = assistant_tool_call_message
        self.tool_result_message = tool_result_message
        self.stream_complete = stream_complete
        self.max_repair_attempts = max(1, max_repair_attempts)
        self.allowed_tool_names = set(allowed_tool_names) if allowed_tool_names is not None else None

    async def run(
        self,
        *,
        model: ModelConfig,
        request: AppChatStreamRequest,
        messages: list[dict],
        event_writer: StreamEventWriter,
        max_tool_rounds: int,
    ) -> AsyncIterator[str]:
        tool_rounds = 0
        repair_attempts = 0
        pending_verification_workspace_id: str | None = None
        last_error_signature = ""
        repeated_error_count = 0

        while True:
            saw_tool_call = False
            async for item in self.stream_complete(model, request, messages, True):
                if isinstance(item, str):
                    yield event_writer.event(
                        StreamEventType.MESSAGE,
                        {"message": item},
                    )
                    continue

                saw_tool_call = True
                tool_rounds += 1
                if tool_rounds > max_tool_rounds:
                    raise ValueError(f"工具调用轮数超过限制（{max_tool_rounds}），请拆分任务后继续。")

                try:
                    execution = await self._execute_model_tool_call(
                        item,
                        messages,
                        event_writer,
                    )
                except _ToolExecutionError as exc:
                    for event in exc.events:
                        yield event
                    raise exc.original from exc.original
                for event in execution.events:
                    yield event
                if execution.tool_name in self.WRITE_TOOLS and execution.workspace_id:
                    pending_verification_workspace_id = execution.workspace_id
                break

            if saw_tool_call:
                if pending_verification_workspace_id:
                    verify_result = await self._run_builder_verification_plan(
                        pending_verification_workspace_id,
                        request,
                        model,
                        messages,
                        event_writer,
                    )
                    for event in verify_result.events:
                        yield event
                    pending_verification_workspace_id = None
                    if verify_result.success:
                        repair_attempts = 0
                        last_error_signature = ""
                        repeated_error_count = 0
                    else:
                        repair_attempts += 1
                        error_signature = self._error_signature(verify_result.tool_result)
                        repeated_error_count = repeated_error_count + 1 if error_signature == last_error_signature else 1
                        last_error_signature = error_signature
                        if repair_attempts >= self.max_repair_attempts or repeated_error_count >= 2:
                            messages.append(self._repair_limit_message(verify_result.tool_result, repair_attempts, repeated_error_count))
                        else:
                            messages.append(self._repair_instruction_message(verify_result.tool_result, repair_attempts))
                        continue
                continue

            if pending_verification_workspace_id:
                verify_result = await self._run_builder_verification_plan(
                    pending_verification_workspace_id,
                    request,
                    model,
                    messages,
                    event_writer,
                )
                for event in verify_result.events:
                    yield event
                pending_verification_workspace_id = None
                if not verify_result.success and repair_attempts < self.max_repair_attempts:
                    repair_attempts += 1
                    messages.append(self._repair_instruction_message(verify_result.tool_result, repair_attempts))
                    continue
            break

    async def _execute_model_tool_call(
        self,
        tool_call: dict,
        messages: list[dict],
        event_writer: StreamEventWriter,
    ) -> "_ToolExecution":
        tool, tool_input = self.tool_resolver(tool_call)
        if self.allowed_tool_names is not None and tool.spec.name not in self.allowed_tool_names:
            raise ValueError(f"当前请求的安全预检不允许调用工具：{tool.spec.name}")
        tool_call_id = self.tool_call_id(tool_call)
        tool_call["id"] = tool_call_id
        events = [
            event_writer.event(
                StreamEventType.TOOL_CALL,
                {
                    "toolName": tool.spec.name,
                    "title": tool.call_title(tool_input),
                    "summary": self._tool_input_summary(tool.spec.name, tool_input),
                    "display": tool_call_display(tool.spec.name, tool.call_title(tool_input), tool_input),
                    "input": tool_input,
                    "toolCallId": tool_call_id,
                },
            )
        ]
        try:
            tool_result = await tool.run(tool_input)
        except Exception as exc:
            raise _ToolExecutionError(events, exc) from exc
        events.append(
            event_writer.event(
                StreamEventType.TOOL_RESULT,
                {
                    **tool_result.model_dump(by_alias=True),
                    "title": tool.call_title(tool_input),
                    "summary": self._tool_result_summary(tool.spec.name, tool_result.result),
                    "display": tool_result_display(tool.spec.name, tool.call_title(tool_input), tool_result.result),
                    "fileChanges": self._file_changes(tool_result.result),
                    "artifacts": self._artifacts(tool_result.result),
                    "toolCallId": tool_call_id,
                },
            )
        )
        messages.extend(
            [
                self.assistant_tool_call_message(tool_call),
                self.tool_result_message(tool_call_id, tool_result),
            ]
        )
        return _ToolExecution(
            events=events,
            tool_name=tool.spec.name,
            tool_result=tool_result,
            workspace_id=self._workspace_id(tool_input, tool_result),
        )

    async def _run_builder_verification_plan(
        self,
        workspace_id: str,
        request: AppChatStreamRequest,
        model: ModelConfig,
        messages: list[dict],
        event_writer: StreamEventWriter,
    ) -> "_VerificationExecution":
        results: list[_VerificationExecution] = []
        scripts = self._verification_scripts(workspace_id, request, model)
        for script in scripts:
            result = await self._run_builder_verification(
                workspace_id,
                script,
                messages,
                event_writer,
            )
            results.append(result)
            if not result.success:
                return result
        if self._should_check_preview_h5(scripts, request, model):
            result = await self._run_builder_preview_check(
                workspace_id,
                messages,
                event_writer,
            )
            results.append(result)
            if not result.success:
                return result
        events = [event for result in results for event in result.events]
        tool_result = results[-1].tool_result if results else ToolResult(tool_name=self.VERIFY_TOOL, result={"workspaceId": workspace_id, "status": "success"})
        return _VerificationExecution(events=events, tool_result=tool_result, success=True)

    async def _run_builder_verification(
        self,
        workspace_id: str,
        script: str,
        messages: list[dict],
        event_writer: StreamEventWriter,
    ) -> "_VerificationExecution":
        tool_call_id = f"auto-verify-{uuid4()}"
        tool = self.tool_resolver(
            {
                "function": {
                    "name": self.VERIFY_TOOL,
                    "arguments": json.dumps({"workspaceId": workspace_id, "script": script, "install": False}, ensure_ascii=False),
                }
            }
        )[0]
        tool_input = {"workspaceId": workspace_id, "script": script, "install": False}
        tool_call = {
            "id": tool_call_id,
            "type": "function",
            "function": {
                "name": self.VERIFY_TOOL,
                "arguments": json.dumps(tool_input, ensure_ascii=False),
            },
        }
        events = [
            event_writer.event(
                StreamEventType.TOOL_CALL,
                {
                    "toolName": self.VERIFY_TOOL,
                    "title": self._verification_title(script),
                    "summary": script,
                    "display": tool_call_display(self.VERIFY_TOOL, self._verification_title(script), tool_input),
                    "input": tool_input,
                    "toolCallId": tool_call_id,
                    "agentStep": "verify",
                    "script": script,
                },
            )
        ]
        try:
            tool_result = await tool.run(tool_input)
        except Exception as exc:
            raise _ToolExecutionError(events, exc) from exc
        events.append(
            event_writer.event(
                StreamEventType.TOOL_RESULT,
                {
                    **tool_result.model_dump(by_alias=True),
                    "title": self._verification_title(script),
                    "summary": self._tool_result_summary(self.VERIFY_TOOL, tool_result.result),
                    "display": tool_result_display(self.VERIFY_TOOL, self._verification_title(script), tool_result.result),
                    "fileChanges": self._file_changes(tool_result.result),
                    "artifacts": self._artifacts(tool_result.result),
                    "toolCallId": tool_call_id,
                    "agentStep": "verify",
                    "script": script,
                },
            )
        )
        messages.extend(
            [
                self.assistant_tool_call_message(tool_call),
                self.tool_result_message(tool_call_id, tool_result),
            ]
        )
        return _VerificationExecution(
            events=events,
            tool_result=tool_result,
            success=tool_result.status == "success" and tool_result.result.get("status") == "success",
        )

    async def _run_builder_preview_check(
        self,
        workspace_id: str,
        messages: list[dict],
        event_writer: StreamEventWriter,
    ) -> "_VerificationExecution":
        tool_call_id = f"auto-preview-check-{uuid4()}"
        tool_input = {"workspaceId": workspace_id}
        tool = self.tool_resolver(
            {
                "function": {
                    "name": self.PREVIEW_CHECK_TOOL,
                    "arguments": json.dumps(tool_input, ensure_ascii=False),
                }
            }
        )[0]
        tool_call = {
            "id": tool_call_id,
            "type": "function",
            "function": {
                "name": self.PREVIEW_CHECK_TOOL,
                "arguments": json.dumps(tool_input, ensure_ascii=False),
            },
        }
        events = [
            event_writer.event(
                StreamEventType.TOOL_CALL,
                {
                    "toolName": self.PREVIEW_CHECK_TOOL,
                    "title": "自动检查 H5 预览",
                    "summary": workspace_id,
                    "display": tool_call_display(self.PREVIEW_CHECK_TOOL, "自动检查 H5 预览", tool_input),
                    "input": tool_input,
                    "toolCallId": tool_call_id,
                    "agentStep": "verify",
                },
            )
        ]
        try:
            tool_result = await tool.run(tool_input)
        except Exception as exc:
            raise _ToolExecutionError(events, exc) from exc
        events.append(
            event_writer.event(
                StreamEventType.TOOL_RESULT,
                {
                    **tool_result.model_dump(by_alias=True),
                    "title": "自动检查 H5 预览",
                    "summary": self._tool_result_summary(self.PREVIEW_CHECK_TOOL, tool_result.result),
                    "display": tool_result_display(self.PREVIEW_CHECK_TOOL, "自动检查 H5 预览", tool_result.result),
                    "fileChanges": self._file_changes(tool_result.result),
                    "artifacts": self._artifacts(tool_result.result),
                    "toolCallId": tool_call_id,
                    "agentStep": "verify",
                },
            )
        )
        messages.extend(
            [
                self.assistant_tool_call_message(tool_call),
                self.tool_result_message(tool_call_id, tool_result),
            ]
        )
        return _VerificationExecution(
            events=events,
            tool_result=tool_result,
            success=tool_result.status == "success" and tool_result.result.get("status") in {"success", "skipped"},
        )

    def _verification_scripts(self, workspace_id: str, request: AppChatStreamRequest, model: ModelConfig) -> list[str]:
        available_scripts = self._package_scripts(workspace_id)
        configured = self._configured_verify_scripts(model)
        requested = configured or self._default_verify_scripts_for_request(request)
        for script in self.OPTIONAL_VERIFY_SCRIPTS:
            if script in available_scripts and self._should_run_optional_script(script, request, model) and script not in requested:
                if script == "type-check":
                    requested.insert(0, script)
                else:
                    requested.append(script)
        return [script for script in requested if script in available_scripts]

    def _default_verify_scripts_for_request(self, request: AppChatStreamRequest) -> list[str]:
        if self._mentions_weixin_target(request) and not self._mentions_h5_target(request):
            return ["build:mp-weixin"]
        scripts = self.DEFAULT_VERIFY_SCRIPTS.copy()
        if self._mentions_weixin_target(request):
            scripts.append("build:mp-weixin")
        return scripts

    def _configured_verify_scripts(self, model: ModelConfig) -> list[str]:
        params = model.model_params or {}
        raw = params.get("builderVerifyScripts") or params.get("verifyScripts")
        if isinstance(raw, str):
            return [item.strip() for item in raw.split(",") if item.strip()]
        if isinstance(raw, list):
            return [str(item).strip() for item in raw if str(item).strip()]
        return []

    def _should_run_optional_script(self, script: str, request: AppChatStreamRequest, model: ModelConfig) -> bool:
        params = model.model_params or {}
        key = {
            "type-check": "builderRunTypeCheck",
            "lint": "builderRunLint",
            "test": "builderRunTest",
        }[script]
        if key in params:
            return bool(params.get(key))
        text = request.input.lower()
        if script == "lint":
            return "lint" in text or "eslint" in text or "代码规范" in text
        if script == "test":
            return "test" in text or "测试" in text
        if script == "type-check":
            return "类型" in request.input or "type" in text or "ts" in text
        return False

    def _mentions_weixin_target(self, request: AppChatStreamRequest) -> bool:
        text = request.input.lower()
        return "mp-weixin" in text or "微信" in request.input or "小程序" in request.input

    def _mentions_h5_target(self, request: AppChatStreamRequest) -> bool:
        text = request.input.lower()
        return "h5" in text or "网页" in request.input or "预览" in request.input

    def _should_check_preview_h5(self, scripts: list[str], request: AppChatStreamRequest, model: ModelConfig) -> bool:
        if "build:h5" not in scripts:
            return False
        params = model.model_params or {}
        for key in ("builderCheckPreviewH5", "checkPreviewH5", "builderScreenshotCheck"):
            if key in params:
                return bool(params.get(key))
        return not (self._mentions_weixin_target(request) and not self._mentions_h5_target(request))

    def _package_scripts(self, workspace_id: str) -> set[str]:
        for root in self._workspace_roots(workspace_id):
            package_json = root / "package.json"
            if not package_json.is_file():
                continue
            try:
                data = json.loads(package_json.read_text("utf-8"))
            except Exception:
                continue
            scripts = data.get("scripts") or {}
            if isinstance(scripts, dict):
                return {str(name) for name in scripts}
        return set()

    def _workspace_roots(self, workspace_id: str) -> list[Path]:
        try:
            return [WorkspaceManager().get_workspace_path(workspace_id)]
        except Exception:
            pass
        base = Path.cwd()
        return [
            base / "ai-builder-workspaces" / workspace_id,
            base.parent / "ai-builder-workspaces" / workspace_id,
        ]

    def _verification_title(self, script: str) -> str:
        mapping = {
            "build:h5": "自动校验 H5 构建",
            "build:mp-weixin": "自动校验微信小程序构建",
            "type-check": "自动校验类型检查",
            "lint": "自动校验代码规范",
            "test": "自动运行测试",
        }
        return mapping.get(script, f"自动校验 {script}")

    def _tool_input_summary(self, tool_name: str, tool_input: dict) -> str:
        if tool_name in {"builder_read_file", "builder_write_file"}:
            return str(tool_input.get("path") or "")
        if tool_name in {"builder_search_files", "builder_grep_files", "web_search"}:
            return str(tool_input.get("query") or tool_input.get("q") or "")
        if tool_name == "builder_run_script":
            return str(tool_input.get("script") or "")
        if tool_name.startswith("builder_"):
            return str(tool_input.get("workspaceId") or "")
        if tool_name == "weather":
            return str(tool_input.get("city") or tool_input.get("location") or "")
        return ""

    def _tool_result_summary(self, tool_name: str, result: dict) -> str:
        result = result or {}
        if tool_name == "web_search":
            results = result.get("results")
            return f"返回 {len(results)} 条来源" if isinstance(results, list) else ""
        if tool_name in {"builder_read_file", "builder_write_file"}:
            return str(result.get("path") or "")
        if tool_name in {"builder_run_script", "builder_build_h5"}:
            status = result.get("status") or ""
            exit_code = result.get("exitCode")
            return f"status={status}" + (f"，exitCode={exit_code}" if exit_code is not None else "")
        if tool_name == "builder_check_preview_h5":
            return str(result.get("status") or "")
        return str(result.get("status") or "")

    def _file_changes(self, result: dict) -> list[dict]:
        result = result or {}
        file_changes = result.get("fileChanges")
        if isinstance(file_changes, list) and file_changes:
            return [
                change
                for change in file_changes
                if isinstance(change, dict) and self._has_line_delta(change)
            ]
        path = result.get("path")
        if path and self._has_line_delta(result):
            return [
                {
                    "path": path,
                    "additions": result.get("additions"),
                    "deletions": result.get("deletions"),
                    "status": result.get("status"),
                }
            ]
        return []

    def _has_line_delta(self, item: dict) -> bool:
        try:
            additions = int(item.get("additions") or 0)
        except (TypeError, ValueError):
            additions = 0
        try:
            deletions = int(item.get("deletions") or 0)
        except (TypeError, ValueError):
            deletions = 0
        return additions > 0 or deletions > 0

    def _artifacts(self, result: dict) -> list[dict]:
        result = result or {}
        artifacts = []
        preview_url = result.get("previewUrl")
        if preview_url:
            artifacts.append({"type": "preview_url", "url": preview_url})
        workspace_id = result.get("workspaceId")
        if workspace_id:
            artifacts.append({"type": "workspace", "workspaceId": workspace_id})
        return artifacts

    def _repair_instruction_message(self, tool_result: ToolResult, attempt: int) -> dict:
        result = tool_result.result or {}
        stderr = str(result.get("stderr") or "").strip()
        stdout = str(result.get("stdout") or "").strip()
        command = " ".join(result.get("command") or [])
        if tool_result.tool_name == self.PREVIEW_CHECK_TOOL:
            preview_url = result.get("previewUrl") or ""
            console_errors = "\n".join(str(item) for item in (result.get("consoleErrors") or [])[:20])
            reason = result.get("reason") or "预览截图检查未通过"
            log = console_errors or str(result.get("bodyText") or "")[:3000] or reason
            content = (
                f"自动预览检查失败，正在进行第 {attempt} 次修复。\n"
                f"预览地址：{preview_url}\n"
                f"失败原因：{reason}\n"
                "请根据下面的预览检查信息定位原因，只修改必要文件，然后再次交给系统自动校验。\n"
                "```text\n"
                f"{log}\n"
                "```"
            )
            return {"role": "user", "content": content}
        content = (
            f"自动校验失败，正在进行第 {attempt} 次修复。\n"
            f"失败命令：{command or self.VERIFY_TOOL}\n"
            f"退出码：{result.get('exitCode')}\n"
            "请根据下面的构建日志定位原因，只修改必要文件，然后再次交给系统自动校验。\n"
            "```text\n"
            f"{stderr or stdout or '无构建日志'}\n"
            "```"
        )
        return {"role": "user", "content": content}

    def _repair_limit_message(self, tool_result: ToolResult, attempts: int, repeated_error_count: int) -> dict:
        result = tool_result.result or {}
        content = (
            "自动修复已达到停止条件，请停止继续修改并向用户说明当前状态。\n"
            f"修复次数：{attempts}\n"
            f"重复错误次数：{repeated_error_count}\n"
            f"最后退出码：{result.get('exitCode')}\n"
            "请给出已完成内容、仍失败原因和建议下一步。"
        )
        return {"role": "user", "content": content}

    def _error_signature(self, tool_result: ToolResult) -> str:
        result = tool_result.result or {}
        text = str(result.get("stderr") or result.get("stdout") or "")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines[:8])[:1000]

    def _workspace_id(self, tool_input: dict, tool_result: ToolResult) -> str | None:
        workspace_id = tool_input.get("workspaceId")
        if isinstance(workspace_id, str) and workspace_id.strip():
            return workspace_id.strip()
        result_workspace_id = (tool_result.result or {}).get("workspaceId")
        return result_workspace_id if isinstance(result_workspace_id, str) and result_workspace_id.strip() else None


class _ToolExecution:
    def __init__(self, *, events: list[str], tool_name: str, tool_result: ToolResult, workspace_id: str | None) -> None:
        self.events = events
        self.tool_name = tool_name
        self.tool_result = tool_result
        self.workspace_id = workspace_id


class _ToolExecutionError(Exception):
    def __init__(self, events: list[str], original: Exception) -> None:
        super().__init__(str(original))
        self.events = events
        self.original = original


class _VerificationExecution:
    def __init__(self, *, events: list[str], tool_result: ToolResult, success: bool) -> None:
        self.events = events
        self.tool_result = tool_result
        self.success = success
