from contextlib import asynccontextmanager
from typing import AsyncIterator
from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from app.core.config import Settings

class PostgresClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.pool: AsyncConnectionPool | None = None

    async def khoi_tao(self) -> None:
        if not self.settings.database_url:
            return
        self.pool = AsyncConnectionPool(
            conninfo=self.settings.database_url,
            min_size=self.settings.database_pool_min_size,
            max_size=self.settings.database_pool_max_size,
            open=False,
            kwargs={"row_factory": dict_row}
        )
        await self.pool.open()

    async def dong(self) -> None:
        if self.pool:
            await self.pool.close()
            self.pool = None

    def san_sang(self) -> bool:
        return self.pool is not None

    @asynccontextmanager
    async def ket_noi(self) -> AsyncIterator[AsyncConnection]:
        if not self.pool:
            raise RuntimeError("PostgreSQL chưa được khởi tạo")
        async with self.pool.connection() as connection:
            yield connection

    async def kiem_tra_ket_noi(self) -> bool:
        if not self.pool:
            return False
        try:
            async with self.pool.connection() as connection:
                await connection.execute("SELECT 1")
            return True
        except Exception:
            return False

postgres_client: PostgresClient | None = None

def tao_postgres_client(settings: Settings) -> PostgresClient:
    global postgres_client
    if postgres_client is None:
        postgres_client = PostgresClient(settings)
    return postgres_client