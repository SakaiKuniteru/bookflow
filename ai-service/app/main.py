from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from uuid import uuid4
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.config import get_settings, kiem_tra_cau_hinh
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
settings = get_settings()
kiem_tra_cau_hinh(settings)
cau_hinh_logging(settings.app_log_level)
logger = logging.getLogger("bookflow-ai")
rate_limiter = tao_rate_limiter(settings)
postgres = tao_postgres_client(settings)
redis = tao_redis_client(settings)
storage = tao_storage_client(settings)
backend = tao_backend_client(settings)
llm = tao_llm_provider(settings)
embedding = tao_embedding_provider(settings)
queue = tao_queue_connection(settings)
dispatcher = QueueDispatcher(queue)
from app.api.health import router as health_router
from app.api.internal.cong_viec import router as cong_viec_router
from app.api.internal.nguon_du_lieu import router as nguon_du_lieu_router
from app.api.internal.tim_kiem import router as tim_kiem_router
from app.api.internal.goi_y import router as goi_y_router
from app.api.internal.tro_ly import router as tro_ly_router
from app.api.internal.phan_hoi import router as phan_hoi_router
def _tao_health_checks() -> dict[str, object]:
    return {
        "postgres": postgres.kiem_tra_ket_noi,
        "redis": redis.ping,
        "storage": storage.kiem_tra_ket_noi,
        "backend": backend.kiem_tra_ket_noi,
        "llm": llm.kiem_tra_ket_noi,
        "embedding": embedding.kiem_tra_ket_noi,
        "queue": queue.ping,
    }
@asynccontextmanager
async def lifespan(application: FastAPI):
    initialized: list[object] = []
    try:
        logger.info("AI Service startup: PostgreSQL")
        await postgres.khoi_tao()
        initialized.append(postgres)
        logger.info("AI Service startup: Redis")
        await redis.khoi_tao()
        initialized.append(redis)
        logger.info("AI Service startup: Storage")
        await storage.khoi_tao()
        initialized.append(storage)
        logger.info("AI Service startup: Backend")
        await backend.khoi_tao()
        initialized.append(backend)
        logger.info("AI Service startup: LLM")
        await llm.khoi_tao()
        initialized.append(llm)
        logger.info("AI Service startup: Embedding")
        await embedding.khoi_tao()
        initialized.append(embedding)
        logger.info("AI Service startup: Queue")
        await queue.khoi_tao()
        initialized.append(queue)
        application.state.settings = settings
        application.state.postgres = postgres
        application.state.redis = redis
        application.state.storage = storage
        application.state.backend = backend
        application.state.llm = llm
        application.state.embedding = embedding
        application.state.queue = queue
        application.state.dispatcher = dispatcher
        application.state.health_checks = _tao_health_checks()
        logger.info("AI Service startup completed")
        yield
    finally:
        logger.info("AI Service shutdown started")
        for dependency in reversed(initialized):
            try:
                await dependency.dong()
            except Exception:
                logger.exception("Không thể đóng dependency: %s", type(dependency).__name__)
        logger.info("AI Service shutdown completed")
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.app_debug,
    lifespan=lifespan,
)
dang_ky_exception_handlers(app)
@app.middleware("http")
async def middleware_request(request: Request, call_next):
    request_id = str(request.headers.get("X-Request-Id") or uuid4())
    trace_id = str(request.headers.get("X-Trace-Id") or request_id)
    request.state.request_id = request_id
    request.state.trace_id = trace_id
    excluded = {
        "/",
        "/health",
        "/health/live",
        "/health/ready",
        "/docs",
        "/redoc",
        "/openapi.json",
    }
    if settings.rate_limit_enabled and request.url.path not in excluded:
        try:
            rate_limiter.kiem_tra(request)
        except Exception as error:
            return JSONResponse(status_code=429, content={"success": False, "request_id": request_id, "error": {"code": "RATE_LIMIT", "message": str(error)}})
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Trace-Id"] = trace_id
    return response
@app.get("/")
async def root():
    return {
        "success": True,
        "data": {
            "service": settings.app_name,
            "version": "0.1.0",
            "environment": settings.app_env,
            "status": "running",
        },
    }
@app.get("/health")
async def health():
    return {
        "success": True,
        "data": {
            "service": settings.app_name,
            "version": "0.1.0",
            "environment": settings.app_env,
            "worker_enabled": settings.worker_enabled,
        },
    }
app.include_router(health_router)
app.include_router(cong_viec_router)
app.include_router(nguon_du_lieu_router)
app.include_router(tim_kiem_router)
app.include_router(goi_y_router)
app.include_router(tro_ly_router, prefix="/internal/tro-ly")
app.include_router(phan_hoi_router)