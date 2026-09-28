from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Iterable
from uuid import uuid4
from psycopg.types.json import Jsonb
from app.integrations.postgres import PostgresClient, postgres_client

TABLE_DOAN_DU_LIEU = "ai_doan_du_lieu"

class DoanDuLieuRepository:
    def __init__(self, database: PostgresClient | None = None):
        self.database = database or postgres_client
    @asynccontextmanager
    async def _ket_noi(self, connection: Any | None = None) -> AsyncIterator[Any]:
        if connection is not None:
            yield connection
            return
        async with self.database.ket_noi() as ket_noi:
            yield ket_noi
    def _chuyen_vector(self, embedding: Iterable[float] | None) -> str | None:
        if embedding is None:
            return None
        return "[" + ",".join(f"{float(value):.15g}" for value in embedding) + "]"
    async def tao(self, *, source_id: str, sequence: int, content: str, parent_chunk_id: str | None = None, content_hash: str | None = None, token_count: int | None = None, embedding: Iterable[float] | None = None, embedding_model: str | None = None, metadata: dict[str, Any] | None = None, access_scope: dict[str, Any] | None = None, status: str = "ACTIVE", chunk_id: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        chunk_id = chunk_id or str(uuid4())
        sql = f"""
            INSERT INTO {TABLE_DOAN_DU_LIEU} (
                chunk_id,
                source_id,
                parent_chunk_id,
                sequence,
                content,
                content_hash,
                token_count,
                embedding,
                embedding_model,
                metadata,
                access_scope,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s, %s, %s)
            RETURNING *
        """
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (chunk_id, source_id, parent_chunk_id, sequence, content, content_hash, token_count, self._chuyen_vector(embedding), embedding_model, Jsonb(metadata or {}), Jsonb(access_scope or {}), status))
            return await cursor.fetchone()
    async def tao_nhieu(self, chunks: list[dict[str, Any]], *, connection: Any | None = None) -> list[dict[str, Any]]:
        if not chunks:
            return []
        rows: list[tuple[Any, ...]] = []
        for chunk in chunks:
            chunk_id = chunk.get("chunk_id") or str(uuid4())
            rows.append((chunk_id, chunk["source_id"], chunk.get("parent_chunk_id"), chunk["sequence"], chunk["content"], chunk.get("content_hash"), chunk.get("token_count"), self._chuyen_vector(chunk.get("embedding")), chunk.get("embedding_model"), Jsonb(chunk.get("metadata") or {}), Jsonb(chunk.get("access_scope") or {}), chunk.get("status", "ACTIVE")))
        sql = f"""
            INSERT INTO {TABLE_DOAN_DU_LIEU} (
                chunk_id,
                source_id,
                parent_chunk_id,
                sequence,
                content,
                content_hash,
                token_count,
                embedding,
                embedding_model,
                metadata,
                access_scope,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s, %s, %s)
        """
        async with self._ket_noi(connection) as ket_noi:
            await ket_noi.executemany(sql, rows)
            chunk_ids = [row[0] for row in rows]
            cursor = await ket_noi.execute(f"SELECT * FROM {TABLE_DOAN_DU_LIEU} WHERE chunk_id = ANY(%s::uuid[]) ORDER BY source_id, sequence", (chunk_ids,))
            return await cursor.fetchall()
    async def lay_theo_id(self, chunk_id: str, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"SELECT * FROM {TABLE_DOAN_DU_LIEU} WHERE chunk_id = %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (chunk_id,))
            return await cursor.fetchone()
    async def lay_theo_source(self, source_id: str, *, include_inactive: bool = False, connection: Any | None = None) -> list[dict[str, Any]]:
        sql = f"SELECT * FROM {TABLE_DOAN_DU_LIEU} WHERE source_id = %s"
        if not include_inactive:
            sql += " AND status = 'ACTIVE'"
        sql += " ORDER BY sequence ASC"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (source_id,))
            return await cursor.fetchall()
    async def tim_vector(self, embedding: Iterable[float], *, limit: int = 20, source_id: str | None = None, status: str = "ACTIVE", connection: Any | None = None) -> list[dict[str, Any]]:
        vector = self._chuyen_vector(embedding)
        sql = f"SELECT chunk_id, source_id, parent_chunk_id, sequence, content, content_hash, token_count, embedding_model, metadata, access_scope, status, created_at, updated_at, 1 - (embedding <=> %s::vector) AS similarity FROM {TABLE_DOAN_DU_LIEU} WHERE embedding IS NOT NULL AND status = %s"
        params: list[Any] = [vector, status]
        if source_id is not None:
            sql += " AND source_id = %s"
            params.append(source_id)
        sql += " ORDER BY embedding <=> %s::vector ASC LIMIT %s"
        params.extend([vector, limit])
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, params)
            return await cursor.fetchall()
    async def vo_hieu_hoa_theo_source(self, source_id: str, *, status: str = "DELETED", connection: Any | None = None) -> int:
        sql = f"UPDATE {TABLE_DOAN_DU_LIEU} SET status = %s, updated_at = now() WHERE source_id = %s AND status <> %s"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (status, source_id, status))
            return cursor.rowcount
    async def cap_nhat_embedding(self, chunk_id: str, embedding: Iterable[float], *, embedding_model: str | None = None, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_DOAN_DU_LIEU} SET embedding = %s::vector, embedding_model = COALESCE(%s, embedding_model), updated_at = now() WHERE chunk_id = %s RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (self._chuyen_vector(embedding), embedding_model, chunk_id))
            return await cursor.fetchone()
    async def cap_nhat_trang_thai(self, chunk_id: str, status: str, connection: Any | None = None) -> dict[str, Any] | None:
        sql = f"UPDATE {TABLE_DOAN_DU_LIEU} SET status = %s, updated_at = now() WHERE chunk_id = %s RETURNING *"
        async with self._ket_noi(connection) as ket_noi:
            cursor = await ket_noi.execute(sql, (status, chunk_id))
            return await cursor.fetchone()

doan_du_lieu_repository = DoanDuLieuRepository()

def tao_doan_du_lieu_repository(database: PostgresClient | None = None) -> DoanDuLieuRepository:
    return DoanDuLieuRepository(database)