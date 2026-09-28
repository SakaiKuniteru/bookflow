from __future__ import annotations
from typing import Any, Awaitable, Callable

JOB_TYPE = "EXTRACT_INFORMATION"
WorkerService = Callable[[dict[str, Any], Callable[[dict[str, Any]], Awaitable[None]], dict[str, Any]], Awaitable[dict[str, Any]]]

def _kiem_tra_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("EXTRACT_INFORMATION payload phải là object.")
    for field in ("source_id", "file_id", "version"):
        if payload.get(field) in (None, ""):
            raise ValueError(f"EXTRACT_INFORMATION thiếu {field}.")
    if not isinstance(payload["version"], int) or payload["version"] < 1:
        raise ValueError("EXTRACT_INFORMATION version không hợp lệ.")
    return payload

async def xu_ly(
    job: dict[str, Any],
    dich_vu: WorkerService,
    cap_nhat_tien_do: Callable[[dict[str, Any]], Awaitable[None]],
    worker_context: dict[str, Any],
) -> dict[str, Any]:
    payload = _kiem_tra_payload(job.get("payload"))
    return await dich_vu(payload, cap_nhat_tien_do, worker_context)