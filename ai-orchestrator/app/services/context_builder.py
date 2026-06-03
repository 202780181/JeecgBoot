from dataclasses import dataclass

from app.models.schemas import AppChatStreamRequest, ContextFragment, ModelConfig
from app.services.context_router import ContextRouter, ContextSelection
from app.services.token_counter import TokenCounter


@dataclass(frozen=True)
class TokenBudget:
    context_window: int
    max_output_tokens: int
    reasoning_reserve: int
    safety_margin: int

    @property
    def input_budget(self) -> int:
        return max(
            1024,
            self.context_window
            - self.max_output_tokens
            - self.reasoning_reserve
            - self.safety_margin,
        )


class ContextBuilder:
    DEFAULT_CONTEXT_WINDOW = 128000
    DEFAULT_MAX_OUTPUT_TOKENS = 4096
    DEFAULT_REASONING_RESERVE = 0
    DEFAULT_SAFETY_MARGIN = 4096

    def __init__(
        self,
        token_counter: TokenCounter | None = None,
        context_router: ContextRouter | None = None,
    ) -> None:
        self.token_counter = token_counter or TokenCounter()
        self.context_router = context_router or ContextRouter(self.token_counter)

    async def build(
        self,
        request: AppChatStreamRequest,
        model: ModelConfig,
        system_prompt: str,
        current_user_content: str,
    ) -> list[dict]:
        budget = self._token_budget(model)
        required_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": current_user_content},
        ]
        required_tokens = sum(self.token_counter.message_tokens(message) for message in required_messages)
        optional_budget = max(0, budget.input_budget - required_tokens)

        selection = await self.context_router.route(request, model)
        self._record_context_selection(request, selection)
        optional_messages = self._pack_optional_messages(optional_budget, selection)
        return [required_messages[0], *optional_messages, required_messages[1]]

    def _token_budget(self, model: ModelConfig) -> TokenBudget:
        params = model.model_params or {}
        return TokenBudget(
            context_window=self._int_param(
                params,
                ("contextWindow", "context_window", "maxContextTokens"),
                self.DEFAULT_CONTEXT_WINDOW,
            ),
            max_output_tokens=self._int_param(
                params,
                ("maxOutputTokens", "max_output_tokens", "maxTokens", "max_tokens"),
                self.DEFAULT_MAX_OUTPUT_TOKENS,
            ),
            reasoning_reserve=self._int_param(
                params,
                ("reasoningReserve", "reasoning_reserve"),
                self.DEFAULT_REASONING_RESERVE,
            ),
            safety_margin=self._int_param(
                params,
                ("safetyMargin", "safety_margin"),
                self.DEFAULT_SAFETY_MARGIN,
            ),
        )

    def _pack_optional_messages(
        self,
        budget: int,
        selection: ContextSelection,
    ) -> list[dict]:
        packed: list[dict] = []
        used_tokens = 0

        summary = self._summary_message(selection)
        if summary:
            used_tokens = self._append_with_truncation(packed, summary, used_tokens, budget, min_chars=600)

        fragment_message = self._fragment_message(selection, max_chars_per_fragment=1800)
        if fragment_message:
            used_tokens = self._append_with_truncation(
                packed,
                fragment_message,
                used_tokens,
                budget,
                min_chars=1200,
            )

        recent_messages = selection.selected_recent_messages
        packed_recent = self._pack_recent_messages(recent_messages, max(0, budget - used_tokens))
        packed.extend(packed_recent)
        return packed

    def _summary_message(self, selection: ContextSelection) -> dict | None:
        if not selection.summary_text:
            return None
        version_text = f"（context_version={selection.context_version}）" if selection.context_version is not None else ""
        return {"role": "system", "content": f"{selection.summary_label}{version_text}：\n{selection.summary_text}"}

    def _fragment_message(
        self,
        selection: ContextSelection,
        max_chars_per_fragment: int,
    ) -> dict | None:
        lines = []
        for fragment in selection.selected_fragments:
            text = self._fragment_text(fragment, max_chars=max_chars_per_fragment)
            if text:
                lines.append(text)
        if not lines:
            return None
        return {"role": "system", "content": "可用上下文片段：\n" + "\n\n".join(lines)}

    def _fragment_text(self, fragment: ContextFragment, max_chars: int) -> str:
        text = (fragment.text or "").strip()
        if not text:
            return ""
        label = fragment.type or "fragment"
        return f"[{label}] {self._truncate_text(text, max_chars)}"

    def _record_context_selection(
        self,
        request: AppChatStreamRequest,
        selection: ContextSelection,
    ) -> None:
        metadata = request.context_source.summary.metadata or {}
        metadata["attachmentSelection"] = selection.attachment_selection
        metadata["contextSelection"] = selection.model_dump(
            by_alias=True,
            exclude={"selected_fragments", "selected_recent_messages"},
        )
        request.context_source.summary.metadata = metadata

    def _pack_recent_messages(self, messages: list[dict], budget: int) -> list[dict]:
        packed_reversed: list[dict] = []
        used_tokens = 0
        for message in reversed(messages):
            token_count = self.token_counter.message_tokens(message)
            if used_tokens + token_count <= budget:
                packed_reversed.append(message)
                used_tokens += token_count
                continue
            remaining = budget - used_tokens
            if remaining <= 64:
                break
            truncated = {
                **message,
                "content": self._fit_text_to_tokens(message["content"], remaining - 4, min_chars=400),
            }
            if truncated["content"]:
                packed_reversed.append(truncated)
            break
        return list(reversed(packed_reversed))

    def _append_with_truncation(
        self,
        messages: list[dict],
        message: dict,
        used_tokens: int,
        budget: int,
        *,
        min_chars: int,
    ) -> int:
        token_count = self.token_counter.message_tokens(message)
        if used_tokens + token_count <= budget:
            messages.append(message)
            return used_tokens + token_count
        remaining = budget - used_tokens
        if remaining <= 64:
            return used_tokens
        truncated = {
            **message,
            "content": self._fit_text_to_tokens(message["content"], remaining - 4, min_chars=min_chars),
        }
        if not truncated["content"]:
            return used_tokens
        messages.append(truncated)
        return used_tokens + self.token_counter.message_tokens(truncated)

    def _fit_text_to_tokens(self, text: str, token_budget: int, *, min_chars: int) -> str:
        if token_budget <= 0:
            return ""
        if self.token_counter.count(text) <= token_budget:
            return text
        max_chars = max(min_chars, token_budget * 2)
        return self._truncate_text(text, max_chars)

    def _truncate_text(self, text: str, max_chars: int) -> str:
        value = text.strip()
        if len(value) <= max_chars:
            return value
        return f"{value[:max_chars].rstrip()}\n[内容已按 token budget 截断]"

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
