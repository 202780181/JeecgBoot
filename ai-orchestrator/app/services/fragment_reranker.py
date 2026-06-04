from app.models.schemas import ContextFragment
from app.services.token_counter import TokenCounter


class FragmentReranker:
    TYPE_BASE_SCORE = {
        "workspace_snapshot": 0.72,
        "file_change": 0.68,
        "build_result": 0.66,
        "preview_url": 0.62,
        "skill_result": 0.55,
        "tool_result": 0.5,
        "source": 0.45,
        "context_selection": 0.35,
        "error": 0.3,
        "attachment_summary": 0.25,
    }
    INTENT_BOOSTS = {
        "skill_result": ("skill", "skills", "spec", "plan", "task", "任务", "计划", "规范", "继续刚才"),
        "tool_result": ("工具", "执行结果", "天气", "tool", "result"),
        "source": ("来源", "网页", "链接", "新闻", "搜索", "source", "url"),
        "context_selection": ("上下文", "选择", "为什么", "context"),
        "workspace_snapshot": ("workspace", "工作区", "项目", "继续", "模板", "文件结构", "workspaceId"),
        "file_change": ("修改", "写入", "文件", "patch", "变更", "代码", "页面"),
        "build_result": ("构建", "build", "h5", "报错", "日志", "部署", "编译"),
        "preview_url": ("预览", "preview", "地址", "url", "打开", "访问"),
    }

    def __init__(self, token_counter: TokenCounter | None = None) -> None:
        self.token_counter = token_counter or TokenCounter()

    def rerank(self, input_text: str, fragments: list[ContextFragment], limit: int = 20) -> list[ContextFragment]:
        deduped = self._dedupe(fragments)
        ranked = sorted(
            deduped,
            key=lambda fragment: self._score(input_text, fragment),
            reverse=True,
        )
        return ranked[:limit]

    def _score(self, input_text: str, fragment: ContextFragment) -> float:
        return (
            self.TYPE_BASE_SCORE.get(fragment.type, 0.1)
            + self._retrieval_score(fragment)
            + self._intent_boost(input_text, fragment)
            + self._explicit_text_overlap(input_text, fragment)
            + self._recency_boost(fragment)
            - self._token_cost_penalty(fragment)
        )

    def _retrieval_score(self, fragment: ContextFragment) -> float:
        value = getattr(fragment, "score", None)
        if value is None:
            value = (fragment.metadata or {}).get("score")
        try:
            score = float(value)
        except (TypeError, ValueError):
            return 0.0
        if score > 1:
            return min(score / 20, 0.5)
        return min(score, 1.0) * 0.5

    def _intent_boost(self, input_text: str, fragment: ContextFragment) -> float:
        text = (input_text or "").lower()
        for fragment_type, keywords in self.INTENT_BOOSTS.items():
            if fragment.type != fragment_type:
                continue
            if any(keyword.lower() in text for keyword in keywords):
                return 0.45
        return 0.0

    def _explicit_text_overlap(self, input_text: str, fragment: ContextFragment) -> float:
        terms = self._terms(input_text)
        if not terms:
            return 0.0
        haystack = f"{fragment.text} {fragment.metadata}".lower()
        hits = sum(1 for term in terms if term in haystack)
        return min(hits * 0.08, 0.4)

    def _recency_boost(self, fragment: ContextFragment) -> float:
        return 0.08 if fragment.create_time else 0.0

    def _token_cost_penalty(self, fragment: ContextFragment) -> float:
        tokens = fragment.token_count if fragment.token_count is not None else self.token_counter.count(fragment.text)
        return min(tokens / 8000, 0.35)

    def _dedupe(self, fragments: list[ContextFragment]) -> list[ContextFragment]:
        seen: set[str] = set()
        result: list[ContextFragment] = []
        for fragment in fragments:
            key = self._key(fragment)
            if key in seen:
                continue
            seen.add(key)
            result.append(fragment)
        return result

    def _key(self, fragment: ContextFragment) -> str:
        metadata = fragment.metadata or {}
        workspace_id = metadata.get("workspaceId")
        if workspace_id:
            path = metadata.get("path")
            changed_files = metadata.get("changedFiles")
            if path:
                return f"{fragment.type}:workspace:{workspace_id}:path:{path}"
            if changed_files:
                return f"{fragment.type}:workspace:{workspace_id}:changed:{changed_files}"
            preview_url = metadata.get("previewUrl")
            if preview_url:
                return f"{fragment.type}:workspace:{workspace_id}:preview:{preview_url}"
            return f"{fragment.type}:workspace:{workspace_id}"
        url = metadata.get("url") or metadata.get("path")
        if url:
            return f"{fragment.type}:url:{url}"
        return f"{fragment.type}:message:{fragment.message_id or ''}:text:{hash((fragment.text or '').strip())}"

    def _terms(self, text: str) -> list[str]:
        normalized = "".join(char.lower() if char.isalnum() else " " for char in text or "")
        return [term for term in normalized.split() if len(term) >= 2]
