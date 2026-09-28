from __future__ import annotations
from typing import Any, Awaitable, Callable

JOB_TYPE = "CLEANUP_INDEX"
WorkerService = Callable[[dict[str, Any], Callable[[dict[str, Any]], Awaitable[None]], dict[str, Any]], Awaitable[dict[str, Any]]]

def _kiem_tra_payload(payload: Any) -> dict[str, Any]:
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise ValueError("CLEANUP_INDEX payload phải là object.")
    if "source_id" in payload and payload["source_id"] is not None and payload["source_id"] == "":
        raise ValueError("CLEANUP_INDEX source_id không hợp lệ.")
    if "before_version" in payload and payload["before_version"] is not None:
        if not isinstance(payload["before_version"], int) or payload["before_version"] < 1:
            raise ValueError("CLEANUP_INDEX before_version không hợp lệ.")
    if "retention_days" in payload and payload["retention_days"] is not None:
        if not isinstance(payload["retention_days"], int) or payload["retention_days"] < 0:
            raise ValueError("CLEANUP_INDEX retention_days không hợp lệ.")
    if "batch_size" in payload and payload["batch_size"] is not None:
        if not isinstance(payload["batch_size"], int) or payload["batch_size"] < 1:
            raise ValueError("CLEANUP_INDEX batch_size không hợp lệ.")
    return payload

async def xu_ly(
    job: dict[str, Any],
    dich_vu: WorkerService,
    cap_nhat_tien_do: Callable[[dict[str, Any]], Awaitable[None]],
    worker_context: dict[str, Any],
) -> dict[str, Any]:
    payload = _kiem_tra_payload(job.get("payload"))
    return await dich_vu(payload, cap_nhat_tien_do, worker_context)