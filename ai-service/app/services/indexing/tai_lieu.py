from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Protocol
from app.core.exceptions import AIBackendException, AIProviderException, AIServiceException
from app.integrations.backend_client import BackendClient, backend_client
from app.integrations.storage import StorageClient, storage_client
from app.providers.base import EmbeddingProvider
from app.providers.embeddings import embedding_provider
from app.repositories.doan_du_lieu import DoanDuLieuRepository, doan_du_lieu_repository
from app.repositories.nguon_du_lieu import NguonDuLieuRepository, nguon_du_lieu_repository
from app.services.indexing.chia_doan import ChiaDoanService, chia_doan_service

BACKEND_TAI_LIEU_PATH = "/api/internal/ai/tai-lieu/{file_id}"
SOURCE_TYPE = "DOCUMENT"
ENTITY_TYPE = "DOCUMENT"
INDEX_STATUS_PROCESSING = "PROCESSING"
INDEX_STATUS_INDEXED = "INDEXED"
INDEX_STATUS_FAILED = "FAILED"
SOURCE_STATUS_ACTIVE = "ACTIVE"
SOURCE_STATUS_INACTIVE = "INACTIVE"

class ExtractionProvider(Protocol):
    async def trich_xuat(self, *, file_id: int | str, document_type: str, content: bytes | None = None, metadata: dict[str, Any] | None = None) -> Any:
        ...

class TaiLieuIndexingService:
    def __init__(self, *, backend: BackendClient | None = None, storage: StorageClient | None = None, embedding: EmbeddingProvider | None = None, source_repository: NguonDuLieuRepository | None = None, chunk_repository: DoanDuLieuRepository | None = None, chunker: ChiaDoanService | None = None, extractor: ExtractionProvider | None = None):
        self.backend = backend or backend_client
        self.storage = storage or storage_client
        self.embedding = embedding or embedding_provider
        self.source_repository = source_repository or nguon_du_lieu_repository
        self.chunk_repository = chunk_repository or doan_du_lieu_repository
        self.chunker = chunker or chia_doan_service
        self.extractor = extractor
    async def _lay_du_lieu_tai_lieu(self, file_id: int | str, don_vi_id: int | str, backend_path: str | None = None) -> dict[str, Any]:
        path = (backend_path or BACKEND_TAI_LIEU_PATH).format(file_id=file_id)
        try:
            response = await self.backend.get(path, params={"don_vi_id": don_vi_id})
        except Exception as exc:
            raise AIBackendException(f"Không thể lấy metadata tài liệu {file_id} từ Backend", details={"file_id": file_id}) from exc
        if not isinstance(response, dict):
            raise AIBackendException("Backend trả metadata tài liệu không hợp lệ", details={"file_id": file_id})
        data = response.get("data", response)
        if not isinstance(data, dict):
            raise AIBackendException("Backend trả metadata tài liệu không hợp lệ", details={"file_id": file_id})
        return data
    async def _lay_file_bytes(self, du_lieu: dict[str, Any]) -> bytes | None:
        content = du_lieu.get("content_bytes")
        if isinstance(content, bytes):
            return content
        storage_key = du_lieu.get("storage_key") or du_lieu.get("object_key") or du_lieu.get("file_key")
        if not storage_key:
            return None
        try:
            storage_bucket = du_lieu.get("storage_bucket") or du_lieu.get("bucket")
            return await self.storage.download_bytes(str(storage_key), bucket=storage_bucket)
        except Exception as exc:
            raise AIServiceException("Không thể đọc file từ storage", code="STORAGE_READ_FAILED", status_code=502, details={"storage_key": storage_key}) from exc
    async def _lay_text(self, du_lieu: dict[str, Any], file_id: int | str, document_type: str) -> tuple[str, list[dict[str, Any]] | None]:
        existing_blocks = du_lieu.get("blocks")
        normalized_existing_blocks = existing_blocks if isinstance(existing_blocks, list) else None
        for key in ("extracted_text", "text", "content"):
            value = du_lieu.get(key)
            if isinstance(value, str) and value.strip():
                return value, normalized_existing_blocks
        file_bytes = await self._lay_file_bytes(du_lieu)
        if self.extractor is None:
            raise AIServiceException("Tài liệu chưa có text và chưa cấu hình extraction/OCR provider", code="EXTRACTION_PROVIDER_UNAVAILABLE", status_code=503, details={"file_id": file_id, "document_type": document_type})
        try:
            result = await self.extractor.trich_xuat(file_id=file_id, document_type=document_type, content=file_bytes, metadata=du_lieu)
        except Exception as exc:
            raise AIServiceException("Extraction/OCR tài liệu thất bại", code="EXTRACTION_FAILED", status_code=422, details={"file_id": file_id, "document_type": document_type}) from exc
        if isinstance(result, str):
            return result, None
        if isinstance(result, dict):
            text = result.get("text") or result.get("content") or ""
            blocks = result.get("blocks")
            normalized_blocks = blocks if isinstance(blocks, list) else None
            if isinstance(text, str) and text.strip():
                return text, normalized_blocks
            if normalized_blocks:
                block_text = "\n\n".join(str(item.get("content") or item.get("text") or "") for item in normalized_blocks if isinstance(item, dict))
                if block_text.strip():
                    return block_text, normalized_blocks
        raise AIServiceException("Extraction/OCR không trả về nội dung văn bản", code="EXTRACTION_EMPTY", status_code=422, details={"file_id": file_id})
    def _lay_version(self, du_lieu: dict[str, Any]) -> int:
        value = du_lieu.get("version") or du_lieu.get("document_version") or du_lieu.get("index_version") or 1
        try:
            return max(1, int(value))
        except (TypeError, ValueError):
            return 1
    def _lay_access_scope(self, du_lieu: dict[str, Any]) -> dict[str, Any]:
        value = du_lieu.get("access_scope") or du_lieu.get("pham_vi_truy_cap") or {}
        return dict(value) if isinstance(value, dict) else {}
    def _lay_metadata(self, du_lieu: dict[str, Any], file_id: int | str, document_type: str) -> dict[str, Any]:
        metadata = dict(du_lieu.get("metadata") or {}) if isinstance(du_lieu.get("metadata"), dict) else {}
        metadata.update({"entity_type": ENTITY_TYPE, "entity_id": str(du_lieu.get("document_id") or file_id), "file_id": file_id, "document_type": document_type, "title": du_lieu.get("title") or du_lieu.get("ten")})
        for key in ("author", "department", "category", "page_count"):
            if du_lieu.get(key) is not None:
                metadata[key] = du_lieu[key]
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
    async def index_tai_lieu(self, file_id: int | str, *, don_vi_id: int | str, du_lieu: dict[str, Any] | None = None, backend_path: str | None = None, force: bool = False) -> dict[str, Any]:
        if don_vi_id in (None, ""):
            raise AIServiceException("Thiếu don_vi_id để index tài liệu", code="INDEX_TENANT_REQUIRED", status_code=422, details={"file_id": file_id})
        if du_lieu is None:
            du_lieu = await self._lay_du_lieu_tai_lieu(file_id, don_vi_id, backend_path)
        document_type = str(du_lieu.get("document_type") or du_lieu.get("loai_tai_lieu") or du_lieu.get("mime_type") or "UNKNOWN").upper()
        text, blocks = await self._lay_text(du_lieu, file_id, document_type)
        if not text.strip():
            raise AIServiceException("Tài liệu không có nội dung để lập chỉ mục", code="INDEX_CONTENT_EMPTY", status_code=422, details={"file_id": file_id})
        requested_version = self._lay_version(du_lieu)
        access_scope = self._lay_access_scope(du_lieu)
        metadata = self._lay_metadata(du_lieu, file_id, document_type)
        content_hash = self.chunker.tinh_hash(text)
        entity_id = du_lieu.get("document_id") or file_id
        existing_sources = await self.source_repository.tim_theo_entity(ENTITY_TYPE, entity_id)
        existing_index = self._tim_source_da_index(existing_sources, requested_version, content_hash)
        if existing_index and not force:
            return {"source_id": existing_index["source_id"], "entity_id": str(entity_id), "file_id": str(file_id), "version": requested_version, "status": INDEX_STATUS_INDEXED, "skipped": True, "chunk_count": existing_index.get("chunk_count", 0)}
        version = self._lay_version_moi(existing_sources, requested_version)
        title = str(du_lieu.get("title") or du_lieu.get("ten") or f"Tài liệu {file_id}")
        source = await self.source_repository.tao(source_type=SOURCE_TYPE, entity_type=ENTITY_TYPE, entity_id=entity_id, file_id=int(file_id) if str(file_id).isdigit() else None, title=title, version=version, checksum=content_hash, access_scope=access_scope, status=SOURCE_STATUS_ACTIVE, metadata=metadata)
        if source is None:
            raise AIServiceException("Không thể tạo source cho tài liệu", code="INDEX_SOURCE_CREATE_FAILED", status_code=500, details={"file_id": file_id})
        source_id = source["source_id"]
        await self.source_repository.cap_nhat_trang_thai_index(source_id, index_status=INDEX_STATUS_PROCESSING)
        chunks = self.chunker.chia(source_id=source_id, source_type=SOURCE_TYPE, content=text, metadata={"entity_type": ENTITY_TYPE, "entity_id": str(entity_id), "file_id": file_id, "document_type": document_type, "title": title, "access_scope": access_scope, **metadata}, version=version, blocks=blocks)
        errors = self.chunker.kiem_tra(chunks)
        if errors:
            await self.source_repository.cap_nhat_trang_thai_index(source_id, index_status=INDEX_STATUS_FAILED)
            raise AIServiceException("Chunk tài liệu không hợp lệ", code="INDEX_CHUNK_INVALID", status_code=422, details={"file_id": file_id, "errors": errors})
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
            return {"source_id": source_id, "entity_id": str(entity_id), "file_id": str(file_id), "version": version, "status": INDEX_STATUS_INDEXED, "skipped": False, "chunk_count": len(saved_chunks)}
        except Exception:
            await self.source_repository.cap_nhat_trang_thai_index(source_id, index_status=INDEX_STATUS_FAILED)
            raise
    async def reindex_tai_lieu(self, file_id: int | str, *, du_lieu: dict[str, Any] | None = None, backend_path: str | None = None) -> dict[str, Any]:
        return await self.index_tai_lieu(file_id, du_lieu=du_lieu, backend_path=backend_path, force=True)
    async def index_nhieu_tai_lieu(self, file_ids: list[int | str], *, batch_size: int = 20, backend_path: str | None = None) -> dict[str, Any]:
        if batch_size <= 0:
            raise ValueError("batch_size phải lớn hơn 0")
        results: list[dict[str, Any]] = []
        for start in range(0, len(file_ids), batch_size):
            batch = file_ids[start:start + batch_size]
            for file_id in batch:
                try:
                    results.append(await self.index_tai_lieu(file_id, backend_path=backend_path))
                except Exception as exc:
                    results.append({"file_id": str(file_id), "status": INDEX_STATUS_FAILED, "error": str(exc)})
        return {"total": len(file_ids), "success": sum(1 for item in results if item.get("status") == INDEX_STATUS_INDEXED), "failed": sum(1 for item in results if item.get("status") == INDEX_STATUS_FAILED), "results": results}

tai_lieu_indexing_service = TaiLieuIndexingService()

def tao_tai_lieu_indexing_service(**kwargs: Any) -> TaiLieuIndexingService:
    return TaiLieuIndexingService(**kwargs)