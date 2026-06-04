from app.builder.command_runner import BuilderCommandRunner
from app.builder.file_service import BuilderFileService
from app.builder.models import (
    BuilderCommandResult,
    BuilderFileContent,
    BuilderFileSearchResult,
    BuilderGrepResult,
    BuilderPageList,
    BuilderPatchResult,
    BuilderPreviewCheckResult,
    BuilderPreviewResult,
    BuilderSnapshot,
    BuilderWorkspace,
    BuilderWorkspaceEntry,
    BuilderWriteResult,
)
from app.builder.preview_checker import BuilderPreviewChecker
from app.builder.preview_manager import BuilderPreviewManager
from app.builder.workspace_manager import WorkspaceManager


class BuilderTools:
    def __init__(self) -> None:
        self.workspace_manager = WorkspaceManager()
        self.file_service = BuilderFileService(self.workspace_manager)
        self.command_runner = BuilderCommandRunner(self.workspace_manager)
        self.preview_manager = BuilderPreviewManager(self.workspace_manager)
        self.preview_checker = BuilderPreviewChecker(self.workspace_manager, self.preview_manager)

    def create_workspace(self, conversation_id: str | None = None) -> BuilderWorkspace:
        return self.workspace_manager.create_workspace(conversation_id)

    def list_workspaces(self, limit: int = 50) -> list[BuilderWorkspaceEntry]:
        return self.workspace_manager.list_workspaces(limit)

    def find_workspaces(self, query: str, limit: int = 20) -> list[BuilderWorkspaceEntry]:
        return self.workspace_manager.find_workspaces(query, limit)

    def get_snapshot(self, workspace_id: str) -> BuilderSnapshot:
        return self.file_service.snapshot(workspace_id)

    def list_pages(self, workspace_id: str) -> BuilderPageList:
        return self.file_service.list_pages(workspace_id)

    def search_files(self, workspace_id: str, query: str, max_results: int = 50) -> BuilderFileSearchResult:
        return self.file_service.search_files(workspace_id, query, max_results)

    def grep_files(self, workspace_id: str, query: str, max_results: int = 80) -> BuilderGrepResult:
        return self.file_service.grep_files(workspace_id, query, max_results)

    def read_file(self, workspace_id: str, path: str) -> BuilderFileContent:
        return self.file_service.read_file(workspace_id, path)

    def write_file(self, workspace_id: str, path: str, content: str) -> BuilderWriteResult:
        return self.file_service.write_file(workspace_id, path, content)

    async def apply_patch(self, workspace_id: str, patch: str) -> BuilderPatchResult:
        return await self.command_runner.apply_patch(workspace_id, patch)

    async def run_build_h5(self, workspace_id: str, install: bool = False) -> BuilderCommandResult:
        return await self.command_runner.run_build_h5(workspace_id, install)

    async def run_script(self, workspace_id: str, script: str, install: bool = False) -> BuilderCommandResult:
        return await self.command_runner.run_script(workspace_id, script, install)

    async def start_preview_h5(self, workspace_id: str) -> BuilderPreviewResult:
        return await self.preview_manager.start_h5(workspace_id)

    async def check_preview_h5(self, workspace_id: str) -> BuilderPreviewCheckResult:
        return await self.preview_checker.check_h5(workspace_id)
