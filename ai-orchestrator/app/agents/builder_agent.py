from app.builder.models import BuilderAgentResult
from app.builder.tools import BuilderTools


class BuilderAgent:
    def __init__(self, tools: BuilderTools | None = None) -> None:
        self.tools = tools or BuilderTools()

    def create_workspace(self, conversation_id: str | None = None) -> BuilderAgentResult:
        workspace = self.tools.create_workspace(conversation_id)
        snapshot = self.tools.get_snapshot(workspace.id)
        return BuilderAgentResult(workspace=workspace, snapshot=snapshot)
