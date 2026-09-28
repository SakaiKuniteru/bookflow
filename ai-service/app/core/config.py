from __future__ import annotations
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    app_name: str = "BookFlow AI Service"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8001
    app_debug: bool = False
    app_log_level: str = "INFO"
    backend_base_url: str = ""
    backend_internal_token: str = ""
    backend_request_timeout: float = 30.0
    database_url: str = ""
    database_pool_min_size: int = Field(default=1, ge=0)
    database_pool_max_size: int = Field(default=10, ge=1)
    redis_url: str = ""
    llm_provider: str = ""
    llm_model: str = ""
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_timeout: float = 60.0
    embedding_provider: str = ""
    embedding_model: str = ""
    embedding_api_key: str = ""
    embedding_base_url: str = ""
    embedding_dimension: int = Field(default=1536, ge=1)
    embedding_timeout: float = 60.0
    ai_max_context_length: int = Field(default=12000, ge=1000)
    ai_max_response_tokens: int = Field(default=2000, ge=100)
    ai_temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    ai_tools_enabled: bool = False
    ai_assistant_timeout: float = 60.0
    rate_limit_enabled: bool = True
    rate_limit_requests: int = Field(default=60, ge=1)
    rate_limit_window_seconds: int = Field(default=60, ge=1)
    storage_endpoint: str = ""
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_bucket: str = "bookflow-ai"
    worker_enabled: bool = False
    worker_concurrency: int = Field(default=2, ge=1)
    worker_poll_timeout: int = Field(default=5, ge=1)
    worker_heartbeat_interval: int = Field(default=15, ge=1)
    queue_name: str = "bookflow:ai"
def kiem_tra_cau_hinh(settings: Settings) -> None:
    errors: list[str] = []
    if not settings.backend_base_url.strip():
        errors.append("BACKEND_BASE_URL")
    if not settings.backend_internal_token.strip():
        errors.append("BACKEND_INTERNAL_TOKEN")
    if not settings.database_url.strip():
        errors.append("DATABASE_URL")
    if not settings.redis_url.strip():
        errors.append("REDIS_URL")
    if settings.database_pool_min_size > settings.database_pool_max_size:
        errors.append("DATABASE_POOL_MIN_SIZE phải nhỏ hơn hoặc bằng DATABASE_POOL_MAX_SIZE")
    if settings.worker_enabled and not settings.embedding_provider.strip():
        errors.append("EMBEDDING_PROVIDER khi WORKER_ENABLED=true")
    if settings.worker_enabled and not settings.storage_endpoint.strip():
        errors.append("STORAGE_ENDPOINT khi WORKER_ENABLED=true")
    if errors:
        raise ValueError("Cấu hình AI Service không hợp lệ: " + ", ".join(errors))
@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()