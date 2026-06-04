from pathlib import Path
from uuid import uuid4

from app.builder.models import BuilderPreviewCheckResult
from app.builder.preview_manager import BuilderPreviewManager
from app.builder.workspace_manager import WorkspaceManager


class BuilderPreviewChecker:
    def __init__(
        self,
        workspace_manager: WorkspaceManager | None = None,
        preview_manager: BuilderPreviewManager | None = None,
    ) -> None:
        self.workspace_manager = workspace_manager or WorkspaceManager()
        self.preview_manager = preview_manager or BuilderPreviewManager(self.workspace_manager)

    async def check_h5(self, workspace_id: str) -> BuilderPreviewCheckResult:
        preview = await self.preview_manager.start_h5(workspace_id)
        if preview.status != "running" or not preview.preview_url:
            return BuilderPreviewCheckResult(
                workspaceId=workspace_id,
                status="failed",
                previewUrl=preview.preview_url,
                reason=preview.log or "H5 预览服务启动失败",
            )

        try:
            from playwright.async_api import async_playwright
        except ModuleNotFoundError:
            return BuilderPreviewCheckResult(
                workspaceId=workspace_id,
                status="skipped",
                previewUrl=preview.preview_url,
                reason="Python 环境未安装 playwright，已跳过预览截图检查",
            )

        workspace_path = self.workspace_manager.get_workspace_path(workspace_id)
        screenshot_dir = workspace_path / ".builder" / "screenshots"
        screenshot_dir.mkdir(parents=True, exist_ok=True)
        screenshot_path = screenshot_dir / f"h5-{uuid4().hex[:8]}.png"
        console_errors: list[str] = []

        try:
            async with async_playwright() as playwright:
                browser = await playwright.chromium.launch()
                page = await browser.new_page(viewport={"width": 390, "height": 844})
                page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
                await page.goto(preview.preview_url, wait_until="domcontentloaded", timeout=30_000)
                await page.wait_for_timeout(1000)
                title = await page.title()
                body_text = (await page.locator("body").inner_text(timeout=10_000)).strip()
                await page.screenshot(path=str(screenshot_path), full_page=True)
                await browser.close()
        except Exception as exc:
            if self._is_browser_install_error(exc):
                return BuilderPreviewCheckResult(
                    workspaceId=workspace_id,
                    status="skipped",
                    previewUrl=preview.preview_url,
                    reason="Playwright 浏览器未安装，已跳过预览截图检查。可执行 `uv run playwright install chromium` 启用。",
                )
            return BuilderPreviewCheckResult(
                workspaceId=workspace_id,
                status="failed",
                previewUrl=preview.preview_url,
                screenshotPath=str(screenshot_path) if screenshot_path.exists() else None,
                reason=f"预览页面检查失败：{exc}",
            )

        if not body_text:
            return BuilderPreviewCheckResult(
                workspaceId=workspace_id,
                status="failed",
                previewUrl=preview.preview_url,
                title=title,
                bodyText=body_text,
                consoleErrors=console_errors[:20],
                screenshotPath=str(screenshot_path),
                reason="预览页面正文为空，可能没有正确渲染",
            )

        blocking_errors = [error for error in console_errors if self._is_blocking_console_error(error)]
        if blocking_errors:
            return BuilderPreviewCheckResult(
                workspaceId=workspace_id,
                status="failed",
                previewUrl=preview.preview_url,
                title=title,
                bodyText=body_text[:1000],
                consoleErrors=blocking_errors[:20],
                screenshotPath=str(screenshot_path),
                reason="预览页面存在阻塞级控制台错误",
            )

        return BuilderPreviewCheckResult(
            workspaceId=workspace_id,
            status="success",
            previewUrl=preview.preview_url,
            title=title,
            bodyText=body_text[:1000],
            consoleErrors=console_errors[:20],
            screenshotPath=str(screenshot_path),
        )

    def _is_blocking_console_error(self, error: str) -> bool:
        text = error.lower()
        ignored = ("favicon", "manifest", "sourcemap", "source map")
        return bool(text.strip()) and not any(item in text for item in ignored)

    def _is_browser_install_error(self, exc: Exception) -> bool:
        text = str(exc).lower()
        return "executable doesn't exist" in text or "playwright install" in text
