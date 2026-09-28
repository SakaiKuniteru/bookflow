from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

class SchemaCoSo(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        populate_by_name=True,
        use_enum_values=True,
        validate_assignment=True
    )

class TrangThaiXuLy(str, Enum):
    DANG_XU_LY = "DANG_XU_LY"
    THANH_CONG = "THANH_CONG"
    THAT_BAI = "THAT_BAI"

class RequestContext(SchemaCoSo):
    request_id: str = Field(min_length=1, max_length=100)
    user_id: int | None = Field(default=None, ge=1)
    don_vi_id: int | None = Field(default=None, ge=1)
    chi_nhanh_id: int | None = Field(default=None, ge=1)
    role: str | None = Field(default=None, max_length=100)
    permissions: list[str] = Field(default_factory=list)

class YeuCauPhanTrang(SchemaCoSo):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)

class KetQuaPhanTrang(SchemaCoSo):
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=100)
    total: int = Field(default=0, ge=0)

class ChiTietLoi(SchemaCoSo):
    code: str | None = Field(default=None, max_length=100)
    message: str = Field(min_length=1, max_length=1000)
    field: str | None = Field(default=None, max_length=200)
    value: Any | None = None

class ThongTinLoi(SchemaCoSo):
    code: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=1000)
    details: list[ChiTietLoi] | dict[str, Any] | None = None

class Metadata(SchemaCoSo):
    created_at: datetime | None = None
    updated_at: datetime | None = None

class Citation(SchemaCoSo):
    source_id: str = Field(min_length=1, max_length=200)
    source_type: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=500)
    snippet: str | None = Field(default=None, max_length=5000)
    score: float | None = Field(default=None, ge=0)
    page: int | None = Field(default=None, ge=1)
    url: str | None = Field(default=None, max_length=2000)
    metadata: dict[str, Any] = Field(default_factory=dict)

class KetQuaXuLy(SchemaCoSo):
    success: bool
    status: TrangThaiXuLy
    error: ThongTinLoi | None = None