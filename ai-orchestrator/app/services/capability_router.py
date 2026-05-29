from typing import Tuple

from app.models.schemas import CapabilityMatch, ExecutorName


OFFICIAL_DOCS = {
    ExecutorName.JEECG_ONLFORM: "https://help.jeecg.com/java/ai/skills/skill-onlform",
    ExecutorName.JEECG_ONLREPORT: "https://help.jeecg.com/java/ai/skills/skill-onlreport",
    ExecutorName.JEECG_BPMN: "https://help.jeecg.com/java/ai/skills/skill-bpmn",
    ExecutorName.JEECG_CODEGEN: "https://help.jeecg.com/java/ai/skills/skill-codegen",
}


KEYWORDS = {
    ExecutorName.JEECG_ONLFORM: [
        "crud",
        "表单",
        "登记",
        "申请",
        "巡检",
        "报修",
        "客户资料",
        "新增",
        "编辑",
        "删除",
        "列表",
    ],
    ExecutorName.JEECG_ONLREPORT: ["报表", "统计", "仪表盘", "大屏", "查询", "sql"],
    ExecutorName.JEECG_BPMN: ["审批", "流程", "流转", "节点", "驳回", "会签"],
    ExecutorName.JEECG_CODEGEN: ["后端", "java", "接口", "多表", "主子表", "一对多", "代码生成"],
    ExecutorName.JEECG_ADMIN_API: ["菜单", "权限", "角色", "用户", "部门", "公告", "消息"],
    ExecutorName.UNIAPP_CODEGEN: ["地图", "扫码", "蓝牙", "定位", "实时", "聊天", "多步骤", "自定义页面"],
}


REASONS = {
    ExecutorName.JEECG_ONLFORM: "标准数据采集或 CRUD 需求，优先使用 JeecgBoot Online 表单。",
    ExecutorName.JEECG_ONLREPORT: "报表、统计或 SQL 查询展示需求，优先使用 JeecgBoot Online 报表。",
    ExecutorName.JEECG_BPMN: "审批和流转需求，优先使用 JeecgBoot BPMN 流程能力。",
    ExecutorName.JEECG_CODEGEN: "复杂业务模块或后端接口需求，优先使用 JeecgBoot Codegen。",
    ExecutorName.JEECG_ADMIN_API: "系统管理数据变更，优先调用 JeecgBoot Admin API。",
    ExecutorName.UNIAPP_CODEGEN: "包含移动端特定复杂交互，官方低代码能力不足时才生成 UniApp 页面。",
}


def analyze_requirement(requirement: str) -> list[CapabilityMatch]:
    text = requirement.lower()
    matches: list[CapabilityMatch] = []

    for executor, words in KEYWORDS.items():
        score = sum(1 for word in words if word.lower() in text)
        if score == 0:
            continue
        confidence = min(0.95, 0.45 + score * 0.15)
        matches.append(
            CapabilityMatch(
                executor=executor,
                confidence=confidence,
                reason=REASONS[executor],
                official_first=executor != ExecutorName.UNIAPP_CODEGEN,
                fallback_uniapp_page=executor == ExecutorName.UNIAPP_CODEGEN,
                official_doc=OFFICIAL_DOCS.get(executor),
            )
        )

    if not matches:
        matches.append(
            CapabilityMatch(
                executor=ExecutorName.MANUAL_REVIEW,
                confidence=0.3,
                reason="需求无法通过关键词可靠识别，需要人工确认官方能力或自定义开发范围。",
                official_first=True,
            )
        )

    return sorted(matches, key=_priority_sort_key)


def select_executor(requirement: str) -> CapabilityMatch:
    return analyze_requirement(requirement)[0]


def _priority_sort_key(match: CapabilityMatch) -> Tuple[int, float]:
    priority = {
        ExecutorName.JEECG_ONLFORM: 1,
        ExecutorName.JEECG_ONLREPORT: 2,
        ExecutorName.JEECG_BPMN: 3,
        ExecutorName.JEECG_CODEGEN: 4,
        ExecutorName.JEECG_ADMIN_API: 5,
        ExecutorName.UNIAPP_CODEGEN: 6,
        ExecutorName.MANUAL_REVIEW: 7,
    }
    return (priority[match.executor], -match.confidence)
