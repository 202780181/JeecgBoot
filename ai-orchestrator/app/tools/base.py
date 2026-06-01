from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class ToolSpec(BaseModel):
    name: str
    description: str
    input_schema: dict[str, Any] = Field(default_factory=dict)

    def to_openai_tool(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema,
            },
        }


class ToolResult(BaseModel):
    tool_name: str = Field(serialization_alias="toolName")
    status: str = "success"
    result: dict[str, Any] = Field(default_factory=dict)


class BaseTool(ABC):
    spec: ToolSpec

    def call_title(self, tool_input: dict[str, Any]) -> str:
        return self.spec.description

    @abstractmethod
    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        pass
