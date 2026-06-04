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
    qweather_api_host: Optional[str] = None
    qweather_geo_api_host: Optional[str] = None
    qweather_api_key: Optional[str] = None
    qweather_timeout_seconds: int = 15
    web_search_provider: str = "duckduckgo"
    web_search_api_host: Optional[str] = None
    web_search_api_key: Optional[str] = None
    web_search_timeout_seconds: int = 15
    web_search_max_results: int = 5
    spec_workspace: str = ".spec-workspace"
    spec_kit_package: str = "git+https://github.com/github/spec-kit.git"
    spec_kit_timeout_seconds: int = 120
    builder_workspace_root: str = "ai-builder-workspaces"
    builder_template_path: str = "JeecgUniappTemplet"
    builder_project_root_workspace_id: str = "jeecgboot-root"
    builder_project_root_path: str = "."
    builder_preview_host: str = "127.0.0.1"
    builder_preview_port_start: int = 9300
    builder_preview_port_end: int = 9399
    builder_command_timeout_seconds: int = 180
    max_tool_rounds: int = 24


settings = Settings()
