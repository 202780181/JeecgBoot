# AI Orchestrator

面向 JeecgBoot“官方能力优先”AI 开发流程的 FastAPI 编排服务。

本服务接收自然语言需求，优先匹配和调用 JeecgBoot 官方能力；只有当 JeecgBoot 官方能力无法满足需求时，才回退到自定义 JeecgUniapp 页面生成。

## 启动

要求 Python 3.11 或更高版本。

```bash
cd /Users/aaron/Desktop/guangzhou/JeecgBoot/ai-orchestrator
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 9100
```

## API

```text
GET  /health
POST /api/requirements/analyze
POST /api/spec/generate
POST /api/tasks/execute
GET  /api/capabilities
```

## 官方能力优先路由

优先级：

1. `jeecg-onlform`：用于标准 CRUD、登记、申请、巡检、报修、客户资料等表单类需求。
2. `jeecg-onlreport`：用于报表、SQL 查询视图、仪表盘/报表类需求。
3. `jeecg-bpmn`：用于审批和工作流需求。
4. `jeecg-codegen`：用于后端 Java 模块、复杂多表 CRUD、菜单权限 SQL 生成。
5. `jeecg-admin-api`：用于菜单、角色、用户、部门、公告和系统配置。
6. `uniapp-codegen`：仅当 JeecgBoot 官方能力无法满足移动端特定交互需求时使用。
