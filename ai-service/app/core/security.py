import secrets
from fastapi import HTTPException, status
from app.core.config import Settings

def kiem_tra_internal_token(token: str | None, settings: Settings) -> None:
    token_hop_le = settings.backend_internal_token.strip()
    if not token_hop_le:
        if settings.app_env == "production":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI Service chưa được cấu hình internal token"
            )
        return
    if not token or not secrets.compare_digest(token, token_hop_le):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Internal token không hợp lệ"
        )