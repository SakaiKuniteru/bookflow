from datetime import datetime, timezone
from typing import Any
from uuid import uuid4
from app.queue.connection import QueueConnection

class QueueDispatcher:
    def __init__(self, connection: QueueConnection):
        self.connection = connection

    async def dispatch(self, queue_name: str, task_name: str, payload: dict[str, Any], max_attempts: int = 3) -> dict[str, Any]:
        job = {
            "id": str(uuid4()),
            "task": task_name,
            "payload": payload,
            "attempt": 0,
            "max_attempts": max_attempts,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.connection.push(queue_name, job)
        return job

    async def receive(self, queue_name: str, timeout: int = 0) -> dict[str, Any] | None:
        return await self.connection.pop(queue_name, timeout=timeout)

    async def retry(self, queue_name: str, job: dict[str, Any]) -> dict[str, Any]:
        job["attempt"] = int(job.get("attempt", 0)) + 1
        job["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.connection.push(queue_name, job)
        return job

    async def queue_length(self, queue_name: str) -> int:
        return await self.connection.length(queue_name)