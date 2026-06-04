from typing import Any

from app.builder import BuilderTools
from app.tools.base import BaseTool, ToolResult, ToolSpec


class BuilderReadFileTool(BaseTool):
    spec = ToolSpec(
        name="builder_read_file",
        description="读取受控工作区中的文本文件内容。workspaceId 可使用具体 Builder 工作区，或使用 jeecgboot-root 读取整个 JeecgBoot 仓库内文件。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "工作区 ID。使用 jeecgboot-root 可访问 JeecgBoot 仓库根目录。"},
                "path": {"type": "string", "description": "工作区内相对文件路径。"},
            },
            "required": ["workspaceId", "path"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return f"读取文件：{tool_input.get('path') or ''}"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        content = self.builder_tools.read_file(
            str(tool_input.get("workspaceId") or "").strip(),
            str(tool_input.get("path") or "").strip(),
        )
        return ToolResult(
            tool_name=self.spec.name,
            result=content.model_dump(by_alias=True),
        )


class BuilderWriteFileTool(BaseTool):
    spec = ToolSpec(
        name="builder_write_file",
        description="写入受控工作区中的文本文件。workspaceId 可使用具体 Builder 工作区，或使用 jeecgboot-root 修改整个 JeecgBoot 仓库内文件。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "工作区 ID。使用 jeecgboot-root 可访问 JeecgBoot 仓库根目录。"},
                "path": {"type": "string", "description": "工作区内相对文件路径。"},
                "content": {"type": "string", "description": "完整文件内容。"},
            },
            "required": ["workspaceId", "path", "content"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return f"写入文件：{tool_input.get('path') or ''}"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = self.builder_tools.write_file(
            str(tool_input.get("workspaceId") or "").strip(),
            str(tool_input.get("path") or "").strip(),
            str(tool_input.get("content") or ""),
        )
        return ToolResult(
            tool_name=self.spec.name,
            result=result.model_dump(by_alias=True),
        )


class BuilderApplyPatchTool(BaseTool):
    spec = ToolSpec(
        name="builder_apply_patch",
        description="对受控工作区应用 unified diff 补丁。workspaceId 可使用具体 Builder 工作区，或使用 jeecgboot-root 修改整个 JeecgBoot 仓库内文件。补丁文件路径必须是 a/path 与 b/path 格式。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "工作区 ID。使用 jeecgboot-root 可访问 JeecgBoot 仓库根目录。"},
                "patch": {"type": "string", "description": "unified diff 补丁内容。"},
            },
            "required": ["workspaceId", "patch"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return "应用代码补丁"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = await self.builder_tools.apply_patch(
            str(tool_input.get("workspaceId") or "").strip(),
            str(tool_input.get("patch") or ""),
        )
        return ToolResult(
            tool_name=self.spec.name,
            result=result.model_dump(by_alias=True),
        )
