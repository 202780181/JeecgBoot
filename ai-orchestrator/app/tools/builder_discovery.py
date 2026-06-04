from typing import Any

from app.builder import BuilderTools
from app.tools.base import BaseTool, ToolResult, ToolSpec


class BuilderListWorkspacesTool(BaseTool):
    spec = ToolSpec(
        name="builder_list_workspaces",
        description="列出可用受控工作区，包括 jeecgboot-root 项目根目录和 ai-builder-workspaces 下已有的 Builder 工作区。",
        input_schema={
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "最多返回多少个工作区，默认 20。",
                    "minimum": 1,
                    "maximum": 100,
                },
            },
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return "列出 Builder 工作区"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        limit = int(tool_input.get("limit") or 20)
        workspaces = self.builder_tools.list_workspaces(limit)
        return ToolResult(
            tool_name=self.spec.name,
            result={"workspaces": [item.model_dump(by_alias=True) for item in workspaces]},
        )


class BuilderFindWorkspaceTool(BaseTool):
    spec = ToolSpec(
        name="builder_find_workspace",
        description="按 workspaceId、会话 ID 或关键词查找受控工作区。JeecgBoot 仓库根目录固定 workspaceId 为 jeecgboot-root。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "workspaceId、会话 ID 或项目关键词。"},
                "limit": {
                    "type": "integer",
                    "description": "最多返回多少个匹配工作区，默认 10。",
                    "minimum": 1,
                    "maximum": 50,
                },
            },
            "required": ["query"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return f"查找工作区：{tool_input.get('query') or ''}"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        query = str(tool_input.get("query") or "").strip()
        limit = int(tool_input.get("limit") or 10)
        matches = self.builder_tools.find_workspaces(query, limit)
        return ToolResult(
            tool_name=self.spec.name,
            result={"matches": [item.model_dump(by_alias=True) for item in matches]},
        )


class BuilderListPagesTool(BaseTool):
    spec = ToolSpec(
        name="builder_list_pages",
        description="列出指定受控工作区里的 UniApp 页面文件和页面配置文件。",
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
        return "列出 UniApp 页面"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = self.builder_tools.list_pages(str(tool_input.get("workspaceId") or "").strip())
        return ToolResult(tool_name=self.spec.name, result=result.model_dump(by_alias=True))


class BuilderSearchFilesTool(BaseTool):
    spec = ToolSpec(
        name="builder_search_files",
        description="按文件路径或文件名搜索指定受控工作区内的文件。workspaceId 可使用具体 Builder 工作区，或使用 jeecgboot-root 搜索整个 JeecgBoot 仓库。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "工作区 ID。使用 jeecgboot-root 可访问 JeecgBoot 仓库根目录。"},
                "query": {"type": "string", "description": "文件名、页面名或路径关键词。"},
                "maxResults": {
                    "type": "integer",
                    "description": "最多返回多少个文件，默认 50。",
                    "minimum": 1,
                    "maximum": 200,
                },
            },
            "required": ["workspaceId", "query"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return f"搜索文件：{tool_input.get('query') or ''}"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = self.builder_tools.search_files(
            str(tool_input.get("workspaceId") or "").strip(),
            str(tool_input.get("query") or "").strip(),
            int(tool_input.get("maxResults") or 50),
        )
        return ToolResult(tool_name=self.spec.name, result=result.model_dump(by_alias=True))


class BuilderGrepFilesTool(BaseTool):
    spec = ToolSpec(
        name="builder_grep_files",
        description="在指定受控工作区的文本文件中搜索正文内容，返回命中的文件、行号和行内容。workspaceId 可使用具体 Builder 工作区，或使用 jeecgboot-root 搜索整个 JeecgBoot 仓库。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "工作区 ID。使用 jeecgboot-root 可访问 JeecgBoot 仓库根目录。"},
                "query": {"type": "string", "description": "要搜索的代码、接口、变量、文本或组件名。"},
                "maxResults": {
                    "type": "integer",
                    "description": "最多返回多少条命中，默认 80。",
                    "minimum": 1,
                    "maximum": 200,
                },
            },
            "required": ["workspaceId", "query"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return f"检索内容：{tool_input.get('query') or ''}"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = self.builder_tools.grep_files(
            str(tool_input.get("workspaceId") or "").strip(),
            str(tool_input.get("query") or "").strip(),
            int(tool_input.get("maxResults") or 80),
        )
        return ToolResult(tool_name=self.spec.name, result=result.model_dump(by_alias=True))
