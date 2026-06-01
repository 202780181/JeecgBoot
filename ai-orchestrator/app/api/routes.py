from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.executors.dry_run import DryRunExecutor
from app.models.schemas import (
    AppChatStreamRequest,
    AppDebugRequest,
    AppDebugResponse,
    RequirementAnalysis,
    RequirementRequest,
    SpecGenerateRequest,
    SpecGenerateResponse,
    TaskExecuteRequest,
    TaskExecuteResponse,
)
from app.services.capability_router import KEYWORDS, analyze_requirement, select_executor
from app.services.chat_service import ChatService
from app.services.spec_service import generate_spec_with_speckit
from app.skills import SkillRegistry

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/api/capabilities")
def capabilities() -> dict[str, list[str]]:
    return {executor.value: keywords for executor, keywords in KEYWORDS.items()}


@router.get("/api/tools")
def tools() -> dict[str, list[dict]]:
    return {"tools": ChatService().tool_registry.openai_tools()}


@router.get("/api/skills")
def skills() -> dict[str, list[dict]]:
    return {"skills": [skill.model_dump() for skill in SkillRegistry().list_skills()]}


@router.post("/api/requirements/analyze", response_model=RequirementAnalysis)
def analyze(request: RequirementRequest) -> RequirementAnalysis:
    candidates = analyze_requirement(request.requirement)
    selected = candidates[0]
    return RequirementAnalysis(
        requirement=request.requirement,
        selected=selected,
        candidates=candidates,
        requires_human_review=selected.confidence < 0.5,
    )


@router.post("/api/spec/generate", response_model=SpecGenerateResponse)
def generate_spec(request: SpecGenerateRequest) -> SpecGenerateResponse:
    result = generate_spec_with_speckit(request.requirement)
    return SpecGenerateResponse(
        spec=result.spec,
        plan=result.plan,
        tasks=result.tasks,
        note=result.note,
        spec_path=result.spec_path,
        plan_path=result.plan_path,
        tasks_path=result.tasks_path,
        feature_dir=result.feature_dir,
        source=result.source,
    )


@router.post("/api/apps/debug", response_model=AppDebugResponse)
def debug_app(request: AppDebugRequest) -> AppDebugResponse:
    app_name = request.app.name or request.app.id
    result = generate_spec(SpecGenerateRequest(requirement=request.input))
    output = (
        f"我已收到「{app_name}」里的需求：{request.input}\n\n"
        "当前先按 AI 应用开发页的闭环处理：页面提交配置和消息，JeecgBoot 后端转发到 "
        "ai-orchestrator，Python 侧完成 spec-kit 规格拆解并返回给页面。\n\n"
        "下一步建议：\n"
        "1. 确认这次需求要落到哪个 JeecgBoot 官方能力或自定义开发范围。\n"
        "2. 根据已生成的 Spec / Plan / Tasks 决定是否进入代码生成或业务接口编排。\n"
        "3. 如果要继续做真实对话，需要在 ai-orchestrator 里接入模型调用和会话存储。"
    )
    return AppDebugResponse(
        app_id=request.app.id,
        session_id=f"session-{request.app.id}",
        run_id=f"run-{abs(hash((request.app.id, request.input))) % 10_000_000}",
        output=output,
        spec=result,
    )


@router.post("/api/apps/chat/stream")
async def chat_stream(request: AppChatStreamRequest) -> StreamingResponse:
    return StreamingResponse(
        ChatService().stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/api/tasks/execute", response_model=TaskExecuteResponse)
def execute_task(request: TaskExecuteRequest) -> TaskExecuteResponse:
    executor = request.executor or select_executor(request.requirement).executor
    return DryRunExecutor(executor).execute(request)
