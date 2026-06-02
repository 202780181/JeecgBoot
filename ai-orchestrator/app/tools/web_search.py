from html import unescape
import re
from typing import Any
from urllib.parse import parse_qs, quote_plus, unquote, urljoin, urlparse

import httpx

from app.core.config import settings
from app.tools.base import BaseTool, ToolResult, ToolSpec


class WebSearchTool(BaseTool):
    spec = ToolSpec(
        name="web_search",
        description="搜索网页并返回标题、链接和摘要。适合查询实时信息、新闻、价格、版本、官方文档和网页资料。",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"},
                "max_results": {
                    "type": "integer",
                    "description": "最多返回结果数量，默认 5，最大 10",
                    "minimum": 1,
                    "maximum": 10,
                },
            },
            "required": ["query"],
        },
    )

    def __init__(
        self,
        provider: str | None = None,
        api_host: str | None = None,
        api_key: str | None = None,
        timeout: int | None = None,
        max_results: int | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.provider = (provider or settings.web_search_provider or "duckduckgo").lower()
        self.api_host = settings.web_search_api_host if api_host is None else api_host
        self.api_key = settings.web_search_api_key if api_key is None else api_key
        self.timeout = timeout or settings.web_search_timeout_seconds
        self.max_results = max_results or settings.web_search_max_results
        self.transport = transport

    def call_title(self, tool_input: dict[str, Any]) -> str:
        query = str(tool_input.get("query") or "").strip()
        return f"搜索网页：{query}" if query else "搜索网页"

    async def run(self, tool_input: dict[str, Any]) -> ToolResult:
        query = str(tool_input.get("query") or "").strip()
        if not query:
            raise ValueError("联网搜索关键词不能为空")
        max_results = self._normalize_max_results(tool_input.get("max_results"))
        if self.provider == "duckduckgo":
            results = await self._search_duckduckgo(query, max_results)
        elif self.provider == "tavily":
            results = await self._search_tavily(query, max_results)
        elif self.provider == "brave":
            results = await self._search_brave(query, max_results)
        else:
            raise ValueError(f"不支持的联网搜索 provider：{self.provider}")
        return ToolResult(
            tool_name=self.spec.name,
            result={
                "query": query,
                "provider": self.provider,
                "results": results,
            },
        )

    async def _search_duckduckgo(self, query: str, max_results: int) -> list[dict[str, Any]]:
        url = f"{self._api_host('https://duckduckgo.com')}/html/"
        headers = {
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "Mozilla/5.0 AI-Orchestrator/0.1",
        }
        async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport, follow_redirects=True) as client:
            response = await client.get(url, params={"q": query}, headers=headers)
        response.raise_for_status()
        return self._parse_duckduckgo_html(response.text, max_results)

    async def _search_tavily(self, query: str, max_results: int) -> list[dict[str, Any]]:
        if not self.api_key:
            raise ValueError("请配置 WEB_SEARCH_API_KEY")
        url = f"{self._api_host('https://api.tavily.com')}/search"
        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
            "include_answer": False,
        }
        async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport) as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()
        body = response.json()
        return [
            self._result_item(
                title=item.get("title"),
                url=item.get("url"),
                snippet=item.get("content"),
                source="Tavily",
            )
            for item in (body.get("results") or [])[:max_results]
            if item.get("url")
        ]

    async def _search_brave(self, query: str, max_results: int) -> list[dict[str, Any]]:
        if not self.api_key:
            raise ValueError("请配置 WEB_SEARCH_API_KEY")
        url = f"{self._api_host('https://api.search.brave.com')}/res/v1/web/search"
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.api_key,
        }
        async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport) as client:
            response = await client.get(url, params={"q": query, "count": max_results}, headers=headers)
        response.raise_for_status()
        body = response.json()
        return [
            self._result_item(
                title=item.get("title"),
                url=item.get("url"),
                snippet=item.get("description"),
                source="Brave Search",
            )
            for item in ((body.get("web") or {}).get("results") or [])[:max_results]
            if item.get("url")
        ]

    def _parse_duckduckgo_html(self, html: str, max_results: int) -> list[dict[str, Any]]:
        pattern = re.compile(
            r'<a[^>]+class="result__a"[^>]+href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>.*?'
            r'<a[^>]+class="result__snippet"[^>]*>(?P<snippet>.*?)</a>',
            re.DOTALL,
        )
        results: list[dict[str, Any]] = []
        for match in pattern.finditer(html):
            results.append(
                self._result_item(
                    title=self._clean_html(match.group("title")),
                    url=self._normalize_result_url(unescape(match.group("url")), "https://duckduckgo.com"),
                    snippet=self._clean_html(match.group("snippet")),
                    source="DuckDuckGo",
                )
            )
            if len(results) >= max_results:
                break
        return results

    def _result_item(
        self,
        *,
        title: Any,
        url: Any,
        snippet: Any,
        source: str,
    ) -> dict[str, Any]:
        return {
            "title": str(title or "").strip(),
            "url": str(url or "").strip(),
            "snippet": str(snippet or "").strip(),
            "source": source,
        }

    def _normalize_max_results(self, value: Any) -> int:
        try:
            count = int(value or self.max_results or 5)
        except (TypeError, ValueError):
            count = 5
        return min(max(count, 1), 10)

    def _api_host(self, default_host: str) -> str:
        api_host = self.api_host or default_host
        if not urlparse(api_host).scheme:
            api_host = f"https://{api_host}"
        return api_host.rstrip("/")

    def _normalize_result_url(self, value: str, base_url: str = "") -> str:
        url = str(value or "").strip()
        if not url:
            return ""
        parsed = urlparse(url)
        if not parsed.scheme and base_url:
            url = urljoin(base_url, url)
            parsed = urlparse(url)
        query = parse_qs(parsed.query)
        if "uddg" in query and query["uddg"]:
            return unquote(query["uddg"][0]).strip()
        return url

    def _clean_html(self, value: str) -> str:
        text = re.sub(r"<[^>]+>", "", value)
        text = unescape(text)
        return re.sub(r"\s+", " ", text).strip()


def build_search_query(text: str) -> str:
    return quote_plus(text.strip())
