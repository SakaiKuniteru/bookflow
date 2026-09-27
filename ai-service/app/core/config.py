from functools import lru_cache
from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "BookFlow AI Service"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8001
    app_debug: bool = False
    app_log_level: str = "INFO"
    backend_base_url: str = "http://localhost:3000"
    backend_internal_token: str = ""
    backend_request_timeout: int = 30
    database_url: str = ""
    database_pool_min_size: int = 1
    database_pool_max_size: int = 10
    redis_url: str = "redis://localhost:6379/0"
    llm_provider: str = ""
    llm_model: str = ""
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_timeout: int = 60
    embedding_provider: str = ""
    embedding_model: str = ""
    embedding_api_key: str = ""
    embedding_base_url: str = ""
    embedding_dimension: int | None = None
    ai_max_context_length: int = 12000
    ai_max_response_tokens: int = 2000
    ai_temperature: float = 0.2
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60
    storage_endpoint: str = ""
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_bucket: str = "bookflow-ai"
    worker_enabled: bool = False
    worker_concurrency: int = 2
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    @field_validator("embedding_dimension", mode="before")
    @classmethod
    def xu_ly_embedding_dimension(cls, value: Any) -> int | None:
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return int(value)

    @field_validator("ai_temperature", mode="before")
    @classmethod
    def xu_ly_temperature(cls, value: Any) -> float:
        if value is None or (isinstance(value, str) and not value.strip()):
            return 0.2
        return float(value)

    @field_validator("app_log_level", mode="before")
    @classmethod
    def chuan_hoa_log_level(cls, value: Any) -> str:
        if value is None or not str(value).strip():
            return "INFO"
        return str(value).strip().upper()

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()