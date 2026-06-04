from typing import Any

from app.builder import BuilderTools
from app.tools.base import BaseTool, ToolResult, ToolSpec


class BuilderCreateWorkspaceTool(BaseTool):
    spec = ToolSpec(
        name="builder_create_workspace",
        description="基于 JeecgUniappTemplet 创建一个受控 Builder 工作区，并返回 workspaceId 和文件快照。",
        input_schema={
            "type": "object",
            "properties": {
                "conversationId": {
                    "type": "string",
                    "description": "当前会话 ID，用于生成可追踪的工作区名称。",
                },
            },
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return "创建 UniApp 工作区"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        workspace = self.builder_tools.create_workspace(tool_input.get("conversationId"))
        snapshot = self.builder_tools.get_snapshot(workspace.id)
        return ToolResult(
            tool_name=self.spec.name,
            result={
                "workspace": workspace.model_dump(by_alias=True),
                "snapshot": snapshot.model_dump(by_alias=True),
            },
        )


class BuilderGetSnapshotTool(BaseTool):
    spec = ToolSpec(
        name="builder_get_snapshot",
        description="读取受控工作区的文件结构快照。workspaceId 可使用具体 Builder 工作区，或使用 jeecgboot-root 读取整个 JeecgBoot 仓库结构。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "工作区 ID。使用 jeecgboot-root 可访问 JeecgBoot 仓库根目录。"},
            },
            "required": ["workspaceId"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return "读取工作区结构"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        workspace_id = str(tool_input.get("workspaceId") or "").strip()
        snapshot = self.builder_tools.get_snapshot(workspace_id)
        return ToolResult(
            tool_name=self.spec.name,
            result={"snapshot": snapshot.model_dump(by_alias=True)},
        )
