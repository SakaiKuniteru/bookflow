from enum import Enum
from typing import Any
from pydantic import Field, model_validator
from app.schemas.dung_chung import Citation, RequestContext, SchemaCoSo

class CheDoTimKiem(str, Enum):
    KEYWORD = "KEYWORD"
    VECTOR = "VECTOR"
    HYBRID = "HYBRID"

class BoLocTimKiemSach(SchemaCoSo):
    the_loai_ids: list[int] = Field(default_factory=list)
    tac_gia_ids: list[int] = Field(default_factory=list)
    nha_xuat_ban_ids: list[int] = Field(default_factory=list)
    chi_nhanh_id: int | None = Field(default=None, ge=1)
    dinh_dang: list[str] = Field(default_factory=list)
    ngon_ngu: str | None = Field(default=None, max_length=100)
    nam_xuat_ban_tu: int | None = Field(default=None, ge=0, le=9999)
    nam_xuat_ban_den: int | None = Field(default=None, ge=0, le=9999)
    chi_co_san: bool | None = None

    @model_validator(mode="after")
    def kiem_tra_nam_xuat_ban(self):
        if self.nam_xuat_ban_tu is not None and self.nam_xuat_ban_den is not None and self.nam_xuat_ban_tu > self.nam_xuat_ban_den:
            raise ValueError("nam_xuat_ban_tu không được lớn hơn nam_xuat_ban_den")
        return self

class TimKiemSachRequest(SchemaCoSo):
    query: str = Field(min_length=1, max_length=5000)
    user_context: dict[str, Any] = Field(default_factory=dict)
    filters: BoLocTimKiemSach = Field(default_factory=BoLocTimKiemSach)
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=50)
    search_mode: CheDoTimKiem = CheDoTimKiem.HYBRID

class ThongTinTonSan(SchemaCoSo):
    chi_nhanh_id: int | None = Field(default=None, ge=1)
    chi_nhanh_ten: str | None = Field(default=None, max_length=255)
    co_san: bool | None = None
    so_luong: int | None = Field(default=None, ge=0)
    co_the_muon: bool | None = None
    co_the_thue: bool | None = None

class KetQuaTimKiemSach(SchemaCoSo):
    book_id: int = Field(ge=1)
    score: float = Field(ge=0)
    title: str = Field(min_length=1, max_length=1000)
    matched_by: list[str] = Field(default_factory=list)
    availability: ThongTinTonSan | None = None
    sources: list[Citation] = Field(default_factory=list)

class TimKiemSachResponse(SchemaCoSo):
    query: str
    results: list[KetQuaTimKiemSach] = Field(default_factory=list)
    total: int = Field(default=0, ge=0)
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=50)
    search_mode: CheDoTimKiem

TimKiemRequest = TimKiemSachRequest