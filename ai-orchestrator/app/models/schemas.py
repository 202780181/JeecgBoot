from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExecutorName(str, Enum):
    JEECG_ONLFORM = "jeecg-onlform"
    JEECG_ONLREPORT = "jeecg-onlreport"
    JEECG_BPMN = "jeecg-bpmn"
    JEECG_CODEGEN = "jeecg-codegen"
    JEECG_ADMIN_API = "jeecg-admin-api"
    UNIAPP_CODEGEN = "uniapp-codegen"
    MANUAL_REVIEW = "manual-review"


class RequirementRequest(BaseModel):
    requirement: str = Field(min_length=2)
    dry_run: bool = True


class CapabilityMatch(BaseModel):
    executor: ExecutorName
    confidence: float = Field(ge=0, le=1)
    reason: str
    official_first: bool = True
    fallback_uniapp_page: bool = False
    official_doc: str | None = None


class RequirementAnalysis(BaseModel):
    requirement: str
    selected: CapabilityMatch
    candidates: list[CapabilityMatch]
    requires_human_review: bool = False


class SpecGenerateRequest(BaseModel):
    requirement: str = Field(min_length=2)


class SpecGenerateResponse(BaseModel):
    spec: str
    plan: str
    tasks: list[str]
    note: str
    spec_path: str | None = None
    plan_path: str | None = None
    tasks_path: str | None = None
    feature_dir: str | None = None
    source: str = "local"


class AiAppConfig(BaseModel):
    id: str
    name: str | None = None
    type: str | None = None
    descr: str | None = None
    prompt: str | None = None
    model_id: str | None = None
    knowledge_ids: str | None = None
    flow_id: str | None = None
    plugins: str | None = None
    metadata: str | None = None


class UserContext(BaseModel):
    user_id: str | None = None
    username: str | None = None
    tenant_id: str | None = None
    token: str | None = None


class ChatContextMessage(BaseModel):
    role: str
    content: str


class ChatAttachment(BaseModel):
    id: str | None = None
    name: str | None = None
    size: int | None = None
    type: str | None = None
    path: str | None = None
    url: str | None = None
    extracted_text: str | None = None
    extraction_status: str | None = None
    extraction_error: str | None = None


class ContextSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str | None = None
    message_id: str | None = Field(default=None, alias="messageId")
    token_count: int | None = Field(default=None, alias="tokenCount")
    metadata: dict = Field(default_factory=dict)


class ContextMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str | None = None
    role: str
    content: str = ""
    token_count: int | None = Field(default=None, alias="tokenCount")
    metadata: dict = Field(default_factory=dict)
    create_time: str | None = Field(default=None, alias="createTime")


class ContextFragment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str | None = None
    conversation_id: str | None = Field(default=None, alias="conversationId")
    message_id: str | None = Field(default=None, alias="messageId")
    type: str
    text: str = ""
    token_count: int | None = Field(default=None, alias="tokenCount")
    metadata: dict = Field(default_factory=dict)
    create_time: str | None = Field(default=None, alias="createTime")


class ContextSource(BaseModel):
    summary: ContextSummary = Field(default_factory=ContextSummary)
    recent_messages: list[ContextMessage] = Field(default_factory=list)
    relevant_fragments: list[ContextFragment] = Field(default_factory=list)
    attachment_summaries: list[ContextFragment] = Field(default_factory=list)


class AppDebugRequest(BaseModel):
    app: AiAppConfig
    input: str = Field(min_length=1)
    user_context: UserContext = Field(default_factory=UserContext)
    dry_run: bool = True


class AppDebugResponse(BaseModel):
    app_id: str
    session_id: str
    run_id: str
    output: str
    status: str = "completed"
    spec: SpecGenerateResponse | None = None


class AppChatStreamRequest(BaseModel):
    app: AiAppConfig
    input: str = Field(min_length=1)
    conversation_id: str | None = None
    topic_id: str | None = None
    enable_search: bool = False
    skill_ids: list[str] = Field(default_factory=list)
    attachments: list[ChatAttachment] = Field(default_factory=list)
    messages: list[ChatContextMessage] = Field(default_factory=list)
    context_source: ContextSource = Field(default_factory=ContextSource)
    user_context: UserContext = Field(default_factory=UserContext)


class ContextCompactionSource(BaseModel):
    previous_summary: ContextSummary = Field(default_factory=ContextSummary)
    messages: list[ContextMessage] = Field(default_factory=list)
    fragments: list[ContextFragment] = Field(default_factory=list)


class ContextCompactionRequest(BaseModel):
    app: AiAppConfig
    conversation_id: str
    context_source: ContextCompactionSource
    user_context: UserContext = Field(default_factory=UserContext)


class ContextCompactionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    summary_text: str = Field(alias="summaryText")
    summary_message_id: str | None = Field(default=None, alias="summaryMessageId")
    token_count: int = Field(alias="tokenCount")
    metadata: dict = Field(default_factory=dict)


class ModelCredential(BaseModel):
    api_key: str | None = None
    secret_key: str | None = None
    http_version_one: bool = False


class ModelConfig(BaseModel):
    id: str
    provider: str | None = None
    model_name: str
    base_url: str
    credential: ModelCredential = Field(default_factory=ModelCredential)
    model_params: dict = Field(default_factory=dict)


class TaskExecuteRequest(BaseModel):
    requirement: str = Field(min_length=2)
    executor: Optional[ExecutorName] = None
    dry_run: bool = True


class TaskExecuteResponse(BaseModel):
    executor: ExecutorName
    dry_run: bool
    status: str
    summary: str
    next_steps: list[str]
