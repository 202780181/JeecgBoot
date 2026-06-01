from typing import Literal

from pydantic import BaseModel, Field


class SpecKitBinding(BaseModel):
    enabled: bool = False
    mode: Literal["template", "suggest", "disabled"] = "disabled"
    template: str | None = None
    instruction: str | None = None


class SkillSpec(BaseModel):
    id: str
    name: str
    description: str
    instruction: str
    category: str = "通用"
    selection_mode: Literal["single", "multiple"] = "multiple"
    available_tool_names: list[str] | None = None
    default_tool_names: list[str] = Field(default_factory=list)
    forbidden_tool_names: list[str] = Field(default_factory=list)
    spec_kit: SpecKitBinding = Field(default_factory=SpecKitBinding)
    tags: list[str] = Field(default_factory=list)
