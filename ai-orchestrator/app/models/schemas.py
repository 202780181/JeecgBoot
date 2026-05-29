from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


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
