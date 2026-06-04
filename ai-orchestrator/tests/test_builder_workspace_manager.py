import pytest

from app.builder.file_service import BuilderFileService
from app.builder.workspace_manager import WorkspaceManager


def test_project_root_workspace_can_read_and_write_repo_files(tmp_path, monkeypatch):
    monkeypatch.setattr("app.builder.workspace_manager.settings.builder_project_root_workspace_id", "jeecgboot-root")
    monkeypatch.setattr("app.builder.workspace_manager.settings.builder_project_root_path", str(tmp_path))
    manager = WorkspaceManager(workspace_root=tmp_path / "ai-builder-workspaces", template_path=tmp_path)
    service = BuilderFileService(manager)
    target = tmp_path / "jeecg-boot" / "src" / "DemoController.java"
    target.parent.mkdir(parents=True)
    target.write_text("class DemoController {}", encoding="utf-8")

    content = service.read_file("jeecgboot-root", "jeecg-boot/src/DemoController.java")
    assert content.content == "class DemoController {}"

    result = service.write_file("jeecgboot-root", "jeecg-boot/src/DemoController.java", "class DemoControllerV2 {}")
    assert result.path == "jeecg-boot/src/DemoController.java"
    assert target.read_text("utf-8") == "class DemoControllerV2 {}"


def test_project_root_workspace_rejects_out_of_root_path(tmp_path, monkeypatch):
    monkeypatch.setattr("app.builder.workspace_manager.settings.builder_project_root_workspace_id", "jeecgboot-root")
    monkeypatch.setattr("app.builder.workspace_manager.settings.builder_project_root_path", str(tmp_path))
    manager = WorkspaceManager(workspace_root=tmp_path / "ai-builder-workspaces", template_path=tmp_path)

    with pytest.raises(ValueError, match="文件路径越界"):
        manager.resolve_file_path("jeecgboot-root", "../outside.java")


def test_project_root_workspace_rejects_blocked_paths(tmp_path, monkeypatch):
    monkeypatch.setattr("app.builder.workspace_manager.settings.builder_project_root_workspace_id", "jeecgboot-root")
    monkeypatch.setattr("app.builder.workspace_manager.settings.builder_project_root_path", str(tmp_path))
    manager = WorkspaceManager(workspace_root=tmp_path / "ai-builder-workspaces", template_path=tmp_path)

    with pytest.raises(ValueError, match="路径不允许访问"):
        manager.resolve_file_path("jeecgboot-root", ".git/config")

    with pytest.raises(ValueError, match="路径不允许访问"):
        manager.resolve_file_path("jeecgboot-root", "jeecg-boot/target/app.jar")
