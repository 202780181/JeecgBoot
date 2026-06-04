from typing import Literal

from pydantic import BaseModel, Field


class BuilderWorkspace(BaseModel):
    id: str
    conversation_id: str | None = Field(default=None, alias="conversationId")
    path: str
    template_path: str = Field(alias="templatePath")
    created: bool = True


class BuilderWorkspaceEntry(BaseModel):
    id: str
    path: str
    conversation_id: str | None = Field(default=None, alias="conversationId")
    created_at: str | None = Field(default=None, alias="createdAt")
    updated_at: str | None = Field(default=None, alias="updatedAt")


class BuilderWorkspaceList(BaseModel):
    workspaces: list[BuilderWorkspaceEntry] = Field(default_factory=list)


class BuilderWorkspaceFindResult(BaseModel):
    matches: list[BuilderWorkspaceEntry] = Field(default_factory=list)


class BuilderFileEntry(BaseModel):
    path: str
    type: Literal["file", "directory"]
    size: int | None = None


class BuilderSnapshot(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    root: str
    files: list[BuilderFileEntry] = Field(default_factory=list)
    important_files: list[str] = Field(default_factory=list, alias="importantFiles")


class BuilderPageEntry(BaseModel):
    path: str
    name: str
    route: str | None = None
    source: str = "file"


class BuilderPageList(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    pages: list[BuilderPageEntry] = Field(default_factory=list)


class BuilderFileSearchResult(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    matches: list[BuilderFileEntry] = Field(default_factory=list)


class BuilderGrepMatch(BaseModel):
    path: str
    line_number: int = Field(alias="lineNumber")
    line: str


class BuilderGrepResult(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    query: str
    matches: list[BuilderGrepMatch] = Field(default_factory=list)


class BuilderFileContent(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    path: str
    content: str


class BuilderWriteResult(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    path: str
    bytes_written: int = Field(alias="bytesWritten")
    additions: int = 0
    deletions: int = 0


class BuilderPatchResult(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    changed_files: list[str] = Field(default_factory=list, alias="changedFiles")
    file_changes: list[dict] = Field(default_factory=list, alias="fileChanges")
    stdout: str = ""
    stderr: str = ""


class BuilderCommandResult(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    command: list[str]
    status: Literal["success", "failed", "timeout"]
    exit_code: int | None = Field(default=None, alias="exitCode")
    stdout: str = ""
    stderr: str = ""


class BuilderPreviewResult(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    status: Literal["running", "failed"]
    preview_url: str | None = Field(default=None, alias="previewUrl")
    port: int | None = None
    log: str = ""


class BuilderPreviewCheckResult(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    status: Literal["success", "failed", "skipped"]
    preview_url: str | None = Field(default=None, alias="previewUrl")
    title: str = ""
    body_text: str = Field(default="", alias="bodyText")
    console_errors: list[str] = Field(default_factory=list, alias="consoleErrors")
    screenshot_path: str | None = Field(default=None, alias="screenshotPath")
    reason: str = ""


class BuilderAgentResult(BaseModel):
    workspace: BuilderWorkspace
    snapshot: BuilderSnapshot
