from pydantic import BaseModel, Field

from app.models.schemas import AppChatStreamRequest, ContextFragment, ModelConfig
from app.services.attachment_context_router import AttachmentContextDecision, AttachmentContextRouter
from app.services.fragment_reranker import FragmentReranker
from app.services.token_counter import TokenCounter


class ContextSelection(BaseModel):
    summary_text: str | None = Field(default=None, alias="summaryText")
    summary_label: str = Field(default="会话摘要", alias="summaryLabel")
    context_version: int | None = Field(default=None, alias="contextVersion")
    selected_fragments: list[ContextFragment] = Field(default_factory=list, alias="selectedFragments")
    selected_recent_messages: list[dict] = Field(default_factory=list, alias="selectedRecentMessages")
    selected_relevant_messages: list[dict] = Field(default_factory=list, alias="selectedRelevantMessages")
    attachment_selection: dict = Field(default_factory=dict, alias="attachmentSelection")
    token_ledger: dict = Field(default_factory=dict, alias="tokenLedger")


class ContextRouter:
    def __init__(
        self,
        token_counter: TokenCounter | None = None,
        attachment_router: AttachmentContextRouter | None = None,
        fragment_reranker: FragmentReranker | None = None,
    ) -> None:
        self.token_counter = token_counter or TokenCounter()
        self.attachment_router = attachment_router or AttachmentContextRouter(self.token_counter)
        self.fragment_reranker = fragment_reranker or FragmentReranker(self.token_counter)

    async def route(self, request: AppChatStreamRequest, model: ModelConfig) -> ContextSelection:
        attachment_decision = await self.attachment_router.route(request, model)
        summary_text = (request.context_source.summary.text or "").strip() or None
        summary_metadata = request.context_source.summary.metadata or {}
        summary_label = "活跃上下文快照" if summary_metadata.get("contextMode") == "active_snapshot" else "会话摘要"
        selected_fragments = self._selected_fragments(request, attachment_decision)
        selected_recent_messages = self._selected_recent_messages(request)
        selected_relevant_messages = self._selected_relevant_messages(request, selected_recent_messages)
        selected_messages = self._merge_messages(selected_relevant_messages, selected_recent_messages)
        token_ledger = self._token_ledger(
            request=request,
            summary_text=summary_text,
            selected_fragments=selected_fragments,
            selected_recent_messages=selected_recent_messages,
            selected_relevant_messages=selected_relevant_messages,
            selected_messages=selected_messages,
            attachment_decision=attachment_decision,
        )
        return ContextSelection(
            summaryText=summary_text,
            summaryLabel=summary_label,
            contextVersion=request.context_source.summary.context_version,
            selectedFragments=selected_fragments,
            selectedRecentMessages=selected_messages,
            selectedRelevantMessages=selected_relevant_messages,
            attachmentSelection=attachment_decision.model_dump(
                by_alias=True,
                exclude={"selected_fragments"},
            ),
            tokenLedger=token_ledger,
        )

    def _selected_fragments(
        self,
        request: AppChatStreamRequest,
        attachment_decision: AttachmentContextDecision,
    ) -> list[ContextFragment]:
        fragments = [
            fragment
            for fragment in request.context_source.relevant_fragments
            if fragment.type != "attachment_summary"
        ]
        fragments.extend(attachment_decision.selected_fragments)
        return self.fragment_reranker.rerank(request.input, fragments, limit=20)

    def _selected_recent_messages(self, request: AppChatStreamRequest) -> list[dict]:
        source_messages = request.context_source.recent_messages or []
        if not source_messages and request.messages:
            return [
                {"role": item.role, "content": item.content}
                for item in request.messages[-12:]
                if item.role in {"user", "assistant"} and item.content.strip()
            ]
        result = []
        for message in source_messages[-12:]:
            role = message.role if message.role in {"user", "assistant"} else ""
            content = (message.content or "").strip()
            if not role or not content or content == request.input:
                continue
            result.append({"role": role, "content": content[:4000]})
        return result

    def _selected_relevant_messages(self, request: AppChatStreamRequest, recent_messages: list[dict]) -> list[dict]:
        recent_ids = {str(message.get("id")) for message in recent_messages if message.get("id")}
        result = []
        for message in request.context_source.relevant_messages[:8]:
            role = message.role if message.role in {"user", "assistant"} else ""
            content = (message.content or "").strip()
            if not role or not content or content == request.input:
                continue
            if message.id and message.id in recent_ids:
                continue
            result.append(
                {
                    "id": message.id,
                    "role": role,
                    "content": content[:4000],
                    "metadata": message.metadata,
                    "createTime": message.create_time,
                }
            )
        return result

    def _merge_messages(self, relevant_messages: list[dict], recent_messages: list[dict]) -> list[dict]:
        merged = []
        seen: set[str] = set()
        for message in [*relevant_messages, *recent_messages]:
            key = str(message.get("id") or f"{message.get('role')}:{hash(message.get('content', ''))}")
            if key in seen:
                continue
            seen.add(key)
            merged.append({"role": message["role"], "content": message["content"]})
        return merged

    def _token_ledger(
        self,
        *,
        request: AppChatStreamRequest,
        summary_text: str | None,
        selected_fragments: list[ContextFragment],
        selected_recent_messages: list[dict],
        selected_relevant_messages: list[dict],
        selected_messages: list[dict],
        attachment_decision: AttachmentContextDecision,
    ) -> dict:
        summary_tokens = self.token_counter.count(summary_text)
        fragment_tokens = sum(
            fragment.token_count if fragment.token_count is not None else self.token_counter.count(fragment.text)
            for fragment in selected_fragments
        )
        recent_message_tokens = sum(self.token_counter.message_tokens(message) for message in selected_recent_messages)
        relevant_message_tokens = sum(self.token_counter.message_tokens(message) for message in selected_relevant_messages)
        selected_message_tokens = sum(self.token_counter.message_tokens(message) for message in selected_messages)
        fragment_type_counts = self._fragment_type_counts(selected_fragments)
        return {
            "summaryTokenCount": summary_tokens,
            "selectedFragmentCount": len(selected_fragments),
            "selectedFragmentTokens": fragment_tokens,
            "selectedSkillResultCount": fragment_type_counts.get("skill_result", 0),
            "selectedToolResultCount": fragment_type_counts.get("tool_result", 0),
            "selectedSourceCount": fragment_type_counts.get("source", 0),
            "selectedWorkspaceSnapshotCount": fragment_type_counts.get("workspace_snapshot", 0),
            "selectedRecentMessageCount": len(selected_recent_messages),
            "selectedRecentMessageTokens": recent_message_tokens,
            "selectedRelevantMessageCount": len(selected_relevant_messages),
            "selectedRelevantMessageTokens": relevant_message_tokens,
            "selectedMessageCount": len(selected_messages),
            "selectedMessageTokens": selected_message_tokens,
            "attachmentSelection": attachment_decision.model_dump(
                by_alias=True,
                exclude={"selected_fragments"},
            ),
            "availableRelevantFragmentCount": len(request.context_source.relevant_fragments),
            "availableRecentMessageCount": len(request.context_source.recent_messages),
            "availableRelevantMessageCount": len(request.context_source.relevant_messages),
            "estimatedContextInputTokens": summary_tokens + fragment_tokens + selected_message_tokens,
        }

    def _fragment_type_counts(self, fragments: list[ContextFragment]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for fragment in fragments:
            counts[fragment.type] = counts.get(fragment.type, 0) + 1
        return counts
