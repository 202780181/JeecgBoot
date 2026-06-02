from collections.abc import AsyncIterator
import json
from json import JSONDecodeError
from urllib.parse import urlparse
from uuid import uuid4

import httpx

from app.models.events import StreamEventType, stream_event
from app.models.schemas import AppChatStreamRequest, ModelConfig
from app.services.jeecg_client import JeecgClient
from app.services.spec_service import SpecKitResult, generate_spec_with_speckit
from app.skills import SkillRegistry
from app.skills.base import SkillSpec
from app.tools import ToolRegistry
from app.tools.base import BaseTool, ToolResult


class SkillValidationError(ValueError):
    def __init__(
        self,
        message: str,
        code: str,
        *,
        skill_ids: list[str] | None = None,
        tool_names: list[str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.skill_ids = skill_ids or []
        self.tool_names = tool_names or []

    def to_event_data(self) -> dict:
        data = {
            "code": self.code,
            "message": str(self),
        }
        if self.skill_ids:
            data["skillIds"] = self.skill_ids
        if self.tool_names:
            data["toolNames"] = self.tool_names
        return data


class ChatService:
    def __init__(
        self,
        jeecg_client: JeecgClient | None = None,
        tool_registry: ToolRegistry | None = None,
        skill_registry: SkillRegistry | None = None,
        spec_generator=generate_spec_with_speckit,
    ) -> None:
        self.jeecg_client = jeecg_client or JeecgClient()
        self.tool_registry = tool_registry or ToolRegistry()
        self.skill_registry = skill_registry or SkillRegistry()
        self.spec_generator = spec_generator

    async def stream(self, request: AppChatStreamRequest) -> AsyncIterator[str]:
        request_id = str(uuid4())
        conversation_id = request.conversation_id or "debug"
        topic_id = request.topic_id or ""
        yield stream_event(
            request_id,
            StreamEventType.INIT_REQUEST_ID,
            None,
            conversation_id,
            topic_id,
        )
        try:
            selected_skills = self._resolve_and_validate_skills(request.skill_ids)
            model = await self.jeecg_client.get_model_config(
                request.app.model_id,
                request.user_context,
            )
            for skill in selected_skills:
                yield stream_event(
                    request_id,
                    StreamEventType.SKILL_SELECTED,
                    {
                        "skillId": skill.id,
                        "skillName": skill.name,
                        "description": skill.description,
                        "category": skill.category,
                        "selectionMode": skill.selection_mode,
                        "availableToolNames": skill.available_tool_names,
                        "defaultToolNames": skill.default_tool_names,
                        "forbiddenToolNames": skill.forbidden_tool_names,
                    },
                    conversation_id,
                    topic_id,
                )
                if skill.spec_kit.enabled:
                    async for event in self._run_skill_spec_kit(
                        request_id,
                        conversation_id,
                        topic_id,
                        skill,
                        request.input,
                    ):
                        yield event
            messages = self._initial_messages(request)
            async for item in self._stream_complete(model, request, messages, use_tools=True):
                if isinstance(item, str):
                    yield stream_event(
                        request_id,
                        StreamEventType.MESSAGE,
                        {"message": item},
                        conversation_id,
                        topic_id,
                    )
                    continue

                tool_call = item
                tool, tool_input = self._resolve_tool_call(tool_call)
                tool_call_id = self._tool_call_id(tool_call)
                tool_call["id"] = tool_call_id
                yield stream_event(
                    request_id,
                    StreamEventType.TOOL_CALL,
                    {
                        "toolName": tool.spec.name,
                        "title": tool.call_title(tool_input),
                        "input": tool_input,
                        "toolCallId": tool_call_id,
                    },
                    conversation_id,
                    topic_id,
                )
                tool_result = await tool.run(tool_input)
                yield stream_event(
                    request_id,
                    StreamEventType.TOOL_RESULT,
                    {
                        **tool_result.model_dump(by_alias=True),
                        "title": tool.call_title(tool_input),
                        "toolCallId": tool_call_id,
                    },
                    conversation_id,
                    topic_id,
                )
                messages.extend(
                    [
                        self._assistant_tool_call_message(tool_call),
                        self._tool_result_message(tool_call_id, tool_result),
                    ]
                )
                async for chunk in self._stream_complete(model, request, messages, use_tools=False):
                    if isinstance(chunk, str):
                        yield stream_event(
                            request_id,
                            StreamEventType.MESSAGE,
                            {"message": chunk},
                            conversation_id,
                            topic_id,
                        )
                yield stream_event(
                    request_id,
                    StreamEventType.MESSAGE_END,
                    None,
                    conversation_id,
                    topic_id,
                )
                return

            yield stream_event(
                request_id,
                StreamEventType.MESSAGE_END,
                None,
                conversation_id,
                topic_id,
            )
        except SkillValidationError as exc:
            yield stream_event(
                request_id,
                StreamEventType.ERROR,
                exc.to_event_data(),
                conversation_id,
                topic_id,
            )
        except Exception as exc:
            yield stream_event(
                request_id,
                StreamEventType.ERROR,
                {"message": f"AI 对话失败：{exc}"},
                conversation_id,
                topic_id,
            )

    async def _stream_complete(
        self,
        model: ModelConfig,
        request: AppChatStreamRequest,
        messages: list[dict],
        use_tools: bool = False,
    ) -> AsyncIterator[str | dict]:
        payload, endpoint, headers, timeout = self._build_model_request(
            model,
            request,
            stream=True,
            messages=messages,
            use_tools=use_tools,
        )
        saw_stream_chunk = False
        pending_tool_calls: dict[int, dict] = {}
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", endpoint, json=payload, headers=headers) as response:
                if not response.is_success:
                    body = await response.aread()
                    self._raise_for_bad_model_response(
                        httpx.Response(
                            response.status_code,
                            content=body,
                            headers=response.headers,
                            request=response.request,
                        ),
                        endpoint,
                    )
                content_type = response.headers.get("content-type", "")
                if "text/event-stream" not in content_type.lower():
                    body = await response.aread()
                    completion = self._parse_model_response(
                        httpx.Response(
                            response.status_code,
                            content=body,
                            headers=response.headers,
                            request=response.request,
                        ),
                        endpoint,
                    )
                    tool_calls = self._extract_tool_calls(completion)
                    if tool_calls:
                        yield tool_calls[0]
                        return
                    yield self._extract_completion_text(completion, endpoint)
                    return

                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line.removeprefix("data:").strip()
                    if not data:
                        continue
                    if data == "[DONE]":
                        break
                    chunk, tool_calls = self._parse_model_stream_chunk(data, endpoint)
                    if chunk:
                        saw_stream_chunk = True
                        yield chunk
                    for tool_call_delta in tool_calls:
                        self._merge_tool_call_delta(pending_tool_calls, tool_call_delta)

                tool_calls = self._finalize_tool_calls(pending_tool_calls)
                if tool_calls:
                    yield tool_calls[0]
                    return
                if not saw_stream_chunk:
                    raise ValueError("模型未返回流式文本")

    async def _complete(self, model: ModelConfig, request: AppChatStreamRequest) -> str:
        payload, endpoint, headers, timeout = self._build_model_request(
            model,
            request,
            stream=False,
            messages=self._initial_messages(request),
            use_tools=False,
        )
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
        self._raise_for_bad_model_response(response, endpoint)
        return self._extract_completion_text(self._parse_model_response(response, endpoint), endpoint)

    async def _run_skill_spec_kit(
        self,
        request_id: str,
        conversation_id: str,
        topic_id: str,
        skill: SkillSpec,
        requirement: str,
    ) -> AsyncIterator[str]:
        yield self._spec_event(
            request_id,
            conversation_id,
            topic_id,
            skill,
            stage="start",
            status="running",
            message=f"开始执行 spec-kit：{skill.spec_kit.template or skill.name}",
        )
        try:
            result = self.spec_generator(requirement)
        except Exception as exc:
            yield self._spec_event(
                request_id,
                conversation_id,
                topic_id,
                skill,
                stage="failed",
                status="failed",
                message=f"spec-kit 执行失败：{exc}",
            )
            return

        for stage, title, path in (
            ("spec", "Spec 已生成", result.spec_path),
            ("plan", "Plan 已生成", result.plan_path),
            ("tasks", "Tasks 已生成", result.tasks_path),
        ):
            yield self._spec_event(
                request_id,
                conversation_id,
                topic_id,
                skill,
                stage=stage,
                status="completed",
                message=title,
                artifact={
                    "type": stage,
                    "path": path,
                    "title": title,
                },
            )
        yield self._spec_event(
            request_id,
            conversation_id,
            topic_id,
            skill,
            stage="completed",
            status="completed",
            message="spec-kit 已完成 Spec / Plan / Tasks 生成",
            result=result,
        )

    def _spec_event(
        self,
        request_id: str,
        conversation_id: str,
        topic_id: str,
        skill: SkillSpec,
        *,
        stage: str,
        status: str,
        message: str,
        artifact: dict | None = None,
        result: SpecKitResult | None = None,
    ) -> str:
        data = {
            "stage": stage,
            "status": status,
            "message": message,
            "skillId": skill.id,
            "skillName": skill.name,
            "template": skill.spec_kit.template,
            "mode": skill.spec_kit.mode,
        }
        if artifact:
            data["artifact"] = artifact
        if result:
            data["result"] = {
                "note": result.note,
                "source": result.source,
                "featureDir": result.feature_dir,
                "specPath": result.spec_path,
                "planPath": result.plan_path,
                "tasksPath": result.tasks_path,
                "taskCount": len(result.tasks),
            }
        return stream_event(
            request_id,
            StreamEventType.SPEC_EVENT,
            data,
            conversation_id,
            topic_id,
        )

    def _initial_messages(self, request: AppChatStreamRequest) -> list[dict]:
        prompt = request.app.prompt or "你是 JeecgBoot AI 应用开发助手。请直接、准确地回答用户问题。"
        skill_prompt = self._skill_prompt(request.skill_ids)
        if skill_prompt:
            prompt = f"{prompt}\n\n{skill_prompt}"
        if request.enable_search:
            prompt = (
                f"{prompt}\n\n"
                "联网搜索已开启。遇到实时信息、新闻、价格、版本、官方文档、网页资料或你不确定的信息时，"
                "优先调用 web_search 工具；回答时要基于搜索结果总结，并尽量附上来源链接。"
            )
        return [
            {"role": "system", "content": prompt},
            *self._context_messages(request),
            {"role": "user", "content": request.input},
        ]

    def _context_messages(self, request: AppChatStreamRequest) -> list[dict]:
        context_messages: list[dict] = []
        for message in request.messages[-12:]:
            role = message.role if message.role in {"user", "assistant"} else ""
            content = message.content.strip()
            if not role or not content or content == request.input:
                continue
            context_messages.append({"role": role, "content": content[:4000]})
        return context_messages

    def _skill_prompt(self, skill_ids: list[str] | None) -> str:
        skills = self.skill_registry.resolve(skill_ids)
        if not skills:
            return ""
        instructions = "\n".join(f"- {skill.name}: {skill.instruction}" for skill in skills)
        spec_instructions = "\n".join(
            f"- {skill.name}: template={skill.spec_kit.template or 'default'}，mode={skill.spec_kit.mode}。{skill.spec_kit.instruction or ''}"
            for skill in skills
            if skill.spec_kit.enabled
        )
        prompt = f"已启用以下 Skills，请严格结合这些技能约束回答：\n{instructions}"
        if spec_instructions:
            prompt = f"{prompt}\n\nspec-kit 绑定策略：\n{spec_instructions}"
        return prompt

    def _resolve_and_validate_skills(self, skill_ids: list[str] | None) -> list[SkillSpec]:
        normalized_skill_ids = self._dedupe_names(skill_ids or [])
        if not normalized_skill_ids:
            return []

        selected_skills: list[SkillSpec] = []
        for skill_id in normalized_skill_ids:
            try:
                selected_skills.append(self.skill_registry.get(skill_id))
            except ValueError as exc:
                raise SkillValidationError(
                    f"Skill 不存在或未注册：{skill_id}",
                    "SKILL_NOT_FOUND",
                    skill_ids=[skill_id],
                ) from exc

        self._validate_skill_conflicts(selected_skills)
        self._validate_skill_tools(selected_skills)
        return selected_skills

    def _validate_skill_conflicts(self, skills: list[SkillSpec]) -> None:
        if len(skills) <= 1:
            return
        single_skills = [skill for skill in skills if skill.selection_mode == "single"]
        if not single_skills:
            return
        raise SkillValidationError(
            "已选择的 Skills 存在互斥关系，请只保留一个单选 Skill 后再发送。",
            "SKILL_CONFLICT",
            skill_ids=[skill.id for skill in skills],
        )

    def _validate_skill_tools(self, skills: list[SkillSpec]) -> None:
        registered_tool_names = {tool.spec.name for tool in self.tool_registry.list_tools()}
        missing_tool_names: list[str] = []
        for skill in skills:
            referenced_tool_names = [
                *(skill.available_tool_names or []),
                *skill.default_tool_names,
                *skill.forbidden_tool_names,
            ]
            for tool_name in referenced_tool_names:
                if tool_name not in registered_tool_names and tool_name not in missing_tool_names:
                    missing_tool_names.append(tool_name)
        if missing_tool_names:
            raise SkillValidationError(
                f"Skill 依赖的工具不可用：{', '.join(missing_tool_names)}",
                "SKILL_TOOL_UNAVAILABLE",
                skill_ids=[skill.id for skill in skills],
                tool_names=missing_tool_names,
            )

    def _available_tool_names(self, skill_ids: list[str] | None, enable_search: bool = False) -> list[str] | None:
        skills = self.skill_registry.resolve(skill_ids)
        if not skills:
            if enable_search:
                return [tool.spec.name for tool in self.tool_registry.list_tools()]
            return self._non_search_tool_names()
        tool_names: list[str] | None = None
        forbidden_names: set[str] = set()
        has_explicit_tool_allowlist = False
        for skill in skills:
            forbidden_names.update(skill.forbidden_tool_names)
            if skill.available_tool_names is not None:
                has_explicit_tool_allowlist = True
                tool_names = tool_names or []
                for name in skill.available_tool_names:
                    if name not in tool_names:
                        tool_names.append(name)
            for name in skill.default_tool_names:
                tool_names = tool_names or []
                if name not in tool_names:
                    tool_names.append(name)
        if tool_names is None:
            tool_names = [tool.spec.name for tool in self.tool_registry.list_tools()]
        if enable_search and not has_explicit_tool_allowlist and "web_search" not in tool_names:
            tool_names.append("web_search")
        if not enable_search:
            forbidden_names.add("web_search")
        return [name for name in tool_names if name not in forbidden_names]

    def _non_search_tool_names(self) -> list[str]:
        return [tool.spec.name for tool in self.tool_registry.list_tools() if tool.spec.name != "web_search"]

    def _dedupe_names(self, names: list[str]) -> list[str]:
        result: list[str] = []
        for name in names:
            if name and name not in result:
                result.append(name)
        return result

    def _build_model_request(
        self,
        model: ModelConfig,
        request: AppChatStreamRequest,
        stream: bool,
        messages: list[dict],
        use_tools: bool,
    ) -> tuple[dict, str, dict, int | float]:
        if not model.base_url:
            raise ValueError("模型 API 域名不能为空")
        if not model.model_name:
            raise ValueError("模型名称不能为空")
        if not model.credential.api_key:
            raise ValueError("模型 API Key 不能为空")

        endpoint = self._chat_completions_endpoint(model.base_url)

        payload = {
            "model": model.model_name,
            "messages": messages,
            "stream": stream,
        }
        if use_tools:
            tools = self.tool_registry.openai_tools(
                self._available_tool_names(request.skill_ids, request.enable_search)
            )
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"
        self._merge_generation_params(payload, model.model_params)
        payload["stream"] = stream
        headers = {
            "Authorization": f"Bearer {model.credential.api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream" if stream else "application/json",
        }
        return payload, endpoint, headers, model.model_params.get("timeout") or 120

    def _extract_completion_text(self, body: dict, endpoint: str) -> str:
        choices = body.get("choices") or []
        if not choices:
            raise ValueError(f"模型未返回内容：endpoint={endpoint}")
        message = choices[0].get("message") or {}
        content = message.get("content") or choices[0].get("text") or ""
        return content.strip() or "模型未返回有效文本。"

    def _extract_tool_calls(self, body: dict) -> list[dict]:
        choices = body.get("choices") or []
        if not choices:
            return []
        message = choices[0].get("message") or {}
        tool_calls = message.get("tool_calls") or []
        return tool_calls if isinstance(tool_calls, list) else []

    def _parse_model_stream_chunk(self, data: str, endpoint: str) -> tuple[str, list[dict]]:
        try:
            body = json.loads(data)
        except JSONDecodeError:
            raise ValueError(f"模型流式响应格式不正确：endpoint={endpoint}，响应={data[:300]}") from None
        choices = body.get("choices") or []
        if not choices:
            return "", []
        choice = choices[0]
        delta = choice.get("delta") or {}
        content = delta.get("content")
        if content is None:
            content = choice.get("text")
        tool_calls = delta.get("tool_calls") or []
        if not isinstance(tool_calls, list):
            tool_calls = []
        return (str(content) if content is not None else ""), tool_calls

    def _merge_tool_call_delta(self, pending_tool_calls: dict[int, dict], delta: dict) -> None:
        index = int(delta.get("index") or 0)
        pending = pending_tool_calls.setdefault(
            index,
            {
                "id": "",
                "type": "function",
                "function": {"name": "", "arguments": ""},
            },
        )
        if delta.get("id"):
            pending["id"] = delta["id"]
        function_delta = delta.get("function") or {}
        if function_delta.get("name"):
            pending["function"]["name"] += function_delta["name"]
        if function_delta.get("arguments"):
            pending["function"]["arguments"] += function_delta["arguments"]

    def _finalize_tool_calls(self, pending_tool_calls: dict[int, dict]) -> list[dict]:
        return [pending_tool_calls[index] for index in sorted(pending_tool_calls)]

    def _resolve_tool_call(self, tool_call: dict) -> tuple[BaseTool, dict]:
        function = tool_call.get("function") or {}
        name = function.get("name")
        if not name:
            raise ValueError("模型返回的工具调用缺少工具名称")
        arguments = function.get("arguments") or "{}"
        if isinstance(arguments, str):
            try:
                tool_input = json.loads(arguments or "{}")
            except JSONDecodeError:
                raise ValueError(f"模型返回的工具参数不是 JSON：tool={name}，arguments={arguments[:300]}") from None
        elif isinstance(arguments, dict):
            tool_input = arguments
        else:
            raise ValueError(f"模型返回的工具参数格式不正确：tool={name}")
        return self.tool_registry.get(str(name)), tool_input

    def _tool_call_id(self, tool_call: dict) -> str:
        return str(tool_call.get("id") or f"call-{uuid4()}")

    def _assistant_tool_call_message(self, tool_call: dict) -> dict:
        return {
            "role": "assistant",
            "content": None,
            "tool_calls": [tool_call],
        }

    def _tool_result_message(self, tool_call_id: str, tool_result: ToolResult) -> dict:
        return {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "name": tool_result.tool_name,
            "content": json.dumps(tool_result.model_dump(by_alias=True), ensure_ascii=False),
        }

    def _raise_for_bad_model_response(self, response: httpx.Response, endpoint: str) -> None:
        if response.is_success:
            return
        detail = self._response_excerpt(response)
        raise ValueError(f"模型接口调用失败：HTTP {response.status_code}，endpoint={endpoint}，响应={detail}")

    def _parse_model_response(self, response: httpx.Response, endpoint: str) -> dict:
        if not response.content:
            raise ValueError(f"模型接口返回空响应：endpoint={endpoint}")
        try:
            body = response.json()
        except JSONDecodeError:
            content_type = response.headers.get("content-type", "")
            detail = self._response_excerpt(response)
            raise ValueError(f"模型接口返回非 JSON 响应：endpoint={endpoint}，content-type={content_type}，响应={detail}") from None
        if not isinstance(body, dict):
            raise ValueError(f"模型接口返回格式不正确：endpoint={endpoint}")
        return body

    def _response_excerpt(self, response: httpx.Response, limit: int = 300) -> str:
        text = response.text.strip()
        if not text:
            return "<empty>"
        return text[:limit]

    def _chat_completions_endpoint(self, base_url: str) -> str:
        base_url = base_url.rstrip("/")
        path = urlparse(base_url).path.rstrip("/")
        if path.endswith("/chat/completions"):
            return base_url
        if not path:
            return f"{base_url}/v1/chat/completions"
        return f"{base_url}/chat/completions"

    def _merge_generation_params(self, payload: dict, model_params: dict) -> None:
        mapping = {
            "temperature": "temperature",
            "topP": "top_p",
            "presencePenalty": "presence_penalty",
            "frequencyPenalty": "frequency_penalty",
            "maxTokens": "max_tokens",
        }
        for source, target in mapping.items():
            value = model_params.get(source)
            if value is not None:
                payload[target] = value
        extra_params = model_params.get("extraParams")
        if isinstance(extra_params, dict):
            payload.update(extra_params)
