from __future__ import annotations
from typing import Any
from uuid import uuid4
from app.core.config import get_settings
from app.core.exceptions import AIValidationException, AIServiceException
from app.queue.connection import queue_connection
from app.queue.dispatcher import QueueDispatcher
from app.repositories.cong_viec import cong_viec_repository
QUEUE_NAME = get_settings().queue_name
dispatcher = QueueDispatcher(queue_connection)
def _queue_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "job_id": str(job["job_id"]),
        "job_type": str(job["job_type"]),
        "payload": job.get("payload") or {},
        "attempt": int(job.get("attempt") or 1),
        "max_attempts": int(job.get("max_attempts") or 3),
        "request_id": job.get("request_id"),
        "trace_id": job.get("trace_id"),
    }
async def tao(payload: dict[str, Any], request_context: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise AIValidationException("Payload job phải là object.")
    job_type = str(payload.get("job_type") or payload.get("task") or "").strip().upper()
    if not job_type:
        raise AIValidationException("Thiếu job_type.")
    job_payload = payload.get("payload") or {}
    if not isinstance(job_payload, dict):
        raise AIValidationException("payload job phải là object.")
    max_attempts = int(payload.get("max_attempts") or 3)
    idempotency_key = str(payload.get("idempotency_key") or uuid4())
    existing = await cong_viec_repository.tim_theo_idempotency(idempotency_key)
    if existing:
        return existing
    job = await cong_viec_repository.tao(
        job_type=job_type,
        payload=job_payload,
        max_attempts=max_attempts,
        idempotency_key=idempotency_key,
        metadata={
            "request_id": request_context.get("request_id"),
            "trace_id": request_context.get("trace_id"),
            "don_vi_id": payload.get("don_vi_id"),
        },
    )
    if not job:
        raise AIServiceException("Không thể tạo job AI.")
    await dispatcher.dispatch(QUEUE_NAME, _queue_job(job))
    return job
async def lay(job_id: str, request_context: dict[str, Any]) -> dict[str, Any] | None:
    return await cong_viec_repository.lay_theo_id(job_id)