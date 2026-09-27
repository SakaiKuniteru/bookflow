from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.core.exceptions import dang_ky_exception_handlers
from app.core.logging import cau_hinh_logging
from app.core.rate_limit import RateLimiter, tao_rate_limiter

settings = get_settings()
cau_hinh_logging(settings.app_log_level)
rate_limiter = tao_rate_limiter(settings)

@asynccontextmanager
async def lifespan(application: FastAPI):
    yield

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
        "worker_enabled": settings.worker_enabled
    }