from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agents import BuilderAgent
from app.builder import BuilderTools
from app.builder.models import (
    BuilderAgentResult,
    BuilderCommandResult,
    BuilderFileContent,
    BuilderFileSearchResult,
    BuilderGrepResult,
    BuilderPageList,
    BuilderPatchResult,
    BuilderPreviewCheckResult,
    BuilderPreviewResult,
    BuilderSnapshot,
    BuilderWorkspaceFindResult,
    BuilderWorkspaceList,
    BuilderWriteResult,
)
from app.executors.dry_run import DryRunExecutor
from app.models.schemas import (
    AppChatStreamRequest,
    AppDebugRequest,
    AppDebugResponse,
    BuilderApplyPatchRequest,
    BuilderBuildRequest,
    BuilderCreateWorkspaceRequest,
    BuilderFindWorkspaceRequest,
    BuilderGrepFilesRequest,
    BuilderReadFileRequest,
    BuilderPreviewCheckRequest,
    BuilderRunScriptRequest,
    BuilderSearchFilesRequest,
    BuilderWriteFileRequest,
    ContextCompactionRequest,
    ContextCompactionResponse,
    RequirementAnalysis,
    RequirementRequest,
    SpecGenerateRequest,
    SpecGenerateResponse,
    TaskExecuteRequest,
    TaskExecuteResponse,
)
from app.services.capability_router import KEYWORDS, analyze_requirement, select_executor
from app.services.chat_service import ChatService
from app.services.context_compactor import ContextCompactor
from app.services.spec_service import generate_spec_with_speckit
from app.skills import SkillRegistry

router = APIRouter()
builder_tools = BuilderTools()
builder_agent = BuilderAgent(builder_tools)


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


@router.post("/api/context/compact", response_model=ContextCompactionResponse)
async def compact_context(request: ContextCompactionRequest) -> ContextCompactionResponse:
    try:
        return await ContextCompactor().compact(request)
    except ValueError as exc:
        message = str(exc)
        status_code = 503 if "429" in message or "rate_limit" in message or "Concurrency limit exceeded" in message else 422
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/api/builder/workspaces", response_model=BuilderAgentResult)
def builder_create_workspace(request: BuilderCreateWorkspaceRequest) -> BuilderAgentResult:
    try:
        return builder_agent.create_workspace(request.conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/api/builder/workspaces", response_model=BuilderWorkspaceList)
def builder_list_workspaces(limit: int = 50) -> BuilderWorkspaceList:
    try:
        return BuilderWorkspaceList(workspaces=builder_tools.list_workspaces(limit))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/find", response_model=BuilderWorkspaceFindResult)
def builder_find_workspace(request: BuilderFindWorkspaceRequest) -> BuilderWorkspaceFindResult:
    try:
        return BuilderWorkspaceFindResult(matches=builder_tools.find_workspaces(request.query, request.limit))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/api/builder/workspaces/{workspace_id}/snapshot", response_model=BuilderSnapshot)
def builder_snapshot(workspace_id: str) -> BuilderSnapshot:
    try:
        return builder_tools.get_snapshot(workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/api/builder/workspaces/{workspace_id}/pages", response_model=BuilderPageList)
def builder_list_pages(workspace_id: str) -> BuilderPageList:
    try:
        return builder_tools.list_pages(workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/files/search", response_model=BuilderFileSearchResult)
def builder_search_files(workspace_id: str, request: BuilderSearchFilesRequest) -> BuilderFileSearchResult:
    try:
        return builder_tools.search_files(workspace_id, request.query, request.max_results)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/files/grep", response_model=BuilderGrepResult)
def builder_grep_files(workspace_id: str, request: BuilderGrepFilesRequest) -> BuilderGrepResult:
    try:
        return builder_tools.grep_files(workspace_id, request.query, request.max_results)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/files/read", response_model=BuilderFileContent)
def builder_read_file(workspace_id: str, request: BuilderReadFileRequest) -> BuilderFileContent:
    try:
        return builder_tools.read_file(workspace_id, request.path)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/files/write", response_model=BuilderWriteResult)
def builder_write_file(workspace_id: str, request: BuilderWriteFileRequest) -> BuilderWriteResult:
    try:
        return builder_tools.write_file(workspace_id, request.path, request.content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/patch", response_model=BuilderPatchResult)
async def builder_apply_patch(
    workspace_id: str,
    request: BuilderApplyPatchRequest,
) -> BuilderPatchResult:
    try:
        return await builder_tools.apply_patch(workspace_id, request.patch)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/build/h5", response_model=BuilderCommandResult)
async def builder_build_h5(workspace_id: str, request: BuilderBuildRequest) -> BuilderCommandResult:
    try:
        return await builder_tools.run_build_h5(workspace_id, request.install)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/scripts/run", response_model=BuilderCommandResult)
async def builder_run_script(workspace_id: str, request: BuilderRunScriptRequest) -> BuilderCommandResult:
    try:
        return await builder_tools.run_script(workspace_id, request.script, request.install)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/preview/h5", response_model=BuilderPreviewResult)
async def builder_preview_h5(workspace_id: str) -> BuilderPreviewResult:
    try:
        return await builder_tools.start_preview_h5(workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/builder/workspaces/{workspace_id}/preview/h5/check", response_model=BuilderPreviewCheckResult)
async def builder_check_preview_h5(
    workspace_id: str,
    request: BuilderPreviewCheckRequest | None = None,
) -> BuilderPreviewCheckResult:
    try:
        return await builder_tools.check_preview_h5(workspace_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/api/tasks/execute", response_model=TaskExecuteResponse)
def execute_task(request: TaskExecuteRequest) -> TaskExecuteResponse:
    executor = request.executor or select_executor(request.requirement).executor
    return DryRunExecutor(executor).execute(request)
