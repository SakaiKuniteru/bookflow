from dataclasses import dataclass
import asyncio
from typing import Awaitable, Callable, TypeVar

T = TypeVar("T")

@dataclass(slots=True)
class RetryPolicy:
    max_attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 30.0
    multiplier: float = 2.0

    def delay_for(self, attempt: int) -> float:
        delay = self.initial_delay * (self.multiplier ** max(0, attempt - 1))
        return min(delay, self.max_delay)

async def chay_retry(
    operation: Callable[[], Awaitable[T]],
    policy: RetryPolicy | None = None,
    on_error: Callable[[Exception, int], Awaitable[None]] | None = None
) -> T:
    retry_policy = policy or RetryPolicy()
    last_error: Exception | None = None
    for attempt in range(1, retry_policy.max_attempts + 1):
        try:
            return await operation()
        except Exception as exc:
            last_error = exc
            if on_error:
                await on_error(exc, attempt)
            if attempt >= retry_policy.max_attempts:
                break
            await asyncio.sleep(retry_policy.delay_for(attempt))
    if last_error:
        raise last_error
    raise RuntimeError("Retry không có kết quả")