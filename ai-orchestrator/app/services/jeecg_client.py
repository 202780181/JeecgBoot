import json

import httpx

from app.core.config import settings
from app.models.schemas import ModelConfig, ModelCredential, UserContext


class JeecgClient:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.jeecg_base_url).rstrip("/")

    async def get_model_config(self, model_id: str | None, user_context: UserContext) -> ModelConfig:
        if not model_id:
            raise ValueError("请选择 AI 模型")
        return await self._fetch_model_config({"id": model_id}, user_context)

    async def get_embedding_model_config(self, model_id: str | None, user_context: UserContext) -> ModelConfig:
        params = {"id": model_id} if model_id else {"modelType": "EMBED"}
        return await self._fetch_model_config(params, user_context)

    async def _fetch_model_config(self, params: dict, user_context: UserContext) -> ModelConfig:
        headers = self._headers(user_context)
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}/airag/airagModel/orchestrator/config",
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            payload = response.json()

        if not payload.get("success"):
            raise ValueError(payload.get("message") or "AI 模型配置读取失败")
        result = payload.get("result") or {}
        credential = result.get("credential") or {}
        if isinstance(credential, str):
            credential = json.loads(credential) if credential else {}
        model_params = result.get("modelParams") or result.get("model_params") or {}
        if isinstance(model_params, str):
            model_params = json.loads(model_params) if model_params else {}

        api_key = credential.get("apiKey") or credential.get("api_key")
        return ModelConfig(
            id=result.get("id") or params.get("id") or "",
            provider=result.get("provider"),
            model_name=result.get("modelName") or result.get("model_name"),
            base_url=result.get("baseUrl") or result.get("base_url"),
            credential=ModelCredential(
                api_key=api_key,
                secret_key=credential.get("secretKey") or credential.get("secret_key"),
                http_version_one=credential.get("httpVersionOne") == 1
                or credential.get("http_version_one") is True,
            ),
            model_params=model_params,
        )

    def _headers(self, user_context: UserContext) -> dict[str, str]:
        headers: dict[str, str] = {}
        token = user_context.token or settings.jeecg_admin_token
        if token:
            headers["X-Access-Token"] = token
        if user_context.tenant_id:
            headers["tenant-id"] = user_context.tenant_id
        return headers
