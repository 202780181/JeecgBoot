from app.models.schemas import ExecutorName
from app.services.capability_router import select_executor


def test_routes_standard_form_to_onlform():
    selected = select_executor("创建一个设备报修表单，支持新增、编辑、列表")

    assert selected.executor == ExecutorName.JEECG_ONLFORM


def test_routes_workflow_to_bpmn():
    selected = select_executor("创建请假审批流程，包含经理审批和驳回")

    assert selected.executor == ExecutorName.JEECG_BPMN


def test_routes_mobile_interaction_to_uniapp_codegen():
    selected = select_executor("创建一个扫码后定位并实时展示状态的自定义页面")

    assert selected.executor == ExecutorName.UNIAPP_CODEGEN
