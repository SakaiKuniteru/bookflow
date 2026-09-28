from contextlib import asynccontextmanager
from typing import Any, AsyncIterator
from uuid import uuid4
from psycopg.types.json import Jsonb
from app.integrations.postgres import PostgresClient, postgres_client

TABLE_HOI_THOAI = "ai_hoi_thoai"
TABLE_TIN_NHAN = "ai_tin_nhan"

class HoiThoaiRepository:
    def __init__(self, database: PostgresClient | None = None):
        self.database = database or postgres_client
    @asynccontextmanager
    async def _ket_noi(self, connection: Any | None = None) -> AsyncIterator[Any]:
        if connection is not None:
            yield connection
            return
        async with self.database.ket_noi() as ket_noi:
            yield ket_noi
    async def tao(self, *, user_id: int | None = None, session_id: str | None = None, title: str | None = None, status: str = "ACTIVE", metadata: dict[str, Any] | None = None, conversation_id: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        conversation_id = conversation_id or str(uuid4())
        sql = f"""
            INSERT INTO {TABLE_HOI_THOAI} (
                conversation_id,
                user_id,
                session_id,
                title,
                status,
                metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (conversation_id, user_id, session_id, title, status, Jsonb(metadata or {})))
            return await cursor.fetchone()
    async def lay_theo_id(
        self,
        conversation_id: str,
        user_id: int | str | None = None,
        connection: Any | None = None,
    ) -> dict[str, Any] | None:
        ...
        sql = f"SELECT * FROM {TABLE_HOI_THOAI} WHERE conversation_id = %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (conversation_id,))
            return await cursor.fetchone()
    async def lay_theo_user(self, user_id: int, *, status: str | None = "ACTIVE", page: int = 1, limit: int = 20, connection: Any | None = None) -> list[dict[str, Any]]:
        offset = (page - 1) * limit
        sql = f"SELECT * FROM {TABLE_HOI_THOAI} WHERE user_id = %s"
        params: list[Any] = [user_id]
        if status is not None:
            sql += " AND status = %s"
            params.append(status)
        sql += " ORDER BY updated_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, params)
            return await cursor.fetchall()
    async def lay_tin_nhan_gan_nhat(self, conversation_id: str, *, limit: int = 20, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM (SELECT * FROM {TABLE_TIN_NHAN} WHERE conversation_id = %s ORDER BY sequence DESC LIMIT %s) AS messages ORDER BY sequence ASC"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (conversation_id, limit))
            return await cursor.fetchall()
    async def lay_day_du(self, conversation_id: str, *, limit: int | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        hoi_thoai = await self.lay_theo_id(conversation_id, connection=connection)
        if hoi_thoai is None:
            return None
        if limit is None:
            sql = f"SELECT * FROM {TABLE_TIN_NHAN} WHERE conversation_id = %s ORDER BY sequence ASC"
            params: tuple[Any, ...] = (conversation_id,)
        else:
            sql = f"SELECT * FROM (SELECT * FROM {TABLE_TIN_NHAN} WHERE conversation_id = %s ORDER BY sequence DESC LIMIT %s) AS messages ORDER BY sequence ASC"
            params = (conversation_id, limit)
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, params)
            messages = await cursor.fetchall()
        hoi_thoai["messages"] = messages
        return hoi_thoai
    async def them_tin_nhan(self, *, conversation_id: str, role: str, content: str, metadata: dict[str, Any] | None = None, message_id: str | None = None, sequence: int | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        message_id = message_id or str(uuid4())
        async with self._ket_noi(connection) as ket_noi:
            if sequence is None:
                lock_cursor = await ket_noi.execute(f"SELECT conversation_id FROM {TABLE_HOI_THOAI} WHERE conversation_id = %s FOR UPDATE", (conversation_id,))
                conversation = await lock_cursor.fetchone()
                if conversation is None:
                    return None
                sequence_cursor = await ket_noi.execute(f"SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM {TABLE_TIN_NHAN} WHERE conversation_id = %s", (conversation_id,))
                sequence = (await sequence_cursor.fetchone())["next_sequence"]
            sql = f"""
                INSERT INTO {TABLE_TIN_NHAN} (
                    message_id,
                    conversation_id,
                    role,
                    content,
                    sequence,
                    metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """
            cursor = await ket_noi.execute(sql, (message_id, conversation_id, role, content, sequence, Jsonb(metadata or {})))
            message = await cursor.fetchone()
            await ket_noi.execute(f"UPDATE {TABLE_HOI_THOAI} SET updated_at = now() WHERE conversation_id = %s", (conversation_id,))
            return message
    async def cap_nhat(self, conversation_id: str, *, title: str | None = None, status: str | None = None, metadata: dict[str, Any] | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_HOI_THOAI} SET title = COALESCE(%s, title), status = COALESCE(%s, status), metadata = COALESCE(%s, metadata), updated_at = now() WHERE conversation_id = %s RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (title, status, Jsonb(metadata) if metadata is not None else None, conversation_id))
            return await cursor.fetchone()
    async def cap_nhat_trang_thai(self, conversation_id: str, status: str, connection: Any | None = None) -> dict[str, Any] | None:
        return await self.cap_nhat(conversation_id, status=status, connection=connection)
    async def xoa_mem(self, conversation_id: str, *, status: str = "DELETED", connection: Any | None = None) -> dict[str, Any] | None:
        return await self.cap_nhat(conversation_id, status=status, connection=connection)

hoi_thoai_repository = HoiThoaiRepository()

def tao_hoi_thoai_repository(database: PostgresClient | None = None) -> HoiThoaiRepository:
    return HoiThoaiRepository(database)