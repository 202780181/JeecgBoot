from app.models.schemas import AppChatStreamRequest, ContextFragment, ModelConfig
from app.services.token_counter import TokenCounter


class ContextBuilder:
    def __init__(self, token_counter: TokenCounter | None = None) -> None:
        self.token_counter = token_counter or TokenCounter()

    async def build(
        self,
        request: AppChatStreamRequest,
        model: ModelConfig,
        system_prompt: str,
        current_user_content: str,
    ) -> list[dict]:
        budget = self._context_budget(model)
        messages: list[dict] = []
        used_tokens = 0

        used_tokens = self._append_message(messages, {"role": "system", "content": system_prompt}, used_tokens, budget, required=True)
        used_tokens = self._append_summary(messages, request, used_tokens, budget)
        used_tokens = self._append_fragments(messages, request, used_tokens, budget)
        used_tokens = self._append_recent_messages(messages, request, used_tokens, budget)
        self._append_message(messages, {"role": "user", "content": current_user_content}, used_tokens, budget, required=True)
        return messages

    def _context_budget(self, model: ModelConfig) -> int:
        params = model.model_params or {}
        value = params.get("contextWindow") or params.get("context_window") or params.get("maxContextTokens")
        try:
            context_window = int(value)
        except (TypeError, ValueError):
            context_window = 128000
        return max(4096, context_window - 4096)

    def _append_summary(self, messages: list[dict], request: AppChatStreamRequest, used_tokens: int, budget: int) -> int:
        summary_text = (request.context_source.summary.text or "").strip()
        if not summary_text:
            return used_tokens
        content = f"会话摘要：\n{summary_text}"
        return self._append_message(messages, {"role": "system", "content": content}, used_tokens, budget)

    def _append_fragments(self, messages: list[dict], request: AppChatStreamRequest, used_tokens: int, budget: int) -> int:
        fragments = [
            *request.context_source.relevant_fragments[-20:],
            *request.context_source.attachment_summaries[-10:],
        ]
        if not fragments:
            return used_tokens
        lines = []
        for fragment in fragments:
            text = self._fragment_text(fragment)
            if text:
                lines.append(text)
        if not lines:
            return used_tokens
        content = "可用上下文片段：\n" + "\n\n".join(lines)
        return self._append_message(messages, {"role": "system", "content": content}, used_tokens, budget)

    def _append_recent_messages(self, messages: list[dict], request: AppChatStreamRequest, used_tokens: int, budget: int) -> int:
        source_messages = request.context_source.recent_messages or []
        if not source_messages and request.messages:
            source_messages = [
                type("FallbackMessage", (), {"role": item.role, "content": item.content})()
                for item in request.messages[-12:]
            ]
        for message in source_messages[-12:]:
            role = message.role if message.role in {"user", "assistant"} else ""
            content = (message.content or "").strip()
            if not role or not content or content == request.input:
                continue
            used_tokens = self._append_message(
                messages,
                {"role": role, "content": content[:4000]},
                used_tokens,
                budget,
            )
        return used_tokens

    def _fragment_text(self, fragment: ContextFragment) -> str:
        text = (fragment.text or "").strip()
        if not text:
            return ""
        label = fragment.type or "fragment"
        return f"[{label}] {text[:4000]}"

    def _append_message(
        self,
        messages: list[dict],
        message: dict,
        used_tokens: int,
        budget: int,
        *,
        required: bool = False,
    ) -> int:
        token_count = self.token_counter.message_tokens(message)
        if not required and used_tokens + token_count > budget:
            return used_tokens
        messages.append(message)
        return used_tokens + token_count
