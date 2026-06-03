import json
from json import JSONDecodeError
from pathlib import Path

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.models.schemas import AppChatStreamRequest, ContextFragment, ModelConfig
from app.services.token_counter import TokenCounter


class AttachmentContextDecision(BaseModel):
    include_attachments: bool = Field(alias="includeAttachments")
    target_files: list[str] = Field(default_factory=list, alias="targetFiles")
    selected_fragments: list[ContextFragment] = Field(default_factory=list, alias="selectedFragments")
    reason: str = "not_needed"
    token_estimate: int = Field(default=0, alias="tokenEstimate")
    candidate_count: int = Field(default=0, alias="candidateCount")
    selected_token_count: int = Field(default=0, alias="selectedTokenCount")


class AttachmentContextRouter:
    HIGH_SIMILARITY_THRESHOLD = 0.82
    LOW_SIMILARITY_THRESHOLD = 0.55

    def __init__(self, token_counter: TokenCounter | None = None) -> None:
        self.token_counter = token_counter or TokenCounter()

    async def route(self, request: AppChatStreamRequest, model: ModelConfig) -> AttachmentContextDecision:
        candidates = self._attachment_candidates(request)
        current_fragments = self._current_turn_attachment_fragments(request)
        if current_fragments:
            return self._decision(
                selected=current_fragments,
                candidates=candidates,
                reason="current_turn_upload",
                include=True,
            )

        explicit_fragments = self._explicit_reference_fragments(request, candidates)
        if explicit_fragments:
            return self._decision(
                selected=explicit_fragments,
                candidates=candidates,
                reason="explicit_file_reference",
                include=True,
            )

        matches = self._ranked_attachment_matches(request)
        top_score = self._fragment_score(matches[0]) if matches else 0.0
        if top_score >= self.HIGH_SIMILARITY_THRESHOLD:
            selected = self._same_file_fragments(matches, matches[0])
            return self._decision(
                selected=selected,
                candidates=candidates,
                reason="high_similarity_match",
                include=True,
            )
        if top_score < self.LOW_SIMILARITY_THRESHOLD:
            return self._decision(
                selected=[],
                candidates=candidates,
                reason="no_explicit_reference_and_low_similarity",
                include=False,
            )

        classifier = await self._classify_intent(request, model, candidates, matches)
        if classifier.get("includeAttachments") is True:
            target_files = [str(item) for item in classifier.get("targetFiles") or [] if item]
            selected = self._fragments_for_targets(matches, target_files) if target_files else matches[:3]
            return self._decision(
                selected=selected,
                candidates=candidates,
                reason=f"intent_classifier:{classifier.get('reason') or 'include'}",
                include=True,
            )
        return self._decision(
            selected=[],
            candidates=candidates,
            reason=f"intent_classifier:{classifier.get('reason') or 'exclude'}",
            include=False,
        )

    def _attachment_candidates(self, request: AppChatStreamRequest) -> list[ContextFragment]:
        candidates = [*request.context_source.attachment_candidates]
        if not candidates and request.context_source.attachment_summaries:
            candidates = [*request.context_source.attachment_summaries]
        return candidates

    def _current_turn_attachment_fragments(self, request: AppChatStreamRequest) -> list[ContextFragment]:
        fragments = []
        for attachment in request.attachments:
            name = attachment.name or "未命名附件"
            file_type = attachment.type or "unknown"
            size = attachment.size if attachment.size is not None else "unknown"
            url = attachment.url or attachment.path or ""
            text = f"当前轮用户上传文件：{name}，类型={file_type}，大小={size}，地址={url}"
            if attachment.extracted_text:
                text += f"\n附件正文：{attachment.extracted_text}"
            elif attachment.extraction_status:
                text += f"\n附件读取状态：{attachment.extraction_status}"
                if attachment.extraction_error:
                    text += f"，{attachment.extraction_error}"
            fragments.append(
                ContextFragment(
                    type="attachment_summary",
                    text=text,
                    tokenCount=self.token_counter.count(text),
                    metadata=attachment.model_dump(exclude_none=True),
                )
            )
        return fragments

    def _explicit_reference_fragments(
        self,
        request: AppChatStreamRequest,
        candidates: list[ContextFragment],
    ) -> list[ContextFragment]:
        input_text = (request.input or "").lower()
        if not input_text:
            return []
        selected = []
        for fragment in candidates:
            names = self._attachment_reference_values(fragment)
            if any(value and value.lower() in input_text for value in names):
                selected.append(fragment)
        return selected

    def _attachment_reference_values(self, fragment: ContextFragment) -> list[str]:
        metadata = fragment.metadata or {}
        values = [
            fragment.id,
            fragment.message_id,
            metadata.get("id"),
            metadata.get("fileId"),
            metadata.get("file_id"),
            metadata.get("name"),
            metadata.get("url"),
            metadata.get("path"),
        ]
        basename_values = []
        for value in values:
            if not value:
                continue
            basename = Path(str(value)).name
            if basename and basename != value:
                basename_values.append(basename)
        return [str(value) for value in values if value] + basename_values

    def _ranked_attachment_matches(self, request: AppChatStreamRequest) -> list[ContextFragment]:
        matches = [*request.context_source.attachment_matches]
        if not matches:
            matches = [
                fragment
                for fragment in request.context_source.relevant_fragments
                if fragment.type == "attachment_summary"
            ]
        return sorted(matches, key=self._fragment_score, reverse=True)

    def _same_file_fragments(self, fragments: list[ContextFragment], target: ContextFragment) -> list[ContextFragment]:
        target_key = self._file_key(target)
        if not target_key:
            return [target]
        selected = [fragment for fragment in fragments if self._file_key(fragment) == target_key]
        return selected[:3] or [target]

    def _fragments_for_targets(self, fragments: list[ContextFragment], target_files: list[str]) -> list[ContextFragment]:
        normalized_targets = {target.lower() for target in target_files if target}
        selected = []
        for fragment in fragments:
            values = {value.lower() for value in self._attachment_reference_values(fragment)}
            if values.intersection(normalized_targets):
                selected.append(fragment)
        return selected[:5]

    def _file_key(self, fragment: ContextFragment) -> str:
        metadata = fragment.metadata or {}
        for key in ("id", "fileId", "file_id", "url", "path", "name"):
            value = metadata.get(key)
            if value:
                return str(value)
        return fragment.id or fragment.message_id or ""

    def _fragment_score(self, fragment: ContextFragment) -> float:
        value = getattr(fragment, "score", None)
        if value is None:
            value = (fragment.metadata or {}).get("score")
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def _decision(
        self,
        *,
        selected: list[ContextFragment],
        candidates: list[ContextFragment],
        reason: str,
        include: bool,
    ) -> AttachmentContextDecision:
        token_count = sum(
            fragment.token_count if fragment.token_count is not None else self.token_counter.count(fragment.text)
            for fragment in selected
        )
        target_files = []
        for fragment in selected:
            file_key = self._file_key(fragment)
            if file_key and file_key not in target_files:
                target_files.append(file_key)
        return AttachmentContextDecision(
            includeAttachments=include,
            targetFiles=target_files,
            selectedFragments=selected,
            reason=reason,
            tokenEstimate=token_count,
            candidateCount=len(candidates),
            selectedTokenCount=token_count,
        )

    async def _classify_intent(
        self,
        request: AppChatStreamRequest,
        model: ModelConfig,
        candidates: list[ContextFragment],
        matches: list[ContextFragment],
    ) -> dict:
        try:
            payload, endpoint, headers, timeout = self._build_classifier_request(request, model, candidates, matches)
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
            if not response.is_success:
                return {"includeAttachments": False, "targetFiles": [], "reason": f"classifier_http_{response.status_code}"}
            content = self._extract_completion_text(response)
            return self._parse_classifier_json(content)
        except Exception as exc:
            return {"includeAttachments": False, "targetFiles": [], "reason": f"classifier_failed:{exc}"}

    def _build_classifier_request(
        self,
        request: AppChatStreamRequest,
        model: ModelConfig,
        candidates: list[ContextFragment],
        matches: list[ContextFragment],
    ) -> tuple[dict, str, dict, int | float]:
        candidate_payload = [
            {
                "id": fragment.id,
                "messageId": fragment.message_id,
                "text": fragment.text[:600],
                "metadata": fragment.metadata,
            }
            for fragment in candidates[:8]
        ]
        match_payload = [
            {
                "id": fragment.id,
                "messageId": fragment.message_id,
                "score": self._fragment_score(fragment),
                "text": fragment.text[:600],
                "metadata": fragment.metadata,
            }
            for fragment in matches[:5]
        ]
        user_payload = {
            "input": request.input,
            "attachmentCandidates": candidate_payload,
            "attachmentMatches": match_payload,
        }
        payload = {
            "model": model.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "你是附件上下文路由器。判断当前用户问题是否需要读取历史上传附件。"
                        "只输出 JSON：includeAttachments(boolean), targetFiles(array), reason(string)。"
                        "如果用户没有要求查看历史文件，默认 includeAttachments=false。"
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                },
            ],
            "stream": False,
            "temperature": 0,
            "max_tokens": int((model.model_params or {}).get("attachmentIntentMaxTokens") or 300),
        }
        endpoint = self._chat_completions_endpoint(model.base_url)
        headers = {
            "Authorization": f"Bearer {model.credential.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        return payload, endpoint, headers, (model.model_params or {}).get("timeout") or 60

    def _extract_completion_text(self, response: httpx.Response) -> str:
        body = response.json()
        choices = body.get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        return (message.get("content") or choices[0].get("text") or "").strip()

    def _parse_classifier_json(self, content: str) -> dict:
        candidates = [content]
        json_start = content.find("{")
        json_end = content.rfind("}")
        if json_start >= 0 and json_end > json_start:
            candidates.append(content[json_start : json_end + 1])
        for candidate in candidates:
            try:
                payload = json.loads(candidate)
            except JSONDecodeError:
                continue
            if not isinstance(payload, dict):
                continue
            try:
                decision = AttachmentContextDecision.model_validate(
                    {
                        "includeAttachments": payload.get("includeAttachments") is True,
                        "targetFiles": payload.get("targetFiles") or [],
                        "selectedFragments": [],
                        "reason": str(payload.get("reason") or "classifier"),
                    }
                )
            except ValidationError:
                continue
            return decision.model_dump(by_alias=True)
        return {"includeAttachments": False, "targetFiles": [], "reason": "classifier_invalid_json"}

    def _chat_completions_endpoint(self, base_url: str) -> str:
        value = (base_url or "").rstrip("/")
        if value.endswith("/chat/completions"):
            return value
        if value.endswith("/v1"):
            return f"{value}/chat/completions"
        return f"{value}/v1/chat/completions"
