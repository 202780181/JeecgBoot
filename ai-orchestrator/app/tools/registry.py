from app.tools.base import BaseTool
from app.tools.weather import WeatherTool
from app.tools.web_search import WebSearchTool


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, BaseTool] = {
            WeatherTool.spec.name: WeatherTool(),
            WebSearchTool.spec.name: WebSearchTool(),
        }

    def register(self, tool: BaseTool) -> None:
        self._tools[tool.spec.name] = tool

    def get(self, name: str) -> BaseTool:
        if name not in self._tools:
            raise ValueError(f"未注册工具：{name}")
        return self._tools[name]

    def list_tools(self, names: list[str] | None = None) -> list[BaseTool]:
        if names is None:
            return list(self._tools.values())
        return [self.get(name) for name in names]

    def openai_tools(self, names: list[str] | None = None) -> list[dict]:
        return [tool.spec.to_openai_tool() for tool in self.list_tools(names)]
