from typing import Any
import logging

from app.core.config import get_settings
from app.core.exceptions import AIProviderException, AIValidationException
from app.providers.embeddings import embedding_provider, tao_embedding_provider
from app.repositories.doan_du_lieu import doan_du_lieu_repository
from app.repositories.nguon_du_lieu import nguon_du_lieu_repository
from app.services.retrieval.loc_quyen_truy_cap import BoLocTruyCap, LocQuyenTruyCapService, loc_quyen_truy_cap_service

logger = logging.getLogger("bookflow-ai.retrieval.vector")

TRANG_THAI_SOURCE_HOP_LE = frozenset({"INDEXED", "ACTIVE", "HOAT_DONG"})
TRANG_THAI_CHUNK_HOP_LE = frozenset({"ACTIVE", "INDEXED", "HOAT_DONG"})


def _lay_danh_sach(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if not isinstance(data, dict):
        return []
    if isinstance(data.get("results"), list):
        return [item for item in data["results"] if isinstance(item, dict)]
    if isinstance(data.get("items"), list):
        return [item for item in data["items"] if isinstance(item, dict)]
    if isinstance(data.get("data"), list):
        return [item for item in data["data"] if isinstance(item, dict)]
    if isinstance(data.get("data"), dict):
        return _lay_danh_sach(data["data"])
    return []


class TimKiemVectorService:
    def __init__(self, repository=None, source_repository=None, access_service: LocQuyenTruyCapService | None = None, similarity_threshold: float | None = None):
        self.repository = repository or doan_du_lieu_repository
        self.source_repository = source_repository or nguon_du_lieu_repository
        self.access_service = access_service or loc_quyen_truy_cap_service
        self.similarity_threshold = similarity_threshold

    async def tim_kiem(self, query: str, user_context: dict[str, Any] | None = None, filters: dict[str, Any] | None = None, limit: int = 10, offset: int = 0, similarity_threshold: float | None = None) -> dict[str, Any]:
        query = str(query or "").strip()
        if not query:
            raise AIValidationException("Query tìm kiếm không được để trống")
        if len(query) > 5000:
            raise AIValidationException("Query tìm kiếm vượt quá giới hạn 5000 ký tự")
        limit = max(1, min(int(limit or 10), 50))
        offset = max(0, int(offset or 0))
        threshold = self.similarity_threshold if similarity_threshold is None else similarity_threshold
        if threshold is not None and not 0 <= float(threshold) <= 1:
            raise AIValidationException("similarity_threshold phải nằm trong khoảng 0 đến 1")
        bo_loc = self.access_service.tao_bo_loc(user_context)
        vector = await self._tao_embedding(query)
        raw_results = await self.repository.tim_kiem_vector(
            vector=vector,
            bo_loc=bo_loc.to_dict(),
            filters=filters or {},
            limit=limit,
            offset=offset,
            nguong_similarity=threshold
        )
        candidates = _lay_danh_sach(raw_results)
        candidates = self._chuan_hoa_ket_qua(candidates)
        candidates = await self._loc_source_khong_hop_le(candidates, bo_loc)
        candidates = self.access_service.loc_ket_qua(candidates, bo_loc)
        candidates = candidates[:limit]
        return {
            "query": query,
            "results": candidates,
            "total": len(candidates),
            "metadata": {
                "search_type": "VECTOR",
                "limit": limit,
                "offset": offset,
                "similarity_threshold": threshold,
                "access_scope": list(bo_loc.allowed_scopes)
            }
        }

    async def _tao_embedding(self, query: str) -> list[float]:
        provider = embedding_provider
        if provider is None:
            provider = tao_embedding_provider(get_settings())
        try:
            if not provider.san_sang():
                await provider.khoi_tao()
            response = await provider.embed([query])
        except Exception as error:
            if isinstance(error, AIProviderException):
                raise
            raise AIProviderException("Không thể tạo embedding cho query tìm kiếm", details=str(error)) from error
        if not response.vectors or not response.vectors[0]:
            raise AIProviderException("Embedding provider không trả về vector")
        return response.vectors[0]

    def _chuan_hoa_ket_qua(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ket_qua = []
        for item in results:
            score = item.get("similarity", item.get("score", item.get("relevance_score", 0)))
            try:
                score = float(score)
            except (TypeError, ValueError):
                score = 0.0
            metadata = dict(item.get("metadata") or {})
            result = {
                "chunk_id": item.get("chunk_id", item.get("doan_id")),
                "source_id": item.get("source_id", item.get("nguon_id")),
                "entity_id": item.get("entity_id"),
                "content": item.get("content", item.get("noi_dung", "")),
                "score": score,
                "semantic_score": score,
                "version": item.get("version", item.get("source_version")),
                "metadata": metadata,
                "citation": None
            }
            for key in ("access_scope", "don_vi_id", "chi_nhanh_id", "owner_id"):
                if item.get(key) is not None:
                    result[key] = item[key]
                    metadata[key] = item[key]
            ket_qua.append(result)
        return ket_qua

    async def _loc_source_khong_hop_le(self, results: list[dict[str, Any]], bo_loc: BoLocTruyCap) -> list[dict[str, Any]]:
        source_ids = []
        for result in results:
            source_id = result.get("source_id")
            if source_id is not None and source_id not in source_ids:
                source_ids.append(source_id)
        if not source_ids:
            return []
        raw_sources = await self.source_repository.tim_theo_ids(source_ids)
        sources = _lay_danh_sach(raw_sources)
        source_map = {str(item.get("id", item.get("source_id", item.get("nguon_id")))): item for item in sources}
        ket_qua = []
        for result in results:
            source_id = result.get("source_id")
            source = source_map.get(str(source_id))
            if not source:
                continue
            if not self._source_dang_hoat_dong(source):
                continue
            if not self._chunk_dang_hop_le(result):
                continue
            if not self._version_hop_le(result, source):
                continue
            metadata = dict(source.get("metadata") or {})
            metadata.update(result.get("metadata") or {})
            for key in ("access_scope", "don_vi_id", "chi_nhanh_id", "entity_id", "owner_id"):
                if source.get(key) is not None:
                    metadata[key] = source[key]
            result["metadata"] = metadata
            if not self.access_service.kiem_tra_metadata(metadata, bo_loc):
                continue
            ket_qua.append(result)
        return ket_qua

    def _source_dang_hoat_dong(self, source: dict[str, Any]) -> bool:
        if source.get("is_active") is False or source.get("active") is False:
            return False
        status = source.get("status", source.get("trang_thai"))
        if status is None:
            return True
        return str(status).strip().upper() in TRANG_THAI_SOURCE_HOP_LE

    def _chunk_dang_hop_le(self, result: dict[str, Any]) -> bool:
        status = result.get("chunk_status", result.get("status", result.get("trang_thai")))
        if status is None:
            return True
        return str(status).strip().upper() in TRANG_THAI_CHUNK_HOP_LE

    def _version_hop_le(self, result: dict[str, Any], source: dict[str, Any]) -> bool:
        result_version = result.get("version", result.get("source_version"))
        source_version = source.get("version", source.get("phien_ban"))
        if result_version is not None and source_version is not None and str(result_version) != str(source_version):
            return False
        result_hash = result.get("content_hash")
        source_hash = source.get("content_hash")
        if result_hash and source_hash and str(result_hash) != str(source_hash):
            return False
        return True


tim_kiem_vector_service = TimKiemVectorService()