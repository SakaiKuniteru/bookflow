from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
from app.core.exceptions import AIBackendException, AIProviderException, AIServiceException
from app.integrations.backend_client import BackendClient, backend_client
from app.providers.embeddings import EmbeddingProvider, embedding_provider
from app.repositories.doan_du_lieu import DoanDuLieuRepository, doan_du_lieu_repository
from app.repositories.nguon_du_lieu import NguonDuLieuRepository, nguon_du_lieu_repository
from app.services.indexing.chia_doan import ChiaDoanService, chia_doan_service

BACKEND_SACH_PATH = "/api/internal/ai/sach/{book_id}"
SOURCE_TYPE = "BOOK"
ENTITY_TYPE = "BOOK"
INDEX_STATUS_PROCESSING = "PROCESSING"
INDEX_STATUS_INDEXED = "INDEXED"
INDEX_STATUS_FAILED = "FAILED"
SOURCE_STATUS_ACTIVE = "ACTIVE"
SOURCE_STATUS_INACTIVE = "INACTIVE"

class SachIndexingService:
    def __init__(self, *, backend: BackendClient | None = None, embedding: EmbeddingProvider | None = None, source_repository: NguonDuLieuRepository | None = None, chunk_repository: DoanDuLieuRepository | None = None, chunker: ChiaDoanService | None = None):
        self.backend = backend or backend_client
        self.embedding = embedding or embedding_provider
        self.source_repository = source_repository or nguon_du_lieu_repository
        self.chunk_repository = chunk_repository or doan_du_lieu_repository
        self.chunker = chunker or chia_doan_service
    async def _lay_du_lieu_sach(self, book_id: int | str, backend_path: str | None = None) -> dict[str, Any]:
        path = (backend_path or BACKEND_SACH_PATH).format(book_id=book_id)
        try:
            response = await self.backend.get(path)
        except Exception as exc:
            raise AIBackendException(f"Không thể lấy dữ liệu sách {book_id} từ Backend", details={"book_id": book_id}) from exc
        if not isinstance(response, dict):
            raise AIBackendException("Backend trả dữ liệu sách không hợp lệ", details={"book_id": book_id})
        data = response.get("data", response)
        if not isinstance(data, dict):
            raise AIBackendException("Backend trả dữ liệu sách không hợp lệ", details={"book_id": book_id})
        return data
    def _lay_noi_dung(self, sach: dict[str, Any]) -> str:
        parts: list[str] = []
        title = sach.get("ten") or sach.get("title") or sach.get("ten_sach")
        isbn = sach.get("isbn")
        description = sach.get("mo_ta") or sach.get("description")
        if title:
            parts.append(f"Tên sách: {title}")
        if isbn:
            parts.append(f"ISBN: {isbn}")
        authors = sach.get("tac_gia") or sach.get("authors") or []
        if isinstance(authors, list):
            author_names = [self._lay_ten(item) for item in authors]
            author_names = [item for item in author_names if item]
            if author_names:
                parts.append(f"Tác giả: {', '.join(author_names)}")
        elif authors:
            parts.append(f"Tác giả: {authors}")
        categories = sach.get("the_loai") or sach.get("categories") or []
        if isinstance(categories, list):
            category_names = [self._lay_ten(item) for item in categories]
            category_names = [item for item in category_names if item]
            if category_names:
                parts.append(f"Thể loại: {', '.join(category_names)}")
        elif categories:
            parts.append(f"Thể loại: {categories}")
        publisher = sach.get("nha_xuat_ban") or sach.get("publisher")
        publisher_name = self._lay_ten(publisher)
        if publisher_name:
            parts.append(f"Nhà xuất bản: {publisher_name}")
        edition = sach.get("phien_ban") or sach.get("edition") or {}
        if isinstance(edition, dict):
            format_name = edition.get("dinh_dang") or edition.get("format")
            language = edition.get("ngon_ngu") or edition.get("language")
            published_year = edition.get("nam_xuat_ban") or edition.get("published_year")
            if format_name:
                parts.append(f"Định dạng: {format_name}")
            if language:
                parts.append(f"Ngôn ngữ: {language}")
            if published_year:
                parts.append(f"Năm xuất bản: {published_year}")
        if description:
            parts.append(f"Mô tả: {description}")
        extra = sach.get("noi_dung") or sach.get("content")
        if extra:
            parts.append(str(extra))
        return "\n".join(str(item).strip() for item in parts if str(item).strip())
    def _lay_ten(self, value: Any) -> str:
        if isinstance(value, dict):
            return str(value.get("ten") or value.get("name") or value.get("ten_tac_gia") or value.get("ten_the_loai") or value.get("ten_nha_xuat_ban") or "").strip()
        return str(value).strip() if value is not None else ""
    def _lay_version(self, sach: dict[str, Any]) -> int:
        value = sach.get("version") or sach.get("phien_ban_index") or sach.get("index_version") or 1
        try:
            return max(1, int(value))
        except (TypeError, ValueError):
            return 1
    def _lay_access_scope(self, sach: dict[str, Any]) -> dict[str, Any]:
        value = sach.get("access_scope") or sach.get("pham_vi_truy_cap") or {}
        return dict(value) if isinstance(value, dict) else {}
    def _lay_metadata(self, sach: dict[str, Any], book_id: int | str) -> dict[str, Any]:
        metadata = dict(sach.get("metadata") or {}) if isinstance(sach.get("metadata"), dict) else {}
        metadata.update({"entity_type": ENTITY_TYPE, "entity_id": str(book_id), "isbn": sach.get("isbn"), "book_status": sach.get("trang_thai") or sach.get("status")})
        return {key: value for key, value in metadata.items() if value is not None}
    def _tim_source_da_index(self, sources: list[dict[str, Any]], version: int, content_hash: str) -> dict[str, Any] | None:
        for source in sources:
            if int(source.get("version") or 0) == version and source.get("checksum") == content_hash and source.get("index_status") == INDEX_STATUS_INDEXED and source.get("status") == SOURCE_STATUS_ACTIVE:
                return source
        return None
    def _lay_version_moi(self, sources: list[dict[str, Any]], requested_version: int) -> int:
        if not sources:
            return requested_version
        max_version = max(int(source.get("version") or 0) for source in sources)
        return max(requested_version, max_version + 1)
    async def _vo_hieu_hoa_source_cu(self, sources: list[dict[str, Any]]) -> None:
        for source in sources:
            source_id = source.get("source_id")
            if source_id and source.get("status") == SOURCE_STATUS_ACTIVE:
                await self.chunk_repository.vo_hieu_hoa_theo_source(source_id)
                await self.source_repository.vo_hieu_hoa(source_id, status=SOURCE_STATUS_INACTIVE)
    async def index_sach(self, book_id: int | str, *, du_lieu: dict[str, Any] | None = None, backend_path: str | None = None, force: bool = False) -> dict[str, Any]:
        if du_lieu is None:
            du_lieu = await self._lay_du_lieu_sach(book_id, backend_path)
        content = self._lay_noi_dung(du_lieu)
        if not content:
            raise AIServiceException("Sách không có nội dung phù hợp để lập chỉ mục", code="INDEX_CONTENT_EMPTY", status_code=422, details={"book_id": book_id})
        requested_version = self._lay_version(du_lieu)
        metadata = self._lay_metadata(du_lieu, book_id)
        access_scope = self._lay_access_scope(du_lieu)
        content_hash = self.chunker.tinh_hash(content)
        existing_sources = await self.source_repository.tim_theo_entity(ENTITY_TYPE, book_id)
        existing_index = self._tim_source_da_index(existing_sources, requested_version, content_hash)
        if existing_index and not force:
            return {"source_id": existing_index["source_id"], "entity_id": str(book_id), "version": requested_version, "status": INDEX_STATUS_INDEXED, "skipped": True, "chunk_count": existing_index.get("chunk_count", 0)}
        version = self._lay_version_moi(existing_sources, requested_version)
        title = str(du_lieu.get("ten") or du_lieu.get("title") or f"Sách {book_id}")
        source = await self.source_repository.tao(source_type=SOURCE_TYPE, entity_type=ENTITY_TYPE, entity_id=book_id, title=title, version=version, checksum=content_hash, access_scope=access_scope, status=SOURCE_STATUS_ACTIVE, metadata=metadata)
        if source is None:
            raise AIServiceException("Không thể tạo source cho sách", code="INDEX_SOURCE_CREATE_FAILED", status_code=500, details={"book_id": book_id})
        source_id = source["source_id"]
        await self.source_repository.cap_nhat_trang_thai_index(source_id, index_status=INDEX_STATUS_PROCESSING)
        chunks = self.chunker.chia(source_id=source_id, source_type=SOURCE_TYPE, content=content, metadata={"entity_type": ENTITY_TYPE, "entity_id": str(book_id), "title": title, "access_scope": access_scope, **metadata}, version=version)
        errors = self.chunker.kiem_tra(chunks)
        if errors:
            await self.source_repository.cap_nhat_trang_thai_index(source_id, index_status=INDEX_STATUS_FAILED)
            raise AIServiceException("Chunk sách không hợp lệ", code="INDEX_CHUNK_INVALID", status_code=422, details={"book_id": book_id, "errors": errors})
        try:
            embedding_response = await self.embedding.embed([chunk["content"] for chunk in chunks])
            vectors = embedding_response.vectors
            if len(vectors) != len(chunks):
                raise AIProviderException("Số lượng embedding không khớp số lượng chunk", details={"chunks": len(chunks), "embeddings": len(vectors)})
            for chunk, vector in zip(chunks, vectors):
                chunk["embedding"] = vector
                chunk["embedding_model"] = embedding_response.model
                chunk["status"] = "ACTIVE"
            saved_chunks = await self.chunk_repository.tao_nhieu(chunks)
            await self.source_repository.cap_nhat_trang_thai_index(source_id, index_status=INDEX_STATUS_INDEXED, index_version=version, chunk_count=len(saved_chunks), indexed_at=datetime.now(timezone.utc))
            await self._vo_hieu_hoa_source_cu([item for item in existing_sources if item.get("source_id") != source_id])
            return {"source_id": source_id, "entity_id": str(book_id), "version": version, "status": INDEX_STATUS_INDEXED, "skipped": False, "chunk_count": len(saved_chunks)}
        except Exception:
            await self.source_repository.cap_nhat_trang_thai_index(source_id, index_status=INDEX_STATUS_FAILED)
            raise
    async def reindex_sach(self, book_id: int | str, *, du_lieu: dict[str, Any] | None = None, backend_path: str | None = None) -> dict[str, Any]:
        return await self.index_sach(book_id, du_lieu=du_lieu, backend_path=backend_path, force=True)
    async def index_nhieu_sach(self, book_ids: list[int | str], *, batch_size: int = 50, backend_path: str | None = None) -> dict[str, Any]:
        if batch_size <= 0:
            raise ValueError("batch_size phải lớn hơn 0")
        results: list[dict[str, Any]] = []
        for start in range(0, len(book_ids), batch_size):
            batch = book_ids[start:start + batch_size]
            for book_id in batch:
                try:
                    results.append(await self.index_sach(book_id, backend_path=backend_path))
                except Exception as exc:
                    results.append({"entity_id": str(book_id), "status": INDEX_STATUS_FAILED, "error": str(exc)})
        return {"total": len(book_ids), "success": sum(1 for item in results if item.get("status") == INDEX_STATUS_INDEXED), "failed": sum(1 for item in results if item.get("status") == INDEX_STATUS_FAILED), "results": results}

sach_indexing_service = SachIndexingService()

def tao_sach_indexing_service(**kwargs: Any) -> SachIndexingService:
    return SachIndexingService(**kwargs)