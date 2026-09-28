from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncIterator
from uuid import uuid4
from psycopg.types.json import Jsonb
from app.integrations.postgres import PostgresClient, postgres_client

TABLE_CONG_VIEC = "ai_cong_viec"

class CongViecRepository:
    def __init__(self, database: PostgresClient | None = None):
        self.database = database or postgres_client
    @asynccontextmanager
    async def _ket_noi(self, connection: Any | None = None) -> AsyncIterator[Any]:
        if connection is not None:
            yield connection
            return
        async with self.database.ket_noi() as ket_noi:
            yield ket_noi
    async def tao(self, *, job_type: str, payload: dict[str, Any] | None = None, priority: str = "NORMAL", max_attempts: int = 3, scheduled_at: datetime | None = None, idempotency_key: str | None = None, metadata: dict[str, Any] | None = None, job_id: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        job_id = job_id or str(uuid4())
        sql = f"""
            INSERT INTO {TABLE_CONG_VIEC} (
                job_id,
                job_type,
                status,
                priority,
                payload,
                result,
                error_code,
                error_message,
                attempt,
                max_attempts,
                scheduled_at,
                worker_id,
                idempotency_key,
                metadata
            )
            VALUES (%s, %s, 'QUEUED', %s, %s, NULL, NULL, NULL, 0, %s, COALESCE(%s, now()), NULL, %s, %s)
            RETURNING *
        """
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (job_id, job_type, priority, Jsonb(payload or {}), max_attempts, scheduled_at, idempotency_key, Jsonb(metadata or {})))
            return await cursor.fetchone()
    async def lay_theo_id(self, job_id: str, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"SELECT * FROM {TABLE_CONG_VIEC} WHERE job_id = %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (job_id,))
            return await cursor.fetchone()
    async def tim_theo_idempotency(self, idempotency_key: str, *, job_type: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"SELECT * FROM {TABLE_CONG_VIEC} WHERE idempotency_key = %s"
        params: list[Any] = [idempotency_key]
        if job_type is not None:
            sql += " AND job_type = %s"
            params.append(job_type)
        sql += " ORDER BY created_at DESC LIMIT 1"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, params)
            return await cursor.fetchone()
    async def lay_cho_xu_ly(self, *, limit: int = 20, now: datetime | None = None, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM {TABLE_CONG_VIEC} WHERE status IN ('QUEUED', 'RETRYING') AND scheduled_at <= COALESCE(%s, now()) AND attempt < max_attempts ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, scheduled_at ASC, created_at ASC LIMIT %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (now, limit))
            return await cursor.fetchall()
    async def claim(self, *, worker_id: str, now: datetime | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"""
            WITH job AS (
                SELECT job_id
                FROM {TABLE_CONG_VIEC}
                WHERE status IN ('QUEUED', 'RETRYING')
                  AND scheduled_at <= COALESCE(%s, now())
                  AND attempt < max_attempts
                ORDER BY
                    CASE priority
                        WHEN 'URGENT' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'NORMAL' THEN 3
                        WHEN 'LOW' THEN 4
                        ELSE 5
                    END,
                    scheduled_at ASC,
                    created_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            UPDATE {TABLE_CONG_VIEC} AS target
            SET
                status = 'RUNNING',
                attempt = target.attempt + 1,
                worker_id = %s,
                started_at = now(),
                updated_at = now()
            FROM job
            WHERE target.job_id = job.job_id
            RETURNING target.*
        """
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (now, worker_id))
            return await cursor.fetchone()
    async def cap_nhat(self, job_id: str, *, status: str | None = None, payload: dict[str, Any] | None = None, result: Any | None = None, error_code: str | None = None, error_message: str | None = None, scheduled_at: datetime | None = None, started_at: datetime | None = None, completed_at: datetime | None = None, worker_id: str | None = None, metadata: dict[str, Any] | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"""
            UPDATE {TABLE_CONG_VIEC}
            SET
                status = COALESCE(%s, status),
                payload = COALESCE(%s, payload),
                result = COALESCE(%s, result),
                error_code = COALESCE(%s, error_code),
                error_message = COALESCE(%s, error_message),
                scheduled_at = COALESCE(%s, scheduled_at),
                started_at = COALESCE(%s, started_at),
                completed_at = COALESCE(%s, completed_at),
                worker_id = COALESCE(%s, worker_id),
                metadata = COALESCE(%s, metadata),
                updated_at = now()
            WHERE job_id = %s
            RETURNING *
        """
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (status, Jsonb(payload) if payload is not None else None, Jsonb(result) if result is not None else None, error_code, error_message, scheduled_at, started_at, completed_at, worker_id, Jsonb(metadata) if metadata is not None else None, job_id))
            return await cursor.fetchone()
    async def hoan_thanh(self, job_id: str, result: Any | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_CONG_VIEC} SET status = 'COMPLETED', result = %s, error_code = NULL, error_message = NULL, completed_at = now(), updated_at = now() WHERE job_id = %s RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (Jsonb(result) if result is not None else None, job_id))
            return await cursor.fetchone()
    async def that_bai(self, job_id: str, *, error_code: str | None = None, error_message: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_CONG_VIEC} SET status = 'FAILED', error_code = %s, error_message = %s, completed_at = now(), updated_at = now() WHERE job_id = %s RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (error_code, error_message, job_id))
            return await cursor.fetchone()
    async def retry(self, job_id: str, *, scheduled_at: datetime, error_code: str | None = None, error_message: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_CONG_VIEC} SET status = 'RETRYING', scheduled_at = %s, error_code = %s, error_message = %s, updated_at = now() WHERE job_id = %s AND status IN ('RUNNING', 'FAILED', 'RETRYING') AND attempt < max_attempts RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (scheduled_at, error_code, error_message, job_id))
            return await cursor.fetchone()
    async def huy(self, job_id: str, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_CONG_VIEC} SET status = 'CANCELLED', completed_at = now(), updated_at = now() WHERE job_id = %s AND status IN ('QUEUED', 'RETRYING') RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (job_id,))
            return await cursor.fetchone()

cong_viec_repository = CongViecRepository()

def tao_cong_viec_repository(database: PostgresClient | None = None) -> CongViecRepository:
    return CongViecRepository(database)