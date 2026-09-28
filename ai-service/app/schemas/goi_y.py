from typing import Any
from pydantic import Field
from app.schemas.dung_chung import Citation, RequestContext, SchemaCoSo

class BoLocGoiYSach(SchemaCoSo):
    the_loai_ids: list[int] = Field(default_factory=list)
    tac_gia_ids: list[int] = Field(default_factory=list)
    nha_xuat_ban_ids: list[int] = Field(default_factory=list)
    chi_nhanh_id: int | None = Field(default=None, ge=1)
    dinh_dang: list[str] = Field(default_factory=list)
    ngon_ngu: str | None = Field(default=None, max_length=100)

class GoiYSachRequest(SchemaCoSo):
    user_id: int | None = Field(default=None, ge=1)
    user_context: dict[str, Any] = Field(default_factory=dict)
    context: str | None = Field(default=None, max_length=5000)
    book_id: int | None = Field(default=None, ge=1)
    limit: int = Field(default=10, ge=1, le=10)
    filters: BoLocGoiYSach = Field(default_factory=BoLocGoiYSach)
    metadata: dict[str, Any] = Field(default_factory=dict)

class GoiYSachItem(SchemaCoSo):
    book_id: int = Field(ge=1)
    score: float = Field(ge=0)
    reason: str = Field(min_length=1, max_length=1000)
    explanation: str | None = Field(default=None, max_length=5000)
    sources: list[Citation] = Field(default_factory=list)

class GoiYSachResponse(SchemaCoSo):
    recommendations: list[GoiYSachItem] = Field(default_factory=list)
    total: int = Field(default=0, ge=0)
    context: str | None = None

GoiYRequest = GoiYSachRequest