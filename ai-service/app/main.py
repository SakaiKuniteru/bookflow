from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from app.core.config import get_settings
from app.core.exceptions import dang_ky_exception_handlers
from app.core.logging import cau_hinh_logging
from app.core.rate_limit import tao_rate_limiter
from app.integrations.backend_client import tao_backend_client
from app.integrations.postgres import tao_postgres_client
from app.integrations.redis import tao_redis_client
from app.integrations.storage import tao_storage_client
from app.providers.embeddings import tao_embedding_provider
from app.providers.llm import tao_llm_provider
from app.queue.connection import tao_queue_connection
from app.queue.dispatcher import QueueDispatcher
from app.api.health import router as health_router
from app.api.internal.cong_viec import router as cong_viec_router
from app.api.internal.nguon_du_lieu import router as nguon_du_lieu_router
from app.api.internal.tim_kiem import router as tim_kiem_router
from app.api.internal.goi_y import router as goi_y_router
from app.api.internal.tro_ly import router as tro_ly_router
from app.api.internal.phan_hoi import router as phan_hoi_router

settings = get_settings()
cau_hinh_logging(settings.app_log_level)
rate_limiter = tao_rate_limiter(settings)
postgres = tao_postgres_client(settings)
redis = tao_redis_client(settings)
storage = tao_storage_client(settings)
backend = tao_backend_client(settings)
llm = tao_llm_provider(settings)
embedding = tao_embedding_provider(settings)
queue = tao_queue_connection(settings)
dispatcher = QueueDispatcher(queue)

@asynccontextmanager
async def lifespan(application: FastAPI):
    await postgres.khoi_tao()
    await redis.khoi_tao()
    await storage.khoi_tao()
    await backend.khoi_tao()
    await llm.khoi_tao()
    await embedding.khoi_tao()
    await queue.khoi_tao()
    yield
    await queue.dong()
    await embedding.dong()
    await llm.dong()
    await backend.dong()
    await storage.dong()
    await redis.dong()
    await postgres.dong()
    app.include_router(health_router)
    app.include_router(cong_viec_router)
    app.include_router(nguon_du_lieu_router)
    app.include_router(tim_kiem_router)
    app.include_router(goi_y_router)
    app.include_router(tro_ly_router)
    app.include_router(phan_hoi_router)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="AI Service for BookFlow",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

dang_ky_exception_handlers(app)

@app.middleware("http")
async def middleware_rate_limit(request: Request, call_next):
    if rate_limiter and request.url.path not in {"/", "/health", "/docs", "/redoc", "/openapi.json"}:
        rate_limiter.kiem_tra(request)
    return await call_next(request)

@app.get("/", tags=["Health"])
async def root():
    return {
        "code": 0,
        "message": "BookFlow AI Service đang hoạt động",
        "service": settings.app_name,
        "version": "0.1.0"
    }

@app.get("/health", tags=["Health"])
async def health():
    return {
        "code": 0,
        "message": "OK",
        "service": settings.app_name,
        "environment": settings.app_env,
        "worker_enabled": settings.worker_enabled,
        "integrations": {
            "postgres": postgres.san_sang(),
            "redis": redis.san_sang(),
            "storage": storage.san_sang(),
            "backend": backend.san_sang()
        },
        "providers": {
            "llm": llm.san_sang(),
            "embedding": embedding.san_sang()
        },
        "queue": {
            "redis": queue.san_sang()
        }
    }