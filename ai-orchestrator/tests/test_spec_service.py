from pathlib import Path

from app.services.spec_service import SpecKitService


def test_generates_spec_plan_tasks_in_spec_workspace(tmp_path: Path):
    service = SpecKitService(workspace=tmp_path / "spec-workspace")

    result = service.generate("创建一个设备报修表单，支持新增、编辑、列表和状态处理")

    assert result.source == "spec-kit"
    assert result.spec_path
    assert result.plan_path
    assert result.tasks_path
    assert Path(result.spec_path).exists()
    assert Path(result.plan_path).exists()
    assert Path(result.tasks_path).exists()
    assert "jeecg-onlform" in result.spec
    assert "JeecgBoot official-first" in result.spec
    assert result.tasks
