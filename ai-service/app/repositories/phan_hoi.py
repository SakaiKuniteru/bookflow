from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncIterator
from uuid import uuid4
from psycopg.types.json import Jsonb
from app.integrations.postgres import PostgresClient, postgres_client

TABLE_PHAN_HOI = "ai_phan_hoi"

class PhanHoiRepository:
    def __init__(self, database: PostgresClient | None = None):
        self.database = database or postgres_client
    @asynccontextmanager
    async def _ket_noi(self, connection: Any | None = None) -> AsyncIterator[Any]:
        if connection is not None:
            yield connection
            return
        async with self.database.ket_noi() as ket_noi:
            yield ket_noi
    async def tao(self, *, user_id: int | None, conversation_id: str | None, message_id: str, request_id: str | None, feedback_type: str, rating: int | None = None, content: str | None = None, reason: str | None = None, metadata: dict[str, Any] | None = None, feedback_id: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        feedback_id = feedback_id or str(uuid4())
        sql = f"""
            INSERT INTO {TABLE_PHAN_HOI} (
                feedback_id,
                user_id,
                conversation_id,
                message_id,
                request_id,
                feedback_type,
                rating,
                content,
                reason,
                metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, message_id, feedback_type) DO NOTHING
            RETURNING *
        """
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (feedback_id, user_id, conversation_id, message_id, request_id, feedback_type, rating, content, reason, Jsonb(metadata or {})))
            row = await cursor.fetchone()
            if row is not None:
                return row
            return await self.tim_trung(user_id=user_id, message_id=message_id, feedback_type=feedback_type, connection=ket_noi)
    async def tim_trung(self, *, user_id: int | None, message_id: str, feedback_type: str, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"SELECT * FROM {TABLE_PHAN_HOI} WHERE user_id IS NOT DISTINCT FROM %s AND message_id = %s AND feedback_type = %s LIMIT 1"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (user_id, message_id, feedback_type))
            return await cursor.fetchone()
    async def lay_theo_message(self, message_id: str, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM {TABLE_PHAN_HOI} WHERE message_id = %s ORDER BY created_at DESC"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (message_id,))
            return await cursor.fetchall()
    async def lay_theo_conversation(self, conversation_id: str, *, page: int = 1, limit: int = 50, connection: Any | None = None) -> list[dict[str, Any]]:
        offset = (page - 1) * limit
        sql = f"SELECT * FROM {TABLE_PHAN_HOI} WHERE conversation_id = %s ORDER BY created_at DESC LIMIT %s OFFSET %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (conversation_id, limit, offset))
            return await cursor.fetchall()
    async def lay_theo_user(self, user_id: int, *, page: int = 1, limit: int = 50, connection: Any | None = None) -> list[dict[str, Any]]:
        offset = (page - 1) * limit
        sql = f"SELECT * FROM {TABLE_PHAN_HOI} WHERE user_id = %s ORDER BY created_at DESC LIMIT %s OFFSET %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (user_id, limit, offset))
            return await cursor.fetchall()
    async def lay_theo_khoang_thoi_gian(self, tu_ngay: datetime, den_ngay: datetime, *, feedback_type: str | None = None, page: int = 1, limit: int = 100, connection: Any | None = None) -> list[dict[str, Any]]:
        offset = (page - 1) * limit
        sql = f"SELECT * FROM {TABLE_PHAN_HOI} WHERE created_at >= %s AND created_at < %s"
        params: list[Any] = [tu_ngay, den_ngay]
        if feedback_type is not None:
            sql += " AND feedback_type = %s"
            params.append(feedback_type)
        sql += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, params)
            return await cursor.fetchall()

phan_hoi_repository = PhanHoiRepository()

def tao_phan_hoi_repository(database: PostgresClient | None = None) -> PhanHoiRepository:
    return PhanHoiRepository(database)