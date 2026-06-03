import json
from json import JSONDecodeError

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.models.schemas import ContextCompactionRequest, ContextCompactionResponse, ModelConfig
from app.services.jeecg_client import JeecgClient
from app.services.token_counter import TokenCounter


class StructuredConversationSummary(BaseModel):
    objective: str = ""
    userPreferences: list[str] = Field(default_factory=list)
    projectConstraints: list[str] = Field(default_factory=list)
    importantDecisions: list[str] = Field(default_factory=list)
    completedWork: list[str] = Field(default_factory=list)
    currentState: str = ""
    openIssues: list[str] = Field(default_factory=list)
    importantFiles: list[str] = Field(default_factory=list)
    toolResults: list[str] = Field(default_factory=list)
    nextSteps: list[str] = Field(default_factory=list)


class ContextCompactor:
    def __init__(
        self,
        jeecg_client: JeecgClient | None = None,
        token_counter: TokenCounter | None = None,
    ) -> None:
        self.jeecg_client = jeecg_client or JeecgClient()
        self.token_counter = token_counter or TokenCounter()

    async def compact(self, request: ContextCompactionRequest) -> ContextCompactionResponse:
        if not request.context_source.messages:
            raise ValueError("没有可压缩的会话消息")
        model = await self.jeecg_client.get_model_config(request.app.model_id, request.user_context)
        prompt = self._build_prompt(request)
        summary = await self._complete_json(model, prompt)
        summary_text = json.dumps(summary.model_dump(), ensure_ascii=False, indent=2)
        latest_message_id = self._latest_message_id(request)
        active_context_snapshot = self._build_active_context_snapshot(request, summary, latest_message_id)
        active_context_token_count = self.token_counter.count(active_context_snapshot)
        summary_token_count = self.token_counter.count(summary_text)
        token_ledger = self._build_token_ledger(
            request=request,
            model=model,
            summary_token_count=summary_token_count,
            active_context_token_count=active_context_token_count,
            latest_message_id=latest_message_id,
        )
        return ContextCompactionResponse(
            summaryText=summary_text,
            summaryMessageId=latest_message_id,
            tokenCount=summary_token_count,
            activeContextSnapshot=active_context_snapshot,
            activeContextTokenCount=active_context_token_count,
            tokenLedger=token_ledger,
            metadata={
                "summaryVersion": 1,
                "summaryType": "structured_conversation_summary",
                "activeContextSnapshotVersion": 1,
                "messageCount": len(request.context_source.messages),
                "fragmentCount": len(request.context_source.fragments),
                "modelId": model.id,
                "modelName": model.model_name,
                "tokenLedger": token_ledger,
            },
        )

    def _build_active_context_snapshot(
        self,
        request: ContextCompactionRequest,
        summary: StructuredConversationSummary,
        latest_message_id: str | None,
    ) -> str:
        snapshot = {
            "snapshotType": "active_context_snapshot",
            "snapshotVersion": 1,
            "conversationId": request.conversation_id,
            "summaryMessageId": latest_message_id,
            "summary": summary.model_dump(),
            "availableFiles": self._available_files(request),
            "activeFiles": self._active_files(request),
            "retainedMessages": self._retained_messages(request),
            "retainedFragments": self._retained_fragments(request),
        }
        return json.dumps(snapshot, ensure_ascii=False, indent=2)

    def _retained_messages(self, request: ContextCompactionRequest) -> list[dict]:
        retained = []
        for message in request.context_source.messages[-8:]:
            if message.role not in {"user", "assistant"}:
                continue
            content = (message.content or "").strip()
            if not content:
                continue
            retained.append(
                {
                    "id": message.id,
                    "role": message.role,
                    "content": self._truncate(content, 1200),
                    "tokenCount": message.token_count,
                    "createTime": message.create_time,
                }
            )
        return retained

    def _retained_fragments(self, request: ContextCompactionRequest) -> list[dict]:
        priority = {
            "attachment_summary": 100,
            "skill_result": 90,
            "tool_result": 80,
            "source": 70,
            "error": 60,
        }
        fragments = [
            fragment
            for fragment in request.context_source.fragments
            if (fragment.text or "").strip() and fragment.type != "attachment_summary"
        ]
        fragments.sort(
            key=lambda fragment: (
                priority.get(fragment.type, 10),
                fragment.create_time or "",
            ),
            reverse=True,
        )
        retained = []
        for fragment in fragments[:12]:
            retained.append(
                {
                    "id": fragment.id,
                    "messageId": fragment.message_id,
                    "type": fragment.type,
                    "text": self._truncate(fragment.text, 1200),
                    "tokenCount": fragment.token_count,
                    "metadata": fragment.metadata,
                    "createTime": fragment.create_time,
                }
            )
        return retained

    def _available_files(self, request: ContextCompactionRequest) -> list[dict]:
        files = []
        seen: set[str] = set()
        for fragment in request.context_source.fragments:
            if fragment.type != "attachment_summary":
                continue
            metadata = fragment.metadata or {}
            file_id = self._file_identifier(fragment)
            if file_id in seen:
                continue
            seen.add(file_id)
            files.append(
                {
                    "fileId": file_id,
                    "name": metadata.get("name") or file_id,
                    "messageId": fragment.message_id,
                    "createdAt": fragment.create_time,
                    "summary": self._truncate(fragment.text, 400),
                }
            )
        return files[:20]

    def _active_files(self, request: ContextCompactionRequest) -> list[dict]:
        previous = request.context_source.previous_summary.metadata or {}
        selection = previous.get("attachmentSelection") or {}
        selected_files = selection.get("targetFiles") or []
        if not selected_files:
            return []
        return [
            {
                "fileId": str(file_id),
                "whyActive": selection.get("reason") or "selected_by_attachment_router",
            }
            for file_id in selected_files[:10]
        ]

    def _file_identifier(self, fragment) -> str:
        metadata = fragment.metadata or {}
        for key in ("id", "fileId", "file_id", "url", "path", "name"):
            value = metadata.get(key)
            if value:
                return str(value)
        return fragment.id or fragment.message_id or "unknown"

    def _build_token_ledger(
        self,
        *,
        request: ContextCompactionRequest,
        model: ModelConfig,
        summary_token_count: int,
        active_context_token_count: int,
        latest_message_id: str | None,
    ) -> dict:
        message_tokens = sum(
            message.token_count if message.token_count is not None else self.token_counter.count(message.content)
            for message in request.context_source.messages
        )
        fragment_tokens = sum(
            fragment.token_count if fragment.token_count is not None else self.token_counter.count(fragment.text)
            for fragment in request.context_source.fragments
        )
        params = model.model_params or {}
        context_window = self._int_param(params, ("contextWindow", "context_window", "maxContextTokens"), 0)
        max_output_tokens = self._int_param(params, ("maxOutputTokens", "max_output_tokens", "maxTokens", "max_tokens"), 0)
        reasoning_reserve = self._int_param(params, ("reasoningReserve", "reasoning_reserve"), 0)
        safety_margin = self._int_param(params, ("safetyMargin", "safety_margin"), 0)
        compact_threshold_tokens = self._int_param(params, ("compactThresholdTokens", "compact_threshold_tokens"), 0)
        estimated_added_tokens = message_tokens + fragment_tokens
        return {
            "summaryMessageId": latest_message_id,
            "summaryTokenCount": summary_token_count,
            "activeContextTokenCount": active_context_token_count,
            "compactedMessageCount": len(request.context_source.messages),
            "compactedFragmentCount": len(request.context_source.fragments),
            "compactedMessageTokens": message_tokens,
            "compactedFragmentTokens": fragment_tokens,
            "estimatedAddedTokens": estimated_added_tokens,
            "lastModelInputTokens": estimated_added_tokens,
            "lastModelOutputTokens": summary_token_count,
            "lastModelTotalTokens": estimated_added_tokens + summary_token_count,
            "contextWindow": context_window,
            "maxOutputTokens": max_output_tokens,
            "reasoningReserve": reasoning_reserve,
            "safetyMargin": safety_margin,
            "compactThresholdTokens": compact_threshold_tokens,
            "attachmentSelection": (request.context_source.previous_summary.metadata or {}).get("attachmentSelection") or {},
        }

    def _build_prompt(self, request: ContextCompactionRequest) -> str:
        payload = {
            "previousSummary": self._previous_summary(request),
            "messages": [
                {
                    "id": message.id,
                    "role": message.role,
                    "content": self._truncate(message.content, 6000),
                    "metadata": message.metadata,
                    "createTime": message.create_time,
                }
                for message in request.context_source.messages
                if message.role in {"user", "assistant"} and message.content.strip()
            ],
            "fragments": [
                {
                    "id": fragment.id,
                    "messageId": fragment.message_id,
                    "type": fragment.type,
                    "text": self._truncate(fragment.text, 3000),
                    "metadata": fragment.metadata,
                    "createTime": fragment.create_time,
                }
                for fragment in request.context_source.fragments
                if fragment.text.strip()
            ],
        }
        return (
            "你是会话上下文压缩器。请把输入的历史消息、工具结果、来源、附件、skill 执行结果压缩成稳定的结构化摘要。\n"
            "要求：\n"
            "1. 只保留后续模型继续完成任务必须知道的信息，删除寒暄和重复内容。\n"
            "2. 不要编造没有出现过的事实。\n"
            "3. 如果 previousSummary 已有内容，需要和新增消息合并，而不是覆盖丢失。\n"
            "4. 输出必须是合法 JSON，不要 Markdown，不要代码块，不要解释。\n"
            "5. JSON 字段必须严格为：objective, userPreferences, projectConstraints, importantDecisions, completedWork, currentState, openIssues, importantFiles, toolResults, nextSteps。\n\n"
            f"待压缩上下文：\n{json.dumps(payload, ensure_ascii=False)}"
        )

    def _previous_summary(self, request: ContextCompactionRequest) -> dict | str:
        text = (request.context_source.previous_summary.text or "").strip()
        if not text:
            return {}
        try:
            return json.loads(text)
        except JSONDecodeError:
            return text

    async def _complete_json(self, model: ModelConfig, prompt: str) -> StructuredConversationSummary:
        payload, endpoint, headers, timeout = self._build_model_request(model, prompt)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
        if not response.is_success:
            raise ValueError(f"模型摘要压缩失败：HTTP {response.status_code}，响应={response.text[:300]}")
        content = self._extract_completion_text(response)
        return self._parse_summary(content)

    def _build_model_request(self, model: ModelConfig, prompt: str) -> tuple[dict, str, dict, int | float]:
        if not model.base_url:
            raise ValueError("模型 API 域名不能为空")
        if not model.model_name:
            raise ValueError("模型名称不能为空")
        if not model.credential.api_key:
            raise ValueError("模型 API Key 不能为空")

        payload = {
            "model": model.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": "你只输出符合要求的 JSON 对象。",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "stream": False,
            "temperature": 0,
        }
        max_tokens = model.model_params.get("summaryMaxTokens") or model.model_params.get("maxSummaryTokens") or 4000
        payload["max_tokens"] = int(max_tokens)
        endpoint = self._chat_completions_endpoint(model.base_url)
        headers = {
            "Authorization": f"Bearer {model.credential.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        return payload, endpoint, headers, model.model_params.get("timeout") or 120

    def _extract_completion_text(self, response: httpx.Response) -> str:
        try:
            body = response.json()
        except JSONDecodeError:
            raise ValueError(f"模型摘要压缩返回非 JSON：{response.text[:300]}") from None
        choices = body.get("choices") or []
        if not choices:
            raise ValueError("模型摘要压缩未返回 choices")
        message = choices[0].get("message") or {}
        content = message.get("content") or choices[0].get("text") or ""
        if not content.strip():
            raise ValueError("模型摘要压缩返回空内容")
        return content.strip()

    def _parse_summary(self, content: str) -> StructuredConversationSummary:
        candidates = [content]
        json_start = content.find("{")
        json_end = content.rfind("}")
        if json_start >= 0 and json_end > json_start:
            candidates.append(content[json_start : json_end + 1])
        for candidate in candidates:
            try:
                return StructuredConversationSummary.model_validate_json(candidate)
            except (ValidationError, ValueError):
                normalized = self._normalize_summary_candidate(candidate)
                if normalized is None:
                    continue
                try:
                    return StructuredConversationSummary.model_validate(normalized)
                except ValidationError:
                    continue
        raise ValueError(f"模型摘要压缩返回内容不符合结构：{content[:300]}")

    def _normalize_summary_candidate(self, candidate: str) -> dict | None:
        try:
            payload = json.loads(candidate)
        except JSONDecodeError:
            return None
        if not isinstance(payload, dict):
            return None
        list_fields = {
            "userPreferences",
            "projectConstraints",
            "importantDecisions",
            "completedWork",
            "openIssues",
            "importantFiles",
            "toolResults",
            "nextSteps",
        }
        result = {}
        for field in StructuredConversationSummary.model_fields:
            value = payload.get(field)
            if field in list_fields:
                result[field] = self._normalize_list(value)
            else:
                result[field] = self._normalize_text(value)
        return result

    def _normalize_list(self, value) -> list[str]:
        if value is None or value == "":
            return []
        if isinstance(value, list):
            return [self._normalize_text(item) for item in value if self._normalize_text(item)]
        if isinstance(value, dict):
            return [
                f"{key}: {self._normalize_text(item)}"
                for key, item in value.items()
                if self._normalize_text(item)
            ]
        text = self._normalize_text(value)
        return [text] if text else []

    def _normalize_text(self, value) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, (int, float, bool)):
            return str(value)
        return json.dumps(value, ensure_ascii=False)

    def _int_param(self, params: dict, keys: tuple[str, ...], default: int) -> int:
        for key in keys:
            value = params.get(key)
            if value is None:
                continue
            try:
                return int(value)
            except (TypeError, ValueError):
                continue
        return default

    def _latest_message_id(self, request: ContextCompactionRequest) -> str | None:
        for message in reversed(request.context_source.messages):
            if message.id:
                return message.id
        return None

    def _chat_completions_endpoint(self, base_url: str) -> str:
        value = base_url.rstrip("/")
        if value.endswith("/chat/completions"):
            return value
        if value.endswith("/v1"):
            return f"{value}/chat/completions"
        return f"{value}/v1/chat/completions"

    def _truncate(self, text: str, limit: int) -> str:
        value = (text or "").strip()
        if len(value) <= limit:
            return value
        return f"{value[:limit].rstrip()}\n[内容已截断]"
