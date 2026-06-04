from dataclasses import dataclass, field
from enum import StrEnum
import re

from app.models.schemas import AppChatStreamRequest


class PreflightIntent(StrEnum):
    QUESTION = "question"
    READ_FILES = "read_files"
    CODE_CHANGE = "code_change"
    CREATE_APP = "create_app"
    API_CHANGE = "api_change"
    RUN_COMMAND = "run_command"
    DELETE_DATA = "delete_data"
    DATABASE_CHANGE = "database_change"
    UNKNOWN = "unknown"


class PreflightRisk(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    BLOCKED = "blocked"


@dataclass
class AgentIntentClassification:
    intent: PreflightIntent = PreflightIntent.UNKNOWN
    confidence: float = 0.0
    needs_clarification: bool = False
    clarification_question: str = ""
    summary: str = ""
    operation_note: str = ""
    proposed_steps: list[str] = field(default_factory=list)
    verification_steps: list[str] = field(default_factory=list)


@dataclass
class AgentPreflightResult:
    intent: PreflightIntent
    risk_level: PreflightRisk
    summary: str
    operation_note: str
    safety_notes: list[str] = field(default_factory=list)
    proposed_steps: list[str] = field(default_factory=list)
    verification_steps: list[str] = field(default_factory=list)
    allowed_tools: list[str] | None = None
    needs_clarification: bool = False
    clarification_question: str = ""
    requires_confirmation: bool = False
    blocked: bool = False
    block_reason: str = ""

    def to_event_data(self) -> dict:
        return {
            "intent": self.intent,
            "riskLevel": self.risk_level,
            "summary": self.summary,
            "operationNote": self.operation_note,
            "safetyNotes": self.safety_notes,
            "proposedSteps": self.proposed_steps,
            "verificationSteps": self.verification_steps,
            "allowedTools": self.allowed_tools,
            "needsClarification": self.needs_clarification,
            "clarificationQuestion": self.clarification_question,
            "requiresConfirmation": self.requires_confirmation,
            "blocked": self.blocked,
            "blockReason": self.block_reason,
        }


class AgentPreflight:
    BUILDER_READ_TOOLS = [
        "builder_list_workspaces",
        "builder_find_workspace",
        "builder_get_snapshot",
        "builder_list_pages",
        "builder_search_files",
        "builder_grep_files",
        "builder_read_file",
    ]
    BUILDER_WRITE_TOOLS = [
        "builder_write_file",
        "builder_apply_patch",
    ]
    BUILDER_VERIFY_TOOLS = [
        "builder_run_script",
        "builder_build_h5",
        "builder_start_preview_h5",
        "builder_check_preview_h5",
    ]

    def analyze(
        self,
        request: AppChatStreamRequest,
        available_tool_names: list[str] | None = None,
        classification: AgentIntentClassification | None = None,
    ) -> AgentPreflightResult:
        text = (request.input or "").strip()
        blocked_reason = self._blocked_reason(text)
        intent = self._resolve_intent(request, classification)
        intent = self._apply_hard_safety_intent(text, intent)
        risk = self._risk(text, intent)
        needs_clarification, question = self._clarification(intent, classification)
        allowed_tools = self._allowed_tools(intent, risk, available_tool_names)
        summary = classification.summary if classification and classification.summary else self._summary(intent)
        safety_notes = self._safety_notes(intent, risk)
        proposed_steps = self._proposed_steps(intent, risk, classification)
        verification_steps = self._verification_steps(intent, classification)

        if blocked_reason:
            return AgentPreflightResult(
                intent=intent,
                risk_level=PreflightRisk.BLOCKED,
                summary=summary,
                operation_note=f"这个请求涉及受保护内容：{blocked_reason}。我不会直接读取或修改这些内容。",
                safety_notes=[blocked_reason, "需要改用受控路径或提供非敏感配置样例。"],
                proposed_steps=["先确认安全边界", "只处理仓库内允许访问的文本代码文件"],
                verification_steps=[],
                allowed_tools=[],
                blocked=True,
                block_reason=blocked_reason,
            )

        requires_confirmation = risk == PreflightRisk.HIGH
        return AgentPreflightResult(
            intent=intent,
            risk_level=risk,
            summary=summary,
            operation_note=self._operation_note(intent, risk, needs_clarification, classification),
            safety_notes=safety_notes,
            proposed_steps=proposed_steps,
            verification_steps=verification_steps,
            allowed_tools=allowed_tools,
            needs_clarification=needs_clarification,
            clarification_question=question,
            requires_confirmation=requires_confirmation,
        )

    def _resolve_intent(
        self,
        request: AppChatStreamRequest,
        classification: AgentIntentClassification | None,
    ) -> PreflightIntent:
        if classification and classification.intent in set(PreflightIntent):
            return classification.intent
        return self._fallback_intent(request)

    def _fallback_intent(self, request: AppChatStreamRequest) -> PreflightIntent:
        text = (request.input or "").strip()
        if self._has_active_code_task(request) and self._looks_like_follow_up(text):
            return PreflightIntent.CODE_CHANGE
        if request.skill_ids and self._has_builder_write_tools(request):
            return PreflightIntent.CODE_CHANGE
        if self._has_builder_workspace_context(request):
            return PreflightIntent.CODE_CHANGE
        if text.endswith("?") or text.endswith("？"):
            return PreflightIntent.QUESTION
        return PreflightIntent.UNKNOWN

    def _apply_hard_safety_intent(self, text: str, intent: PreflightIntent) -> PreflightIntent:
        normalized = text.lower()
        if re.search(r"\b(drop|truncate)\b|\bdelete\s+from\b", normalized):
            return PreflightIntent.DELETE_DATA
        if "sql" in normalized and any(term in text for term in ("删除", "清空", "删数据", "删表")):
            return PreflightIntent.DELETE_DATA
        if any(term in normalized for term in ("migration", "flyway", "ddl")):
            return PreflightIntent.DATABASE_CHANGE
        return intent

    def _risk(self, text: str, intent: PreflightIntent) -> PreflightRisk:
        if intent in {PreflightIntent.DELETE_DATA, PreflightIntent.DATABASE_CHANGE}:
            return PreflightRisk.HIGH
        if self._is_high_risk_text(text):
            return PreflightRisk.HIGH
        if intent in {PreflightIntent.CODE_CHANGE, PreflightIntent.CREATE_APP, PreflightIntent.API_CHANGE, PreflightIntent.RUN_COMMAND}:
            return PreflightRisk.MEDIUM
        return PreflightRisk.LOW

    def _blocked_reason(self, text: str) -> str:
        normalized = text.lower()
        if any(value in normalized for value in (".env", "secret", "password", "api key", "apikey", "~/.ssh", "id_rsa")):
            return "请求包含密钥或敏感配置访问意图"
        if any(value in normalized for value in ("../", "..\\", "/etc/", "/root/")):
            return "请求包含越界路径或系统敏感路径"
        return ""

    def _clarification(
        self,
        intent: PreflightIntent,
        classification: AgentIntentClassification | None,
    ) -> tuple[bool, str]:
        if classification and classification.needs_clarification:
            return True, classification.clarification_question or "请补充关键需求后我再继续。"
        if intent == PreflightIntent.DELETE_DATA:
            return True, "这个请求涉及删除或清空操作，请明确目标范围，并确认是否只生成方案而不直接执行。"
        return False, ""

    def _allowed_tools(self, intent: PreflightIntent, risk: PreflightRisk, available_tool_names: list[str] | None) -> list[str] | None:
        if available_tool_names is None:
            return None
        allowed = set(available_tool_names)
        if risk == PreflightRisk.BLOCKED:
            return []
        if risk == PreflightRisk.HIGH:
            read_only = set(self.BUILDER_READ_TOOLS + ["web_search", "weather"])
            return [name for name in available_tool_names if name in read_only]
        if intent in {PreflightIntent.QUESTION, PreflightIntent.READ_FILES, PreflightIntent.UNKNOWN}:
            read_tools = set(self.BUILDER_READ_TOOLS + ["web_search", "weather"])
            return [name for name in available_tool_names if name in read_tools]
        return [name for name in available_tool_names if name in allowed]

    def _has_active_code_task(self, request: AppChatStreamRequest) -> bool:
        for fragment in request.context_source.active_task_snapshots:
            if fragment.type != "active_task_snapshot":
                continue
            haystack = f"{fragment.text} {fragment.metadata}".lower()
            if any(keyword in haystack for keyword in ("workspaceid", "activeworkspaceid", "file_change", "builder", "当前工作区", "已变更文件", "相关文件")):
                return True
        return False

    def _has_builder_write_tools(self, request: AppChatStreamRequest) -> bool:
        return any(skill_id in {"jeecgboot-dev", "jeecgboot-uniapp-template"} for skill_id in request.skill_ids)

    def _has_builder_workspace_context(self, request: AppChatStreamRequest) -> bool:
        texts = [request.input or ""]
        for message in [*request.context_source.recent_messages, *request.context_source.relevant_messages]:
            texts.append(message.content or "")
        for text in texts:
            if re.search(r"[a-zA-Z0-9][a-zA-Z0-9_-]{7,}-[a-zA-Z0-9_-]{4,}", text or ""):
                return True
        return False

    def _looks_like_follow_up(self, text: str) -> bool:
        value = text.strip()
        if len(value) <= 24:
            return True
        return any(term in value for term in ("继续", "接着", "刚才", "上次", "之前"))

    def _is_high_risk_text(self, text: str) -> bool:
        normalized = text.lower()
        return any(value in normalized for value in ("rm -rf", "application-prod", "prod", "生产", "线上"))

    def _summary(self, intent: PreflightIntent) -> str:
        mapping = {
            PreflightIntent.QUESTION: "理解为一次问答或方案咨询。",
            PreflightIntent.READ_FILES: "理解为需要先查看或分析项目文件。",
            PreflightIntent.CODE_CHANGE: "理解为需要修改代码并验证结果。",
            PreflightIntent.CREATE_APP: "理解为需要基于模板创建或修改应用项目。",
            PreflightIntent.API_CHANGE: "理解为需要按 JeecgBoot 规范新增或修改接口。",
            PreflightIntent.RUN_COMMAND: "理解为需要运行受控构建或检查命令。",
            PreflightIntent.DELETE_DATA: "理解为涉及删除或清空操作。",
            PreflightIntent.DATABASE_CHANGE: "理解为涉及数据库结构或迁移变更。",
            PreflightIntent.UNKNOWN: "理解为需要先澄清目标再继续。",
        }
        return mapping.get(intent, "理解为需要先分析用户目标。")

    def _operation_note(
        self,
        intent: PreflightIntent,
        risk: PreflightRisk,
        needs_clarification: bool,
        classification: AgentIntentClassification | None,
    ) -> str:
        if classification and classification.operation_note:
            return classification.operation_note
        if needs_clarification:
            return "我会先确认关键需求，避免直接修改错误位置。"
        if risk == PreflightRisk.HIGH:
            return "这个请求风险较高，我会先限制为只读分析，并要求你确认后再允许写入或执行。"
        if intent == PreflightIntent.API_CHANGE:
            return "我会先检查现有 Controller / Service / Mapper 结构，再按 JeecgBoot 规范补接口。"
        if intent == PreflightIntent.CODE_CHANGE:
            return "我会先定位相关文件和现有实现，再做最小必要修改并运行校验。"
        if intent == PreflightIntent.CREATE_APP:
            return "我会先确认模板和工作区，再按页面与功能拆分执行。"
        if intent == PreflightIntent.READ_FILES:
            return "我会先读取和搜索相关文件，再基于真实代码给出结论。"
        return "我会先理解你的目标，再选择合适的工具和上下文。"

    def _safety_notes(self, intent: PreflightIntent, risk: PreflightRisk) -> list[str]:
        if risk == PreflightRisk.HIGH:
            return ["高风险操作默认只读分析。", "写入、删除、数据库变更需要明确确认。"]
        if intent in {PreflightIntent.CODE_CHANGE, PreflightIntent.API_CHANGE, PreflightIntent.CREATE_APP}:
            return ["只操作受控工作区路径。", "不读取或修改密钥、.env、.git、构建产物目录。", "写入后需要运行可用校验。"]
        if intent == PreflightIntent.READ_FILES:
            return ["只读取受控工作区内的文本文件。", "跳过密钥和构建产物目录。"]
        return []

    def _proposed_steps(
        self,
        intent: PreflightIntent,
        risk: PreflightRisk,
        classification: AgentIntentClassification | None,
    ) -> list[str]:
        if classification and classification.proposed_steps:
            return classification.proposed_steps[:6]
        if risk == PreflightRisk.HIGH:
            return ["先做只读分析", "列出影响范围", "等待确认后再进入修改或执行"]
        if intent == PreflightIntent.API_CHANGE:
            return ["搜索现有接口和模块结构", "读取相关 Controller / Service / Mapper", "按现有风格做最小修改", "运行可用校验"]
        if intent == PreflightIntent.CODE_CHANGE:
            return ["定位相关文件", "读取当前实现", "修改必要文件", "自动构建或检查并修复错误"]
        if intent == PreflightIntent.CREATE_APP:
            return ["查找或创建 Builder 工作区", "读取模板页面和配置", "修改页面/接口对接文件", "构建并检查预览"]
        if intent == PreflightIntent.READ_FILES:
            return ["搜索相关文件", "读取命中内容", "总结发现和建议"]
        return ["分析用户目标", "选择合适上下文", "给出答复或下一步"]

    def _verification_steps(
        self,
        intent: PreflightIntent,
        classification: AgentIntentClassification | None,
    ) -> list[str]:
        if classification and classification.verification_steps:
            return classification.verification_steps[:6]
        if intent == PreflightIntent.CREATE_APP:
            return ["运行 build:h5", "检查 H5 预览页面"]
        if intent in {PreflightIntent.CODE_CHANGE, PreflightIntent.API_CHANGE}:
            return ["运行可用的 build / type-check / test", "根据错误自动修复并重试"]
        return []
