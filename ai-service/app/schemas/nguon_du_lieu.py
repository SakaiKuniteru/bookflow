from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import Field
from app.schemas.dung_chung import Metadata, SchemaCoSo

class LoaiNguonDuLieu(str, Enum):
    BOOK = "BOOK"
    DOCUMENT = "DOCUMENT"
    FILE = "FILE"
    BOOK_METADATA = "BOOK_METADATA"
    DESCRIPTION = "DESCRIPTION"
    INTERNAL_DOCUMENT = "INTERNAL_DOCUMENT"
    OTHER = "OTHER"

class PhamViTruyCap(str, Enum):
    PUBLIC = "PUBLIC"
    TENANT = "TENANT"
    BRANCH = "BRANCH"
    ROLE = "ROLE"
    USER = "USER"
    PRIVATE = "PRIVATE"

class TrangThaiChiMuc(str, Enum):
    CHUA_INDEX = "CHUA_INDEX"
    DANG_INDEX = "DANG_INDEX"
    DA_INDEX = "DA_INDEX"
    LOI = "LOI"
    XOA = "XOA"

class QuyenTruyCapNguon(SchemaCoSo):
    visibility: PhamViTruyCap = PhamViTruyCap.TENANT
    don_vi_ids: list[int] = Field(default_factory=list)
    chi_nhanh_ids: list[int] = Field(default_factory=list)
    role_names: list[str] = Field(default_factory=list)
    user_ids: list[int] = Field(default_factory=list)
    permission_codes: list[str] = Field(default_factory=list)

class NguonDuLieuTao(SchemaCoSo):
    source_type: LoaiNguonDuLieu
    entity_id: int | str | None = None
    file_id: int | None = Field(default=None, ge=1)
    title: str = Field(min_length=1, max_length=1000)
    content: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    access_scope: QuyenTruyCapNguon
    version: int = Field(default=1, ge=1)
    checksum: str | None = Field(default=None, max_length=128)

class NguonDuLieuCapNhatChiMuc(SchemaCoSo):
    index_status: TrangThaiChiMuc
    indexed_at: datetime | None = None
    index_version: int | None = Field(default=None, ge=1)
    chunk_count: int = Field(default=0, ge=0)
    error: str | None = Field(default=None, max_length=2000)

class NguonDuLieu(SchemaCoSo):
    source_id: str = Field(min_length=1, max_length=200)
    source_type: LoaiNguonDuLieu
    entity_id: int | str | None = None
    file_id: int | None = Field(default=None, ge=1)
    title: str = Field(min_length=1, max_length=1000)
    content: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    access_scope: QuyenTruyCapNguon
    version: int = Field(default=1, ge=1)
    checksum: str | None = Field(default=None, max_length=128)
    index_status: TrangThaiChiMuc = TrangThaiChiMuc.CHUA_INDEX
    index_version: int | None = Field(default=None, ge=1)
    chunk_count: int = Field(default=0, ge=0)
    indexed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None