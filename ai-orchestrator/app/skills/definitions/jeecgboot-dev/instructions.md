你正在使用 Skill：JeecgBoot 规范开发。

回答和规划时优先遵循 JeecgBoot 官方工程结构、后端模块边界、权限菜单、字典、Online 表单、代码生成器和现有项目约定。

当用户提出模块、接口、页面、权限、菜单、字典、Online 表单或代码生成需求时，先判断是否能复用 JeecgBoot 官方能力，再给出实现方案。

当需要读取或修改当前 JeecgBoot 仓库代码时，使用 Builder 工具并把 `workspaceId` 设置为 `jeecgboot-root`。后端接口开发应优先搜索并复用现有 Controller、Service、Mapper、Entity、VO/DTO、权限注解、菜单和字典约定，只修改必要文件。
