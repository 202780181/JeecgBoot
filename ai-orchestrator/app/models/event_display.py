from typing import Any


def operation_display(text: str, detail: str = "", icon: str = "search", status: str = "running") -> dict[str, Any]:
    return {
        "kind": "operation",
        "icon": icon,
        "text": text,
        "detail": detail,
        "status": status,
    }


def message_display(text: str) -> dict[str, Any]:
    return {
        "kind": "message",
        "text": text,
    }


def source_display(text: str, detail: str = "") -> dict[str, Any]:
    return {
        "kind": "source",
        "icon": "search",
        "text": text,
        "detail": detail,
        "status": "done",
    }


def file_changes_display(text: str, detail: str = "") -> dict[str, Any]:
    return {
        "kind": "file_changes",
        "icon": "edit",
        "text": text,
        "detail": detail,
        "status": "done",
    }


def tool_call_display(tool_name: str, title: str, tool_input: dict[str, Any] | None = None) -> dict[str, Any]:
    tool_input = tool_input or {}
    detail = _tool_detail(tool_name, tool_input)
    icon = "edit" if tool_name in {"builder_write_file", "builder_apply_patch"} else "search"
    text = title or f"正在执行 {tool_name}"
    if not text.startswith("正在") and not text.startswith("自动"):
        text = f"正在{text}"
    return operation_display(text=text, detail=detail, icon=icon, status="running")


def tool_result_display(tool_name: str, title: str, result: dict[str, Any] | None = None) -> dict[str, Any]:
    result = result or {}
    if tool_name == "web_search":
        count = _list_count(result, "results")
        return source_display("已完成联网搜索", f"返回 {count} 条来源" if count else "")
    if tool_name in {"builder_write_file", "builder_apply_patch"}:
        return file_changes_display("已编辑文件", _file_change_detail(result))
    if tool_name == "builder_read_file":
        return operation_display("已读取文件", str(result.get("path") or ""), "search", "done")
    if tool_name in {"builder_search_files", "builder_grep_files"}:
        count = _list_count(result, "matches")
        return operation_display("已搜索项目文件", f"命中 {count} 项" if count else "", "search", "done")
    if tool_name in {"builder_run_script", "builder_build_h5"}:
        status = str(result.get("status") or "")
        exit_code = result.get("exitCode")
        detail = f"status={status}"
        if exit_code is not None:
            detail += f"，exitCode={exit_code}"
        return operation_display("已运行命令", detail, "terminal", "done" if status != "failed" else "error")
    if tool_name == "builder_check_preview_h5":
        status = str(result.get("status") or "")
        return operation_display("已检查预览", status, "search", "done" if status != "failed" else "error")
    if tool_name == "weather":
        return operation_display("已查询天气", "", "search", "done")
    text = title or f"已执行 {tool_name}"
    if text.startswith("正在"):
        text = "已" + text[2:]
    return operation_display(text=text, detail=_tool_result_detail(result), icon="search", status="done")


def _tool_detail(tool_name: str, tool_input: dict[str, Any]) -> str:
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


def _tool_result_detail(result: dict[str, Any]) -> str:
    status = result.get("status")
    if status:
        return f"status={status}"
    return ""


def _file_change_detail(result: dict[str, Any]) -> str:
    path = result.get("path")
    if path:
        return str(path)
    changed_files = result.get("changedFiles") or []
    if isinstance(changed_files, list) and changed_files:
        return "，".join(str(item) for item in changed_files[:3])
    file_changes = result.get("fileChanges") or []
    if isinstance(file_changes, list) and file_changes:
        return f"{len(file_changes)} 个文件"
    return ""


def _list_count(result: dict[str, Any], key: str) -> int:
    value = result.get(key)
    return len(value) if isinstance(value, list) else 0
