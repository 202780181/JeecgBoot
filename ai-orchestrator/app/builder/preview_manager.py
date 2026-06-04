import asyncio
import socket

from app.builder.models import BuilderPreviewResult
from app.builder.workspace_manager import WorkspaceManager
from app.core.config import settings


class BuilderPreviewManager:
    _processes: dict[str, asyncio.subprocess.Process] = {}
    _ports: dict[str, int] = {}

    def __init__(self, workspace_manager: WorkspaceManager | None = None) -> None:
        self.workspace_manager = workspace_manager or WorkspaceManager()

    async def start_h5(self, workspace_id: str) -> BuilderPreviewResult:
        workspace_path = self.workspace_manager.get_workspace_path(workspace_id)
        if workspace_id in self._processes and self._processes[workspace_id].returncode is None:
            port = self._ports[workspace_id]
            return BuilderPreviewResult(
                workspaceId=workspace_id,
                status="running",
                previewUrl=self._preview_url(port),
                port=port,
                log="preview already running",
            )

        port = self._find_port()
        process = await asyncio.create_subprocess_exec(
            "pnpm",
            "dev:h5",
            "--port",
            str(port),
            cwd=workspace_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        self._processes[workspace_id] = process
        self._ports[workspace_id] = port
        await asyncio.sleep(2)
        if process.returncode is not None:
            output = ""
            if process.stdout:
                output = (await process.stdout.read()).decode("utf-8", errors="replace")
            return BuilderPreviewResult(
                workspaceId=workspace_id,
                status="failed",
                port=port,
                log=output[-20_000:],
            )
        return BuilderPreviewResult(
            workspaceId=workspace_id,
            status="running",
            previewUrl=self._preview_url(port),
            port=port,
            log="preview started",
        )

    def _find_port(self) -> int:
        for port in range(settings.builder_preview_port_start, settings.builder_preview_port_end + 1):
            if port not in self._ports.values() and self._port_available(port):
                return port
        raise ValueError("没有可用的 Builder 预览端口")

    def _port_available(self, port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            return sock.connect_ex((settings.builder_preview_host, port)) != 0

    def _preview_url(self, port: int) -> str:
        return f"http://{settings.builder_preview_host}:{port}"
