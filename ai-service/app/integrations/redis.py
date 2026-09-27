from redis.asyncio import Redis
from app.core.config import Settings

class RedisClient:
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

    async def ping(self) -> bool:
        if not self.client:
            return False
        try:
            return bool(await self.client.ping())
        except Exception:
            return False

    async def lay(self, key: str) -> str | None:
        if not self.client:
            raise RuntimeError("Redis chưa được khởi tạo")
        return await self.client.get(key)

    async def dat(self, key: str, value: str, ttl: int | None = None) -> bool:
        if not self.client:
            raise RuntimeError("Redis chưa được khởi tạo")
        if ttl is None:
            return bool(await self.client.set(key, value))
        return bool(await self.client.set(key, value, ex=ttl))

    async def xoa(self, key: str) -> int:
        if not self.client:
            raise RuntimeError("Redis chưa được khởi tạo")
        return int(await self.client.delete(key))

redis_client: RedisClient | None = None

def tao_redis_client(settings: Settings) -> RedisClient:
    global redis_client
    if redis_client is None:
        redis_client = RedisClient(settings)
    return redis_client