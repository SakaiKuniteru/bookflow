from __future__ import annotations
from typing import Any, Awaitable, Callable

JOB_TYPE = "INDEX_DOCUMENT"
WorkerService = Callable[[dict[str, Any], Callable[[dict[str, Any]], Awaitable[None]], dict[str, Any]], Awaitable[dict[str, Any]]]

def _kiem_tra_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("INDEX_DOCUMENT payload phải là object.")
    for field in ("source_id", "document_id", "file_id", "don_vi_id", "version"):
        if payload.get(field) in (None, ""):
            raise ValueError(f"INDEX_DOCUMENT thiếu {field}.")
    if not isinstance(payload["version"], int) or payload["version"] < 1:
        raise ValueError("INDEX_DOCUMENT version không hợp lệ.")
    for field in ("file_id", "storage_key", "checksum"):
        if field in payload and payload[field] is not None and not isinstance(payload[field], str):
            raise ValueError(f"INDEX_DOCUMENT {field} phải là string.")
    return payload

async def xu_ly(
    job: dict[str, Any],
    dich_vu: WorkerService,
    cap_nhat_tien_do: Callable[[dict[str, Any]], Awaitable[None]],
    worker_context: dict[str, Any],
) -> dict[str, Any]:
    payload = _kiem_tra_payload(job.get("payload"))
    return await dich_vu(payload, cap_nhat_tien_do, worker_context)