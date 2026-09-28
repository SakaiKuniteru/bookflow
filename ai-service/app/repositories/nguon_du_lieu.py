from contextlib import asynccontextmanager
from typing import Any, AsyncIterator
from uuid import uuid4
from psycopg.types.json import Jsonb
from app.integrations.postgres import PostgresClient, postgres_client

TABLE_NGUON_DU_LIEU = "ai_nguon_du_lieu"

class NguonDuLieuRepository:
    def __init__(self, database: PostgresClient | None = None):
        self.database = database or postgres_client
    @asynccontextmanager
    async def _ket_noi(self, connection: Any | None = None) -> AsyncIterator[Any]:
        if connection is not None:
            yield connection
            return
        async with self.database.ket_noi() as ket_noi:
            yield ket_noi
    async def tao(self, *, source_type: str, entity_type: str | None = None, entity_id: int | str | None = None, file_id: int | None = None, title: str, content_reference: str | None = None, version: int = 1, checksum: str | None = None, access_scope: dict[str, Any] | None = None, status: str = "PENDING_INDEX", metadata: dict[str, Any] | None = None, source_id: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        source_id = source_id or str(uuid4())
        sql = f"""
            INSERT INTO {TABLE_NGUON_DU_LIEU} (
                source_id,
                source_type,
                entity_type,
                entity_id,
                file_id,
                title,
                content_reference,
                version,
                checksum,
                access_scope,
                status,
                metadata,
                index_status,
                index_version,
                chunk_count,
                indexed_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (source_id, source_type, entity_type, str(entity_id) if entity_id is not None else None, file_id, title, content_reference, version, checksum, Jsonb(access_scope or {}), status, Jsonb(metadata or {}), "CHUA_INDEX", None, 0, None))
            return await cursor.fetchone()
    async def lay_theo_id(self, source_id: str, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"SELECT * FROM {TABLE_NGUON_DU_LIEU} WHERE source_id = %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (source_id,))
            return await cursor.fetchone()
    async def tim_theo_entity(self, entity_type: str, entity_id: int | str, *, status: str | None = None, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM {TABLE_NGUON_DU_LIEU} WHERE entity_type = %s AND entity_id = %s"
        params: list[Any] = [entity_type, str(entity_id)]
        if status is not None:
            sql += " AND status = %s"
            params.append(status)
        sql += " ORDER BY updated_at DESC, created_at DESC"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, params)
            return await cursor.fetchall()
    async def tim_theo_file(self, file_id: int, *, status: str | None = None, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM {TABLE_NGUON_DU_LIEU} WHERE file_id = %s"
        params: list[Any] = [file_id]
        if status is not None:
            sql += " AND status = %s"
            params.append(status)
        sql += " ORDER BY updated_at DESC, created_at DESC"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, params)
            return await cursor.fetchall()
    async def cap_nhat(self, source_id: str, *, source_type: str | None = None, entity_type: str | None = None, entity_id: int | str | None = None, file_id: int | None = None, title: str | None = None, content_reference: str | None = None, version: int | None = None, checksum: str | None = None, access_scope: dict[str, Any] | None = None, status: str | None = None, metadata: dict[str, Any] | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"""
            UPDATE {TABLE_NGUON_DU_LIEU}
            SET
                source_type = COALESCE(%s, source_type),
                entity_type = COALESCE(%s, entity_type),
                entity_id = COALESCE(%s, entity_id),
                file_id = COALESCE(%s, file_id),
                title = COALESCE(%s, title),
                content_reference = COALESCE(%s, content_reference),
                version = COALESCE(%s, version),
                checksum = COALESCE(%s, checksum),
                access_scope = COALESCE(%s, access_scope),
                status = COALESCE(%s, status),
                metadata = COALESCE(%s, metadata),
                updated_at = now()
            WHERE source_id = %s
            RETURNING *
        """
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (source_type, entity_type, str(entity_id) if entity_id is not None else None, file_id, title, content_reference, version, checksum, Jsonb(access_scope) if access_scope is not None else None, status, Jsonb(metadata) if metadata is not None else None, source_id))
            return await cursor.fetchone()
    async def danh_dau_can_index_lai(self, source_id: str, *, status: str = "REINDEX_REQUIRED", connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_NGUON_DU_LIEU} SET status = %s, updated_at = now() WHERE source_id = %s RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (status, source_id))
            return await cursor.fetchone()
    async def cap_nhat_trang_thai_index(self, source_id: str, *, index_status: str, index_version: int | None = None, chunk_count: int | None = None, indexed_at: Any | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_NGUON_DU_LIEU} SET index_status = %s, index_version = COALESCE(%s, index_version), chunk_count = COALESCE(%s, chunk_count), indexed_at = COALESCE(%s, indexed_at), updated_at = now() WHERE source_id = %s RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (index_status, index_version, chunk_count, indexed_at, source_id))
            return await cursor.fetchone()
    async def vo_hieu_hoa(self, source_id: str, *, status: str = "INACTIVE", connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_NGUON_DU_LIEU} SET status = %s, updated_at = now() WHERE source_id = %s RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (status, source_id))
            return await cursor.fetchone()
    async def xoa_vinh_vien(self, source_id: str, connection: Any | None = None) -> bool:
        sql = f"DELETE FROM {TABLE_NGUON_DU_LIEU} WHERE source_id = %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (source_id,))
            return cursor.rowcount > 0
    async def lay_can_index(self, *, limit: int = 100, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM {TABLE_NGUON_DU_LIEU} WHERE status IN ('PENDING_INDEX', 'REINDEX_REQUIRED', 'INDEX_ERROR') ORDER BY updated_at ASC, created_at ASC LIMIT %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (limit,))
            return await cursor.fetchall()

nguon_du_lieu_repository = NguonDuLieuRepository()

def tao_nguon_du_lieu_repository(database: PostgresClient | None = None) -> NguonDuLieuRepository:
    return NguonDuLieuRepository(database)