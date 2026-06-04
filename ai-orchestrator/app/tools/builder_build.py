from typing import Any

from app.builder import BuilderTools
from app.tools.base import BaseTool, ToolResult, ToolSpec


class BuilderBuildH5Tool(BaseTool):
    spec = ToolSpec(
        name="builder_build_h5",
        description="在 Builder 工作区执行 H5 构建。可选择先执行 pnpm install。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "Builder 工作区 ID。"},
                "install": {
                    "type": "boolean",
                    "description": "是否先执行 pnpm install。首次构建通常需要 true。",
                },
            },
            "required": ["workspaceId"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return "构建 H5"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = await self.builder_tools.run_build_h5(
            str(tool_input.get("workspaceId") or "").strip(),
            bool(tool_input.get("install") or False),
        )
        return ToolResult(
            tool_name=self.spec.name,
            status=result.status,
            result=result.model_dump(by_alias=True),
        )


class BuilderRunScriptTool(BaseTool):
    spec = ToolSpec(
        name="builder_run_script",
        description="在 Builder 工作区执行安全白名单 pnpm 脚本，用于自动校验。支持 build:h5、build:mp-weixin、type-check、lint、test。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "Builder 工作区 ID。"},
                "script": {
                    "type": "string",
                    "enum": ["build:h5", "build:mp-weixin", "type-check", "lint", "test"],
                    "description": "要执行的 pnpm 脚本名。",
                },
                "install": {
                    "type": "boolean",
                    "description": "是否先执行 pnpm install。首次构建通常需要 true。",
                },
            },
            "required": ["workspaceId", "script"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        script = str(tool_input.get("script") or "").strip()
        return f"运行 {script}"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = await self.builder_tools.run_script(
            str(tool_input.get("workspaceId") or "").strip(),
            str(tool_input.get("script") or "").strip(),
            bool(tool_input.get("install") or False),
        )
        return ToolResult(
            tool_name=self.spec.name,
            status=result.status,
            result=result.model_dump(by_alias=True),
        )


class BuilderStartPreviewH5Tool(BaseTool):
    spec = ToolSpec(
        name="builder_start_preview_h5",
        description="启动 Builder 工作区 H5 预览服务，并返回预览 URL。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "Builder 工作区 ID。"},
            },
            "required": ["workspaceId"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return "启动 H5 预览"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = await self.builder_tools.start_preview_h5(
            str(tool_input.get("workspaceId") or "").strip()
        )
        return ToolResult(
            tool_name=self.spec.name,
            status=result.status,
            result=result.model_dump(by_alias=True),
        )


class BuilderCheckPreviewH5Tool(BaseTool):
    spec = ToolSpec(
        name="builder_check_preview_h5",
        description="启动或复用 Builder 工作区 H5 预览，并用浏览器检查页面是否可渲染、非空白、无阻塞控制台错误。",
        input_schema={
            "type": "object",
            "properties": {
                "workspaceId": {"type": "string", "description": "Builder 工作区 ID。"},
            },
            "required": ["workspaceId"],
        },
    )

    def __init__(self, builder_tools: BuilderTools | None = None) -> None:
        self.builder_tools = builder_tools or BuilderTools()

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return "检查 H5 预览"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        result = await self.builder_tools.check_preview_h5(
            str(tool_input.get("workspaceId") or "").strip()
        )
        return ToolResult(
            tool_name=self.spec.name,
            status="success" if result.status in {"success", "skipped"} else "failed",
            result=result.model_dump(by_alias=True),
        )
