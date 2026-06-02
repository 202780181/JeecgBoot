from app.skills.base import SkillSpec, SpecKitBinding


class SkillRegistry:
    def __init__(self) -> None:
        self._skills: dict[str, SkillSpec] = {
            "jeecgboot-dev": SkillSpec(
                id="jeecgboot-dev",
                name="JeecgBoot 规范开发",
                description="按 JeecgBoot 后端、Vue3 前端、权限、字典、菜单等官方规范分析和实现需求。",
                instruction=(
                    "你正在使用 Skill：JeecgBoot 规范开发。回答和规划时优先遵循 JeecgBoot 官方工程结构、"
                    "后端模块边界、权限菜单、字典、Online 表单、代码生成器和现有项目约定。"
                ),
                category="JeecgBoot",
                selection_mode="multiple",
                available_tool_names=["weather", "web_search"],
                default_tool_names=["weather"],
                forbidden_tool_names=[],
                spec_kit=SpecKitBinding(
                    enabled=True,
                    mode="suggest",
                    template="jeecgboot-dev",
                    instruction=(
                        "当用户需求涉及模块、接口、页面、权限、菜单、字典、Online 表单或代码生成时，"
                        "优先按 JeecgBoot 工程规范组织 Spec / Plan / Tasks。"
                    ),
                ),
                tags=["JeecgBoot", "后端", "Vue3"],
            ),
            "jeecgboot-uniapp-template": SkillSpec(
                id="jeecgboot-uniapp-template",
                name="JeecgBoot UniApp 模板开发",
                description="面向 JeecgBoot 后端 + JeecgUniapp 默认模板，开发移动端页面和接口对接。",
                instruction=(
                    "你正在使用 Skill：JeecgBoot UniApp 模板开发。移动端需求默认基于 JeecgUniapp 现有模板框架，"
                    "不要重新搭建框架；优先复用现有页面结构、请求封装、登录态、路由和组件风格，后端接口对接 JeecgBoot。"
                ),
                category="移动端",
                selection_mode="single",
                available_tool_names=["weather"],
                default_tool_names=[],
                forbidden_tool_names=["weather"],
                spec_kit=SpecKitBinding(
                    enabled=True,
                    mode="template",
                    template="jeecgboot-uniapp-template",
                    instruction=(
                        "生成规格时默认使用 JeecgBoot + JeecgUniapp 模板：后端接口落到 JeecgBoot，"
                        "移动端页面落到 JeecgUniapp 默认模板，不重新创建工程。"
                    ),
                ),
                tags=["JeecgBoot", "UniApp", "移动端"],
            ),
        }

    def list_skills(self) -> list[SkillSpec]:
        return list(self._skills.values())

    def get(self, skill_id: str) -> SkillSpec:
        if skill_id not in self._skills:
            raise ValueError(f"未注册 Skill：{skill_id}")
        return self._skills[skill_id]

    def resolve(self, skill_ids: list[str] | None) -> list[SkillSpec]:
        return [self.get(skill_id) for skill_id in skill_ids or []]
