from __future__ import annotations
from fastapi import Header, HTTPException
from app.core.config import get_settings
def _lay_bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return ""
    return parts[1].strip()
def xac_thuc_internal(
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> bool:
    settings = get_settings()
    expected = str(settings.backend_internal_token or "").strip()
    provided = str(x_internal_token or "").strip() or _lay_bearer_token(authorization)
    if not expected:
        raise HTTPException(status_code=503, detail="AI Service chưa cấu hình internal token.")
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Internal token không hợp lệ.")
    return True