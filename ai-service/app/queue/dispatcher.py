from __future__ import annotations
from typing import Any
from app.queue.connection import QueueConnection
class QueueDispatcher:
    def __init__(self, connection: QueueConnection):
        self.connection = connection
    async def dispatch(self, queue_name: str, job: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(job, dict):
            raise ValueError("Queue job phải là object.")
        required = ("job_id", "job_type", "payload", "attempt", "max_attempts")
        for field in required:
            if field not in job:
                raise ValueError(f"Queue job thiếu {field}.")
        message = {
            "job_id": str(job["job_id"]),
            "job_type": str(job["job_type"]),
            "payload": job.get("payload") or {},
            "attempt": int(job["attempt"]),
            "max_attempts": int(job["max_attempts"]),
            "request_id": job.get("request_id"),
            "trace_id": job.get("trace_id"),
        }
        await self.connection.push(queue_name, message)
        return message
    async def receive(self, queue_name: str, timeout: int = 5) -> dict[str, Any] | None:
        return await self.connection.pop(queue_name, timeout=timeout)
    async def ping(self) -> bool:
        return await self.connection.ping()