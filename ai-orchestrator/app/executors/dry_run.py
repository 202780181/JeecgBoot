from app.executors.base import Executor
from app.models.schemas import ExecutorName, TaskExecuteRequest, TaskExecuteResponse


class DryRunExecutor(Executor):
    def __init__(self, executor: ExecutorName):
        self.executor = executor

    def execute(self, request: TaskExecuteRequest) -> TaskExecuteResponse:
        return TaskExecuteResponse(
            executor=self.executor,
            dry_run=request.dry_run,
            status="planned",
            summary=f"已选择 {self.executor}。当前版本只生成执行计划，不直接修改 JeecgBoot 或 JeecgUniapp。",
            next_steps=[
                "接入 spec-kit，生成 spec / plan / tasks。",
                "接入对应 JeecgBoot Skills、Admin API 或代码生成器。",
                "增加执行前人工确认和回滚记录。",
            ],
        )
