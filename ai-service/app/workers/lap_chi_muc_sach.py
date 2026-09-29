from __future__ import annotations
from typing import Any, Awaitable, Callable

JOB_TYPE = "INDEX_BOOK"
WorkerService = Callable[[dict[str, Any], Callable[[dict[str, Any]], Awaitable[None]], dict[str, Any]], Awaitable[dict[str, Any]]]

def _kiem_tra_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("INDEX_BOOK payload phải là object.")
    for field in ("source_id", "book_id", "don_vi_id", "version"):
        if payload.get(field) in (None, ""):
            raise ValueError(f"INDEX_BOOK thiếu {field}.")
    if not isinstance(payload["version"], int) or payload["version"] < 1:
        raise ValueError("INDEX_BOOK version không hợp lệ.")
    if "checksum" in payload and payload["checksum"] is not None and not isinstance(payload["checksum"], str):
        raise ValueError("INDEX_BOOK checksum phải là string.")
    if "request_id" in payload and payload["request_id"] is not None and not isinstance(payload["request_id"], str):
        raise ValueError("INDEX_BOOK request_id phải là string.")
    return payload

async def xu_ly(
    job: dict[str, Any],
    dich_vu: WorkerService,
    cap_nhat_tien_do: Callable[[dict[str, Any]], Awaitable[None]],
    worker_context: dict[str, Any],
) -> dict[str, Any]:
    payload = _kiem_tra_payload(job.get("payload"))
    return await dich_vu(payload, cap_nhat_tien_do, worker_context)