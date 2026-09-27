import time
from collections import defaultdict, deque
from threading import Lock
from fastapi import Request
from app.core.config import Settings
from app.core.exceptions import AIRateLimitException

class RateLimiter:
    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window_seconds = window_seconds
        self._records: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _lay_key(self, request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    def kiem_tra(self, request: Request) -> None:
        key = self._lay_key(request)
        now = time.monotonic()
        with self._lock:
            records = self._records[key]
            while records and now - records[0] >= self.window_seconds:
                records.popleft()
            if len(records) >= self.requests:
                raise AIRateLimitException()
            records.append(now)

    def don_dep(self) -> None:
        now = time.monotonic()
        with self._lock:
            keys_can_xoa = []
            for key, records in self._records.items():
                while records and now - records[0] >= self.window_seconds:
                    records.popleft()
                if not records:
                    keys_can_xoa.append(key)
            for key in keys_can_xoa:
                del self._records[key]

def tao_rate_limiter(settings: Settings) -> RateLimiter | None:
    if not settings.rate_limit_enabled:
        return None
    return RateLimiter(
        requests=settings.rate_limit_requests,
        window_seconds=settings.rate_limit_window_seconds
    )