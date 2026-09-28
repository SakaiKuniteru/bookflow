from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncIterator
from uuid import uuid4
from psycopg.types.json import Jsonb
from app.integrations.postgres import PostgresClient, postgres_client

TABLE_GOI_Y = "ai_goi_y"

class GoiYRepository:
    def __init__(self, database: PostgresClient | None = None):
        self.database = database or postgres_client
    @asynccontextmanager
    async def _ket_noi(self, connection: Any | None = None) -> AsyncIterator[Any]:
        if connection is not None:
            yield connection
            return
        async with self.database.ket_noi() as ket_noi:
            yield ket_noi
    async def tao_nhieu(self, recommendations: list[dict[str, Any]], *, connection: Any | None = None) -> list[dict[str, Any]]:
        if not recommendations:
            return []
        rows: list[tuple[Any, ...]] = []
        for recommendation in recommendations:
            recommendation_id = recommendation.get("recommendation_id") or str(uuid4())
            rows.append((recommendation_id, recommendation.get("user_id"), recommendation.get("context_type"), recommendation.get("source_book_id"), recommendation["recommended_book_id"], recommendation.get("score", 0), recommendation.get("reason"), recommendation.get("explanation"), recommendation.get("algorithm_version"), recommendation.get("model_version"), Jsonb(recommendation.get("metadata") or {}), recommendation.get("expires_at")))
        sql = f"""
            INSERT INTO {TABLE_GOI_Y} (
                recommendation_id,
                user_id,
                context_type,
                source_book_id,
                recommended_book_id,
                score,
                reason,
                explanation,
                algorithm_version,
                model_version,
                metadata,
                expires_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        async with self._ket_noi(connection) as ket_noi:
            await ket_noi.executemany(sql, rows)
            recommendation_ids = [row[0] for row in rows]
            cursor = await ket_noi.execute(f"SELECT * FROM {TABLE_GOI_Y} WHERE recommendation_id = ANY(%s::uuid[]) ORDER BY score DESC, created_at DESC", (recommendation_ids,))
            return await cursor.fetchall()
    async def lay_hien_tai(self, *, user_id: int | None = None, context_type: str | None = None, limit: int = 10, now: datetime | None = None, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM {TABLE_GOI_Y} WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > COALESCE(%s, now())) AND (user_id IS NULL OR user_id = %s)"
        params: list[Any] = [now, user_id]
        if context_type is not None:
            sql += " AND context_type = %s"
            params.append(context_type)
        sql += " ORDER BY score DESC, created_at DESC LIMIT %s"
        params.append(limit)
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, params)
            return await cursor.fetchall()
    async def lay_theo_sach(self, source_book_id: int, *, user_id: int | None = None, limit: int = 10, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM {TABLE_GOI_Y} WHERE status = 'ACTIVE' AND source_book_id = %s AND (expires_at IS NULL OR expires_at > now()) AND (user_id IS NULL OR user_id = %s) ORDER BY score DESC, created_at DESC LIMIT %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (source_book_id, user_id, limit))
            return await cursor.fetchall()
    async def lay_theo_context(self, context_type: str, *, user_id: int | None = None, limit: int = 10, connection: Any | None = None) -> list[dict[str, Any]]:
        return await self.lay_hien_tai(user_id=user_id, context_type=context_type, limit=limit, connection=connection)
    async def vo_hieu_hoa(self, recommendation_ids: list[str], *, status: str = "INVALIDATED", connection: Any | None = None) -> int:
        if not recommendation_ids:
            return 0
        sql = f"UPDATE {TABLE_GOI_Y} SET status = %s WHERE recommendation_id = ANY(%s::uuid[])"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (status, recommendation_ids))
            return cursor.rowcount
    async def vo_hieu_hoa_theo_algorithm(self, algorithm_version: str, *, status: str = "INVALIDATED", connection: Any | None = None) -> int:
        sql = f"UPDATE {TABLE_GOI_Y} SET status = %s WHERE algorithm_version = %s AND status = 'ACTIVE'"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (status, algorithm_version))
            return cursor.rowcount
    async def vo_hieu_hoa_het_han(self, *, status: str = "EXPIRED", connection: Any | None = None) -> int:
        sql = f"UPDATE {TABLE_GOI_Y} SET status = %s WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= now()"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (status,))
            return cursor.rowcount

goi_y_repository = GoiYRepository()

def tao_goi_y_repository(database: PostgresClient | None = None) -> GoiYRepository:
    return GoiYRepository(database)