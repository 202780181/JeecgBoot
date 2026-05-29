from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "AI Orchestrator"
    app_version: str = "0.1.0"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3100"])

    jeecg_base_url: str = "http://localhost:8080/jeecg-boot"
    jeecg_admin_token: Optional[str] = None
    spec_workspace: str = ".spec-workspace"
    spec_kit_package: str = "git+https://github.com/github/spec-kit.git"
    spec_kit_timeout_seconds: int = 120


settings = Settings()
