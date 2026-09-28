from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID
from pydantic import Field
from app.schemas.dung_chung import ChiTietLoi, Metadata, SchemaCoSo, YeuCauPhanTrang, KetQuaPhanTrang

class TrangThaiCongViec(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    RETRYING = "RETRYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class MucDoUuTien(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"

class CongViecTao(SchemaCoSo):
    job_type: str = Field(min_length=1, max_length=100)
    payload: dict[str, Any] = Field(default_factory=dict)
    priority: MucDoUuTien = MucDoUuTien.NORMAL
    max_attempts: int = Field(default=3, ge=1, le=20)
    don_vi_id: int | None = Field(default=None, ge=1)
    chi_nhanh_id: int | None = Field(default=None, ge=1)
    created_by: int | None = Field(default=None, ge=1)
    metadata: dict[str, Any] = Field(default_factory=dict)

class CongViecCapNhat(SchemaCoSo):
    status: TrangThaiCongViec | None = None
    retry_count: int | None = Field(default=None, ge=0)
    error: ChiTietLoi | None = None
    result: Any | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    metadata: dict[str, Any] | None = None

class CongViec(SchemaCoSo):
    job_id: UUID
    job_type: str = Field(min_length=1, max_length=100)
    status: TrangThaiCongViec
    payload: dict[str, Any] = Field(default_factory=dict)
    priority: MucDoUuTien
    retry_count: int = Field(default=0, ge=0)
    max_attempts: int = Field(default=3, ge=1, le=20)
    error: ChiTietLoi | None = None
    result: Any | None = None
    don_vi_id: int | None = Field(default=None, ge=1)
    chi_nhanh_id: int | None = Field(default=None, ge=1)
    created_by: int | None = Field(default=None, ge=1)
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

class DanhSachCongViec(SchemaCoSo):
    items: list[CongViec] = Field(default_factory=list)
    pagination: KetQuaPhanTrang

class CongViecLoc(YeuCauPhanTrang):
    job_type: str | None = Field(default=None, max_length=100)
    status: TrangThaiCongViec | None = None
    priority: MucDoUuTien | None = None
    don_vi_id: int | None = Field(default=None, ge=1)
    chi_nhanh_id: int | None = Field(default=None, ge=1)

CongViecTaoRequest = CongViecTao