import asyncio
from pathlib import Path

from app.builder.models import BuilderCommandResult, BuilderPatchResult
from app.builder.workspace_manager import WorkspaceManager
from app.core.config import settings


class BuilderCommandRunner:
    ALLOWED_SCRIPTS = {
        "build:h5",
        "build:mp-weixin",
        "type-check",
        "lint",
        "test",
    }
    ALLOWED_COMMANDS = {
        ("pnpm", "install"),
        ("pnpm", "build:h5"),
        ("pnpm", "build:mp-weixin"),
        ("pnpm", "type-check"),
        ("pnpm", "lint"),
        ("pnpm", "test"),
    }

    def __init__(self, workspace_manager: WorkspaceManager | None = None) -> None:
        self.workspace_manager = workspace_manager or WorkspaceManager()
        self.timeout_seconds = settings.builder_command_timeout_seconds

    async def run_build_h5(self, workspace_id: str, install: bool = False) -> BuilderCommandResult:
        if install:
            install_result = await self.run_command(workspace_id, ["pnpm", "install"])
            if install_result.status != "success":
                return install_result
        return await self.run_command(workspace_id, ["pnpm", "build:h5"])

    async def run_script(self, workspace_id: str, script: str, install: bool = False) -> BuilderCommandResult:
        script = (script or "").strip()
        if script not in self.ALLOWED_SCRIPTS:
            raise ValueError(f"Builder 脚本不在白名单：{script}")
        if install:
            install_result = await self.run_command(workspace_id, ["pnpm", "install"])
            if install_result.status != "success":
                return install_result
        return await self.run_command(workspace_id, ["pnpm", script])

    async def apply_patch(self, workspace_id: str, patch: str) -> BuilderPatchResult:
        workspace_path = self.workspace_manager.get_workspace_path(workspace_id)
        self._validate_patch_paths(workspace_id, patch)
        before = self._tracked_file_mtimes(workspace_path)
        process = await asyncio.create_subprocess_exec(
            "patch",
            "-p1",
            cwd=workspace_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(patch.encode("utf-8")),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            process.kill()
            stdout, stderr = await process.communicate()
        after = self._tracked_file_mtimes(workspace_path)
        changed_files = sorted(path for path, mtime in after.items() if before.get(path) != mtime)
        return BuilderPatchResult(
            workspaceId=workspace_id,
            changedFiles=changed_files,
            fileChanges=self._patch_file_changes(patch),
            stdout=self._trim(stdout.decode("utf-8", errors="replace")),
            stderr=self._trim(stderr.decode("utf-8", errors="replace")),
        )

    async def run_command(self, workspace_id: str, command: list[str]) -> BuilderCommandResult:
        self._validate_command(command)
        workspace_path = self.workspace_manager.get_workspace_path(workspace_id)
        process = await asyncio.create_subprocess_exec(
            *command,
            cwd=workspace_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        status = "success"
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            process.kill()
            stdout, stderr = await process.communicate()
            status = "timeout"
        exit_code = process.returncode
        if status != "timeout" and exit_code != 0:
            status = "failed"
        return BuilderCommandResult(
            workspaceId=workspace_id,
            command=command,
            status=status,
            exitCode=exit_code,
            stdout=self._trim(stdout.decode("utf-8", errors="replace")),
            stderr=self._trim(stderr.decode("utf-8", errors="replace")),
        )

    def _validate_command(self, command: list[str]) -> None:
        if len(command) < 2 or tuple(command[:2]) not in self.ALLOWED_COMMANDS:
            raise ValueError(f"Builder 命令不在白名单：{' '.join(command)}")

    def _validate_patch_paths(self, workspace_id: str, patch: str) -> None:
        paths: list[str] = []
        for line in patch.splitlines():
            if line.startswith(("--- ", "+++ ")):
                value = line[4:].split("\t", 1)[0].strip()
                if value == "/dev/null":
                    continue
                if value.startswith(("a/", "b/")):
                    value = value[2:]
                paths.append(value)
        if not paths:
            raise ValueError("patch 中没有可识别的文件路径")
        for path in paths:
            candidate = Path(path)
            if candidate.is_absolute() or ".." in candidate.parts:
                raise ValueError(f"patch 文件路径越界：{path}")
            self.workspace_manager.resolve_file_path(workspace_id, path)

    def _tracked_file_mtimes(self, workspace_path: Path) -> dict[str, int]:
        result: dict[str, int] = {}
        skip = {"node_modules", "dist", "unpackage", ".git"}
        for path in workspace_path.rglob("*"):
            relative_parts = path.relative_to(workspace_path).parts
            if path.is_file() and not any(part in skip for part in relative_parts):
                result[path.relative_to(workspace_path).as_posix()] = path.stat().st_mtime_ns
        return result

    def _patch_file_changes(self, patch: str) -> list[dict]:
        changes: list[dict] = []
        current: dict | None = None
        for line in patch.splitlines():
            if line.startswith("+++ "):
                path = line[4:].split("\t", 1)[0].strip()
                if path == "/dev/null":
                    continue
                if path.startswith("b/"):
                    path = path[2:]
                current = {"path": path, "additions": 0, "deletions": 0}
                changes.append(current)
                continue
            if current is None:
                continue
            if line.startswith("+") and not line.startswith("+++ "):
                current["additions"] += 1
            elif line.startswith("-") and not line.startswith("--- "):
                current["deletions"] += 1
        return changes

    def _trim(self, value: str, max_chars: int = 20_000) -> str:
        if len(value) <= max_chars:
            return value
        return f"{value[:max_chars]}\n...[truncated {len(value) - max_chars} chars]"
