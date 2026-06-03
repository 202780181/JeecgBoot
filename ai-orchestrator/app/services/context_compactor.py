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
        return ContextCompactionResponse(
            summaryText=summary_text,
            summaryMessageId=latest_message_id,
            tokenCount=self.token_counter.count(summary_text),
            metadata={
                "summaryVersion": 1,
                "summaryType": "structured_conversation_summary",
                "messageCount": len(request.context_source.messages),
                "fragmentCount": len(request.context_source.fragments),
                "modelId": model.id,
                "modelName": model.model_name,
            },
        )

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
