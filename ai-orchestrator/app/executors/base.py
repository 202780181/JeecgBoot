from abc import ABC, abstractmethod

from app.models.schemas import TaskExecuteRequest, TaskExecuteResponse


class Executor(ABC):
    @abstractmethod
    def execute(self, request: TaskExecuteRequest) -> TaskExecuteResponse:
        raise NotImplementedError
