import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.builder.models import BuilderWorkspace, BuilderWorkspaceEntry
from app.core.config import settings


class WorkspaceManager:
    def __init__(
        self,
        workspace_root: str | Path | None = None,
        template_path: str | Path | None = None,
    ) -> None:
        base_dir = Path(__file__).resolve().parents[3]
        self.workspace_root = self._resolve_path(workspace_root or settings.builder_workspace_root, base_dir)
        self.template_path = self._resolve_path(template_path or settings.builder_template_path, base_dir)
        self.project_root_workspace_id = settings.builder_project_root_workspace_id
        self.project_root_path = self._resolve_path(settings.builder_project_root_path, base_dir)

    def create_workspace(self, conversation_id: str | None = None) -> BuilderWorkspace:
        if not self.template_path.is_dir():
            raise ValueError(f"Builder 模板目录不存在：{self.template_path}")
        self.workspace_root.mkdir(parents=True, exist_ok=True)
        workspace_id = self._new_workspace_id(conversation_id)
        workspace_path = self.workspace_root / workspace_id
        if workspace_path.exists():
            raise ValueError(f"Builder 工作区已存在：{workspace_id}")
        shutil.copytree(
            self.template_path,
            workspace_path,
            ignore=shutil.ignore_patterns("node_modules", "dist", "unpackage", ".git"),
        )
        return BuilderWorkspace(
            id=workspace_id,
            conversationId=conversation_id,
            path=str(workspace_path),
            templatePath=str(self.template_path),
        )

    def get_workspace_path(self, workspace_id: str) -> Path:
        if workspace_id == self.project_root_workspace_id:
            if not self.project_root_path.is_dir():
                raise ValueError(f"项目根目录不存在：{self.project_root_path}")
            return self.project_root_path
        if not self._is_safe_workspace_id(workspace_id):
            raise ValueError("非法 workspaceId")
        workspace_path = (self.workspace_root / workspace_id).resolve()
        root = self.workspace_root.resolve()
        if not self._is_relative_to(workspace_path, root) or not workspace_path.is_dir():
            raise ValueError(f"Builder 工作区不存在：{workspace_id}")
        return workspace_path

    def list_workspaces(self, limit: int = 50) -> list[BuilderWorkspaceEntry]:
        self.workspace_root.mkdir(parents=True, exist_ok=True)
        entries: list[BuilderWorkspaceEntry] = [self._project_root_entry()]
        for path in self.workspace_root.iterdir():
            if not path.is_dir() or not self._is_safe_workspace_id(path.name):
                continue
            entries.append(self._workspace_entry(path))
        entries.sort(key=lambda item: item.updated_at or "", reverse=True)
        return entries[: max(1, min(limit, 200))]

    def find_workspaces(self, query: str, limit: int = 20) -> list[BuilderWorkspaceEntry]:
        terms = self._terms(query)
        if not terms:
            return self.list_workspaces(limit)
        scored: list[tuple[int, BuilderWorkspaceEntry]] = []
        for entry in self.list_workspaces(200):
            haystack = f"{entry.id} {entry.conversation_id or ''} {entry.path}".lower()
            score = sum(len(term) for term in terms if term in haystack)
            if score > 0:
                scored.append((score, entry))
        scored.sort(key=lambda item: (item[0], item[1].updated_at or ""), reverse=True)
        return [entry for _, entry in scored[: max(1, min(limit, 100))]]

    def resolve_file_path(self, workspace_id: str, relative_path: str) -> Path:
        workspace_path = self.get_workspace_path(workspace_id)
        target = (workspace_path / relative_path).resolve()
        if not self._is_relative_to(target, workspace_path):
            raise ValueError("文件路径越界")
        if self._is_blocked_relative_path(target.relative_to(workspace_path)):
            raise ValueError(f"路径不允许访问：{relative_path}")
        return target

    def workspace_root_for(self, workspace_id: str) -> Path:
        return self.get_workspace_path(workspace_id)

    def _workspace_entry(self, path: Path) -> BuilderWorkspaceEntry:
        stat = path.stat()
        return BuilderWorkspaceEntry(
            id=path.name,
            conversationId=self._conversation_id_from_workspace_id(path.name),
            path=str(path.resolve()),
            createdAt=self._format_timestamp(stat.st_ctime),
            updatedAt=self._format_timestamp(stat.st_mtime),
        )

    def _project_root_entry(self) -> BuilderWorkspaceEntry:
        stat = self.project_root_path.stat()
        return BuilderWorkspaceEntry(
            id=self.project_root_workspace_id,
            conversationId=None,
            path=str(self.project_root_path.resolve()),
            createdAt=self._format_timestamp(stat.st_ctime),
            updatedAt=self._format_timestamp(stat.st_mtime),
        )

    def _new_workspace_id(self, conversation_id: str | None) -> str:
        prefix = self._slug(conversation_id or "builder")
        return f"{prefix}-{uuid.uuid4().hex[:8]}"

    def _slug(self, value: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")
        return (slug or "builder")[:64]

    def _conversation_id_from_workspace_id(self, workspace_id: str) -> str | None:
        match = re.match(r"(.+)-[a-f0-9]{8}$", workspace_id)
        return match.group(1) if match else None

    def _terms(self, value: str) -> list[str]:
        normalized = re.sub(r"[^a-zA-Z0-9_\-\u4e00-\u9fff]+", " ", value or "").strip().lower()
        return [term for term in normalized.split() if len(term) >= 2]

    def _format_timestamp(self, timestamp: float) -> str:
        return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()

    def _is_safe_workspace_id(self, workspace_id: str) -> bool:
        return bool(re.fullmatch(r"[a-zA-Z0-9_-]+", workspace_id))

    def _resolve_path(self, path: str | Path, base_dir: Path) -> Path:
        candidate = Path(path)
        if not candidate.is_absolute():
            candidate = base_dir / candidate
        return candidate.resolve()

    def _is_relative_to(self, path: Path, root: Path) -> bool:
        try:
            path.relative_to(root)
            return True
        except ValueError:
            return False

    def _is_blocked_relative_path(self, relative_path: Path) -> bool:
        blocked_parts = {
            ".git",
            ".idea",
            ".vscode",
            ".venv",
            "node_modules",
            "target",
            "dist",
            "unpackage",
            ".output",
            ".vite",
        }
        blocked_files = {
            ".env",
            ".env.local",
            ".env.development",
            ".env.production",
            "application-dev.yml",
            "application-prod.yml",
        }
        return any(part in blocked_parts for part in relative_path.parts) or relative_path.name in blocked_files
