from __future__ import annotations
from uuid import uuid4
from fastapi import Depends, Header, Request
from app.core.config import Settings, get_settings
from app.core.security import xac_thuc_internal
def lay_settings() -> Settings:
    return get_settings()
def get_internal_request_context(
    request: Request,
    x_request_id: str | None = Header(default=None, alias="X-Request-Id"),
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
    _: bool = Depends(xac_thuc_internal),
) -> dict[str, str | bool]:
    request_id = str(x_request_id or getattr(request.state, "request_id", "") or uuid4())
    trace_id = str(x_trace_id or getattr(request.state, "trace_id", "") or request_id)
    return {
        "request_id": request_id,
        "trace_id": trace_id,
        "internal_authenticated": True,
    }
__all__ = [
    "lay_settings",
    "xac_thuc_internal",
    "get_internal_request_context",
]