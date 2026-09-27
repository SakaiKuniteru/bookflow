import json
from typing import Any
from redis.asyncio import Redis
from app.core.config import Settings

class QueueConnection:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: Redis | None = None

    async def khoi_tao(self) -> None:
        if not self.settings.redis_url:
            return
        self.client = Redis.from_url(
            self.settings.redis_url,
            decode_responses=True
        )

    async def dong(self) -> None:
        if self.client:
            await self.client.aclose()
            self.client = None

    def san_sang(self) -> bool:
        return self.client is not None

    async def push(self, queue_name: str, payload: dict[str, Any]) -> int:
        if not self.client:
            raise RuntimeError("Queue Redis chưa được khởi tạo")
        data = json.dumps(payload, ensure_ascii=False)
        return int(await self.client.rpush(queue_name, data))

    async def pop(self, queue_name: str, timeout: int = 0) -> dict[str, Any] | None:
        if not self.client:
            raise RuntimeError("Queue Redis chưa được khởi tạo")
        result = await self.client.blpop(queue_name, timeout=timeout)
        if not result:
            return None
        _, data = result
        return json.loads(data)

    async def length(self, queue_name: str) -> int:
        if not self.client:
            raise RuntimeError("Queue Redis chưa được khởi tạo")
        return int(await self.client.llen(queue_name))

queue_connection: QueueConnection | None = None

def tao_queue_connection(settings: Settings) -> QueueConnection:
    global queue_connection
    if queue_connection is None:
        queue_connection = QueueConnection(settings)
    return queue_connection