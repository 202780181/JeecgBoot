from pathlib import Path

from app.builder.models import (
    BuilderFileContent,
    BuilderFileEntry,
    BuilderFileSearchResult,
    BuilderGrepMatch,
    BuilderGrepResult,
    BuilderPageEntry,
    BuilderPageList,
    BuilderSnapshot,
    BuilderWriteResult,
)
from app.builder.workspace_manager import WorkspaceManager


class BuilderFileService:
    SKIP_DIRS = {
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
    TEXT_SUFFIXES = {
        ".java",
        ".vue",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".json",
        ".xml",
        ".sql",
        ".properties",
        ".scss",
        ".less",
        ".css",
        ".html",
        ".md",
        ".txt",
        ".yml",
        ".yaml",
    }
    IMPORTANT_FILES = (
        "pom.xml",
        "jeecg-boot/pom.xml",
        "jeecg-boot/jeecg-boot-module/jeecg-boot-module-airag/pom.xml",
        "jeecgboot-vue3/package.json",
        "package.json",
        "pages.config.ts",
        "src/pages.json",
        "src/pages/index/index.vue",
        "src/pages/user/people.vue",
        "src/router/index.ts",
        "src/service/api.ts",
        "src/interceptors/request.ts",
    )

    def __init__(self, workspace_manager: WorkspaceManager | None = None) -> None:
        self.workspace_manager = workspace_manager or WorkspaceManager()

    def snapshot(self, workspace_id: str, max_files: int = 400) -> BuilderSnapshot:
        workspace_path = self.workspace_manager.get_workspace_path(workspace_id)
        entries: list[BuilderFileEntry] = []
        for path in sorted(workspace_path.rglob("*")):
            if any(part in self.SKIP_DIRS for part in path.relative_to(workspace_path).parts):
                continue
            relative = path.relative_to(workspace_path).as_posix()
            entries.append(
                BuilderFileEntry(
                    path=relative,
                    type="directory" if path.is_dir() else "file",
                    size=None if path.is_dir() else path.stat().st_size,
                )
            )
            if len(entries) >= max_files:
                break

        important_files = [
            path for path in self.IMPORTANT_FILES if (workspace_path / path).is_file()
        ]
        return BuilderSnapshot(
            workspaceId=workspace_id,
            root=str(workspace_path),
            files=entries,
            importantFiles=important_files,
        )

    def list_pages(self, workspace_id: str, max_pages: int = 200) -> BuilderPageList:
        workspace_path = self.workspace_manager.get_workspace_path(workspace_id)
        pages: list[BuilderPageEntry] = []
        seen: set[str] = set()
        for config_path in ("src/pages.json", "pages.config.ts"):
            target = workspace_path / config_path
            if target.is_file():
                pages.append(
                    BuilderPageEntry(
                        path=config_path,
                        name=target.name,
                        route=None,
                        source="config",
                    )
                )
                seen.add(config_path)
        for path in self._iter_project_files(workspace_path):
            relative = path.relative_to(workspace_path).as_posix()
            if relative in seen:
                continue
            if path.suffix.lower() != ".vue":
                continue
            if not self._looks_like_page(relative):
                continue
            pages.append(
                BuilderPageEntry(
                    path=relative,
                    name=path.stem,
                    route=self._route_from_page_path(relative),
                    source="file",
                )
            )
            if len(pages) >= max_pages:
                break
        return BuilderPageList(workspaceId=workspace_id, pages=pages)

    def search_files(self, workspace_id: str, query: str, max_results: int = 50) -> BuilderFileSearchResult:
        terms = self._terms(query)
        if not terms:
            raise ValueError("搜索关键词不能为空")
        workspace_path = self.workspace_manager.get_workspace_path(workspace_id)
        scored: list[tuple[int, Path]] = []
        for path in self._iter_project_files(workspace_path):
            relative = path.relative_to(workspace_path).as_posix()
            haystack = relative.lower()
            score = sum(len(term) for term in terms if term in haystack)
            if score > 0:
                scored.append((score, path))
        scored.sort(key=lambda item: (item[0], item[1].as_posix()), reverse=True)
        matches = [
            BuilderFileEntry(
                path=path.relative_to(workspace_path).as_posix(),
                type="file",
                size=path.stat().st_size,
            )
            for _, path in scored[: max(1, min(max_results, 200))]
        ]
        return BuilderFileSearchResult(workspaceId=workspace_id, matches=matches)

    def grep_files(self, workspace_id: str, query: str, max_results: int = 80) -> BuilderGrepResult:
        if not query or not query.strip():
            raise ValueError("检索内容不能为空")
        needle = query.strip().lower()
        workspace_path = self.workspace_manager.get_workspace_path(workspace_id)
        matches: list[BuilderGrepMatch] = []
        for path in self._iter_project_files(workspace_path):
            if not self._is_text_file(path):
                continue
            relative = path.relative_to(workspace_path).as_posix()
            try:
                lines = path.read_text("utf-8", errors="ignore").splitlines()
            except OSError:
                continue
            for line_number, line in enumerate(lines, start=1):
                if needle not in line.lower():
                    continue
                matches.append(
                    BuilderGrepMatch(
                        path=relative,
                        lineNumber=line_number,
                        line=line.strip()[:500],
                    )
                )
                if len(matches) >= max_results:
                    return BuilderGrepResult(workspaceId=workspace_id, query=query, matches=matches)
        return BuilderGrepResult(workspaceId=workspace_id, query=query, matches=matches)

    def read_file(self, workspace_id: str, path: str, max_bytes: int = 200_000) -> BuilderFileContent:
        target = self.workspace_manager.resolve_file_path(workspace_id, path)
        if not target.is_file():
            raise ValueError(f"文件不存在：{path}")
        self._ensure_readable_text_file(target)
        data = target.read_bytes()
        if len(data) > max_bytes:
            raise ValueError(f"文件过大，拒绝读取：{path}")
        return BuilderFileContent(
            workspaceId=workspace_id,
            path=path,
            content=data.decode("utf-8"),
        )

    def write_file(self, workspace_id: str, path: str, content: str) -> BuilderWriteResult:
        target = self.workspace_manager.resolve_file_path(workspace_id, path)
        self._ensure_text_file(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        old_content = target.read_text("utf-8", errors="ignore") if target.is_file() else ""
        data = content.encode("utf-8")
        target.write_bytes(data)
        additions, deletions = self._line_delta(old_content, content)
        return BuilderWriteResult(
            workspaceId=workspace_id,
            path=path,
            bytesWritten=len(data),
            additions=additions,
            deletions=deletions,
        )

    def _iter_project_files(self, workspace_path: Path):
        for path in sorted(workspace_path.rglob("*")):
            relative_parts = path.relative_to(workspace_path).parts
            if any(part in self.SKIP_DIRS for part in relative_parts):
                continue
            if path.is_file():
                yield path

    def _looks_like_page(self, relative_path: str) -> bool:
        return (
            relative_path.startswith("src/pages/")
            or relative_path.startswith("pages/")
            or "/pages/" in relative_path
        )

    def _route_from_page_path(self, relative_path: str) -> str | None:
        if not relative_path.endswith(".vue"):
            return None
        route = relative_path[:-4]
        if route.startswith("src/"):
            route = route[4:]
        return "/" + route

    def _terms(self, value: str) -> list[str]:
        normalized = "".join(char.lower() if char.isalnum() or char in {"_", "-"} else " " for char in value or "")
        return [term for term in normalized.split() if len(term) >= 2]

    def _is_text_file(self, path: Path) -> bool:
        return path.suffix.lower() in self.TEXT_SUFFIXES

    def _line_delta(self, old_content: str, new_content: str) -> tuple[int, int]:
        old_lines = old_content.splitlines()
        new_lines = new_content.splitlines()
        common_prefix = 0
        for old_line, new_line in zip(old_lines, new_lines):
            if old_line != new_line:
                break
            common_prefix += 1
        old_tail = old_lines[common_prefix:]
        new_tail = new_lines[common_prefix:]
        common_suffix = 0
        for old_line, new_line in zip(reversed(old_tail), reversed(new_tail)):
            if old_line != new_line:
                break
            common_suffix += 1
        if common_suffix:
            old_tail = old_tail[:-common_suffix]
            new_tail = new_tail[:-common_suffix]
        return len(new_tail), len(old_tail)

    def _ensure_text_file(self, path: Path) -> None:
        blocked_suffixes = {
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".webp",
            ".ico",
            ".zip",
            ".jar",
            ".class",
            ".pdf",
        }
        if path.suffix.lower() in blocked_suffixes:
            raise ValueError(f"当前接口只允许写文本文件：{path.name}")

    def _ensure_readable_text_file(self, path: Path) -> None:
        if not self._is_text_file(path):
            self._ensure_text_file(path)
