import asyncio
import hashlib
import json
import logging
import re
from typing import Any, Protocol

from app.core.config import get_settings
from app.core.exceptions import AIBackendException, AIValidationException
from app.integrations.backend_client import backend_client, tao_backend_client
from app.integrations.redis import redis_client
from app.services.retrieval.loc_quyen_truy_cap import BoLocTruyCap, LocQuyenTruyCapService, loc_quyen_truy_cap_service
from app.services.retrieval.tim_kiem_vector import TimKiemVectorService, tim_kiem_vector_service
from app.services.retrieval.trich_dan import TrichDanService, trich_dan_service

logger = logging.getLogger("bookflow-ai.retrieval.hybrid")

BACKEND_BUSINESS_SEARCH_PATH = "/api/internal/ai/tim-kiem-nghiep-vu"
BACKEND_CURRENT_FILTER_PATH = "/api/internal/ai/kiem-tra-nghiep-vu"

_IDENTIFIER_PATTERN = re.compile(r"\b\d{8,20}\b|\b[A-Z0-9]+[-_][A-Z0-9_-]+\b", re.IGNORECASE)
_WORD_PATTERN = re.compile(r"[0-9A-Za-zÀ-ỹĐđ]+", re.UNICODE)


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


class BusinessSearchProvider(Protocol):
    async def tim_kiem(self, query: str, user_context: dict[str, Any] | None, keywords: list[str], filters: dict[str, Any], limit: int) -> list[dict[str, Any]]:
        ...

    async def loc_hien_tai(self, entity_ids: list[Any], user_context: dict[str, Any] | None, filters: dict[str, Any]) -> list[dict[str, Any]]:
        ...


class BackendBusinessSearchProvider:
    def __init__(self, client=None, search_path: str = BACKEND_BUSINESS_SEARCH_PATH, current_filter_path: str = BACKEND_CURRENT_FILTER_PATH):
        self.client = client or backend_client
        self.search_path = search_path
        self.current_filter_path = current_filter_path

    async def tim_kiem(self, query: str, user_context: dict[str, Any] | None, keywords: list[str], filters: dict[str, Any], limit: int) -> list[dict[str, Any]]:
        client = self.client
        if client is None:
            client = tao_backend_client(get_settings())
            await client.khoi_tao()
        payload = {
            "query": query,
            "keywords": keywords,
            "filters": filters,
            "limit": limit,
            "user_context": user_context or {}
        }
        response = await client.post(self.search_path, json_data=payload)
        return _lay_danh_sach(response)

    async def loc_hien_tai(self, entity_ids: list[Any], user_context: dict[str, Any] | None, filters: dict[str, Any]) -> list[dict[str, Any]]:
        if not entity_ids:
            return []
        client = self.client
        if client is None:
            client = tao_backend_client(get_settings())
            await client.khoi_tao()
        payload = {
            "entity_ids": entity_ids,
            "filters": filters,
            "user_context": user_context or {}
        }
        response = await client.post(self.current_filter_path, json_data=payload)
        return _lay_danh_sach(response)


class TimKiemKetHopService:
    def __init__(self, vector_service: TimKiemVectorService | None = None, access_service: LocQuyenTruyCapService | None = None, citation_service: TrichDanService | None = None, business_provider: BusinessSearchProvider | None = None, semantic_weight: float = 0.55, keyword_weight: float = 0.45, exact_match_boost: float = 0.10, cache_enabled: bool = True, cache_ttl: int = 60):
        if semantic_weight < 0 or keyword_weight < 0 or semantic_weight + keyword_weight <= 0:
            raise ValueError("Trọng số hybrid không hợp lệ")
        self.vector_service = vector_service or tim_kiem_vector_service
        self.access_service = access_service or loc_quyen_truy_cap_service
        self.citation_service = citation_service or trich_dan_service
        self.business_provider = business_provider or BackendBusinessSearchProvider()
        self.semantic_weight = semantic_weight
        self.keyword_weight = keyword_weight
        self.exact_match_boost = exact_match_boost
        self.cache_enabled = cache_enabled
        self.cache_ttl = cache_ttl

    async def tim_kiem(self, query: str, user_context: dict[str, Any] | None = None, filters: dict[str, Any] | None = None, keywords: list[str] | None = None, intent: str | None = None, entities: dict[str, Any] | None = None, limit: int = 10, offset: int = 0) -> dict[str, Any]:
        query = str(query or "").strip()
        if not query:
            raise AIValidationException("Query tìm kiếm không được để trống")
        if len(query) > 5000:
            raise AIValidationException("Query tìm kiếm vượt quá giới hạn 5000 ký tự")
        limit = max(1, min(int(limit or 10), 50))
        offset = max(0, int(offset or 0))
        filters = dict(filters or {})
        entities = dict(entities or {})
        keywords = self._phan_tich_keywords(query, keywords)
        bo_loc = self.access_service.tao_bo_loc(user_context)
        cache_key = self._tao_cache_key(query, bo_loc, filters, keywords, intent, entities, limit, offset)
        cached = await self._lay_cache(cache_key)
        if cached is not None:
            return cached
        vector_task = asyncio.create_task(self._tim_vector(query, user_context, filters, limit, offset))
        business_task = asyncio.create_task(self._tim_business(query, user_context, keywords, filters, limit))
        vector_result, business_result = await asyncio.gather(vector_task, business_task, return_exceptions=True)
        vector_error = vector_result if isinstance(vector_result, Exception) else None
        business_error = business_result if isinstance(business_result, Exception) else None
        vector_items = [] if vector_error else vector_result.get("results", [])
        business_items = [] if business_error else business_result
        if vector_error:
            logger.warning("Vector search thất bại, fallback business search: %s", vector_error)
        if business_error:
            logger.warning("Business search thất bại, fallback vector search: %s", business_error)
        if vector_error and business_error:
            if self._can_bo_qua_backend_filter(filters):
                raise AIBackendException("Không thể thực hiện cả vector search và business search", details={"vector_error": str(vector_error), "business_error": str(business_error)})
            raise AIBackendException("Không thể xác thực dữ liệu nghiệp vụ hiện tại", details={"vector_error": str(vector_error), "business_error": str(business_error)})
        merged = self._merge_candidates(vector_items, business_items, query)
        merged = self._loc_hien_tai_neu_can(merged, user_context, filters)
        if asyncio.iscoroutine(merged):
            merged = await merged
        merged = self.access_service.loc_ket_qua(merged, bo_loc)
        merged.sort(key=lambda item: float(item.get("score", 0)), reverse=True)
        paged = merged[offset:offset + limit]
        paged = await self.citation_service.tao_citations(paged)
        result = {
            "query": query,
            "results": paged,
            "total": len(merged),
            "metadata": {
                "search_type": "HYBRID",
                "intent": intent,
                "keywords": keywords,
                "filters": filters,
                "vector_count": len(vector_items),
                "business_count": len(business_items),
                "fallback": {
                    "vector": vector_error is not None,
                    "business": business_error is not None
                },
                "limit": limit,
                "offset": offset,
                "access_scope": list(bo_loc.allowed_scopes)
            }
        }
        await self._luu_cache(cache_key, result)
        return result

    async def _tim_vector(self, query: str, user_context: dict[str, Any] | None, filters: dict[str, Any], limit: int, offset: int) -> dict[str, Any]:
        return await self.vector_service.tim_kiem(query=query, user_context=user_context, filters=filters, limit=min(limit * 2, 50), offset=offset)

    async def _tim_business(self, query: str, user_context: dict[str, Any] | None, keywords: list[str], filters: dict[str, Any], limit: int) -> list[dict[str, Any]]:
        return await self.business_provider.tim_kiem(query=query, user_context=user_context, keywords=keywords, filters=filters, limit=min(limit * 2, 50))

    def _phan_tich_keywords(self, query: str, keywords: list[str] | None) -> list[str]:
        if keywords:
            return list(dict.fromkeys(str(item).strip() for item in keywords if str(item).strip()))[:20]
        words = _WORD_PATTERN.findall(query)
        return list(dict.fromkeys(words))[:20]

    def _merge_candidates(self, vector_items: list[dict[str, Any]], business_items: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
        merged: dict[str, dict[str, Any]] = {}
        for item in vector_items:
            normalized = self._chuan_hoa_vector_item(item, query)
            key = self._candidate_key(normalized)
            if key not in merged:
                merged[key] = normalized
            else:
                merged[key] = self._hop_nhat(merged[key], normalized)
        for item in business_items:
            normalized = self._chuan_hoa_business_item(item, query)
            key = self._candidate_key(normalized)
            if key not in merged:
                merged[key] = normalized
            else:
                merged[key] = self._hop_nhat(merged[key], normalized)
        return list(merged.values())

    def _chuan_hoa_vector_item(self, item: dict[str, Any], query: str) -> dict[str, Any]:
        result = dict(item)
        semantic_score = self._normal_score(item.get("semantic_score", item.get("score", 0)))
        result["semantic_score"] = semantic_score
        result["keyword_score"] = self._normal_score(item.get("keyword_score", 0))
        result["exact_match"] = bool(item.get("exact_match", False))
        result["score"] = self._tinh_score(result)
        result["metadata"] = dict(item.get("metadata") or {})
        return result

    def _chuan_hoa_business_item(self, item: dict[str, Any], query: str) -> dict[str, Any]:
        result = dict(item)
        keyword_score = self._normal_score(item.get("keyword_score", item.get("score", item.get("relevance_score", 0))))
        exact_match = bool(item.get("exact_match", item.get("exactMatch", False)))
        if not exact_match:
            exact_match = self._kiem_tra_exact_match(query, item)
        result["keyword_score"] = keyword_score
        result["semantic_score"] = self._normal_score(item.get("semantic_score", 0))
        result["exact_match"] = exact_match
        result["score"] = self._tinh_score(result)
        result["metadata"] = dict(item.get("metadata") or {})
        return result

    def _hop_nhat(self, current: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
        result = dict(current)
        result["semantic_score"] = max(self._normal_score(current.get("semantic_score", 0)), self._normal_score(incoming.get("semantic_score", 0)))
        result["keyword_score"] = max(self._normal_score(current.get("keyword_score", 0)), self._normal_score(incoming.get("keyword_score", 0)))
        result["exact_match"] = bool(current.get("exact_match") or incoming.get("exact_match"))
        result["score"] = self._tinh_score(result)
        for key, value in incoming.items():
            if result.get(key) in (None, "", [], {}):
                result[key] = value
        result["metadata"] = {**dict(current.get("metadata") or {}), **dict(incoming.get("metadata") or {})}
        return result

    def _tinh_score(self, item: dict[str, Any]) -> float:
        semantic = self._normal_score(item.get("semantic_score", 0))
        keyword = self._normal_score(item.get("keyword_score", 0))
        total_weight = self.semantic_weight + self.keyword_weight
        score = (semantic * self.semantic_weight + keyword * self.keyword_weight) / total_weight
        if item.get("exact_match"):
            score = min(1.0, score + self.exact_match_boost)
        return round(score, 6)

    def _kiem_tra_exact_match(self, query: str, item: dict[str, Any]) -> bool:
        normalized_query = self._chuan_hoa_text(query)
        if not normalized_query:
            return False
        for key in ("isbn", "ma_sach", "code", "ma", "title", "ten", "name"):
            value = item.get(key)
            if value is None:
                value = (item.get("metadata") or {}).get(key)
            if value is None:
                continue
            normalized_value = self._chuan_hoa_text(str(value))
            if normalized_value and normalized_value == normalized_query:
                return True
        identifier = _IDENTIFIER_PATTERN.search(query)
        if identifier:
            token = self._chuan_hoa_text(identifier.group(0))
            for key in ("isbn", "ma_sach", "code", "ma"):
                value = item.get(key) or (item.get("metadata") or {}).get(key)
                if value is not None and self._chuan_hoa_text(str(value)) == token:
                    return True
        return False

    def _chuan_hoa_text(self, value: str) -> str:
        return re.sub(r"\s+", " ", str(value or "").strip().casefold())

    def _normal_score(self, value: Any) -> float:
        try:
            score = float(value)
        except (TypeError, ValueError):
            return 0.0
        if score < 0:
            return 0.0
        if score > 1:
            return 1.0
        return score

    def _candidate_key(self, item: dict[str, Any]) -> str:
        if item.get("entity_id") is not None:
            return f"entity:{item['entity_id']}"
        if item.get("source_id") is not None:
            return f"source:{item['source_id']}"
        if item.get("chunk_id") is not None:
            return f"chunk:{item['chunk_id']}"
        return f"anonymous:{hashlib.sha256(json.dumps(item, ensure_ascii=False, sort_keys=True, default=str).encode()).hexdigest()}"

    async def _loc_hien_tai_neu_can(self, items: list[dict[str, Any]], user_context: dict[str, Any] | None, filters: dict[str, Any]) -> list[dict[str, Any]]:
        if not self._can_bo_qua_backend_filter(filters):
            entity_ids = []
            for item in items:
                entity_id = item.get("entity_id")
                if entity_id is not None and entity_id not in entity_ids:
                    entity_ids.append(entity_id)
            if not entity_ids:
                raise AIBackendException("Không xác định được entity_id để kiểm tra dữ liệu nghiệp vụ hiện tại")
            try:
                current_items = await self.business_provider.loc_hien_tai(entity_ids, user_context, filters)
            except Exception as error:
                raise AIBackendException("Không thể xác thực dữ liệu nghiệp vụ hiện tại", details=str(error)) from error
            allowed_ids, current_map = self._phan_tich_ket_qua_hien_tai(current_items)
            if allowed_ids is not None:
                return [item for item in items if item.get("entity_id") in allowed_ids]
            ket_qua = []
            for item in items:
                entity_id = item.get("entity_id")
                current = current_map.get(str(entity_id))
                if current is None:
                    continue
                merged = dict(item)
                merged.update({key: value for key, value in current.items() if key not in ("score", "semantic_score", "keyword_score", "citation")})
                ket_qua.append(merged)
            return ket_qua
        return items

    def _phan_tich_ket_qua_hien_tai(self, data: list[dict[str, Any]]) -> tuple[set[Any] | None, dict[str, dict[str, Any]]]:
        if not data:
            return set(), {}
        allowed_ids = set()
        current_map: dict[str, dict[str, Any]] = {}
        for item in data:
            entity_id = item.get("entity_id", item.get("id", item.get("sach_id")))
            if entity_id is None:
                continue
            if item.get("allowed") is True or item.get("duoc_phep") is True or item.get("hop_le") is True:
                allowed_ids.add(entity_id)
            current_map[str(entity_id)] = item
        if allowed_ids:
            return allowed_ids, current_map
        return None, current_map

    def _can_bo_qua_backend_filter(self, filters: dict[str, Any]) -> bool:
        dynamic_keys = {
            "availability",
            "available",
            "con_hang",
            "ton_kho",
            "so_luong_toi_thieu",
            "soLuongToiThieu",
            "chi_nhanh_id",
            "chiNhanhId",
            "gia_hien_tai",
            "price_current",
            "trang_thai",
            "trang_thai_ton",
            "current_only"
        }
        return not any(key in filters for key in dynamic_keys)

    def _tao_cache_key(self, query: str, bo_loc: BoLocTruyCap, filters: dict[str, Any], keywords: list[str], intent: str | None, entities: dict[str, Any], limit: int, offset: int) -> str:
        payload = {
            "query": query,
            "access": bo_loc.fingerprint_data(),
            "filters": filters,
            "keywords": keywords,
            "intent": intent,
            "entities": entities,
            "limit": limit,
            "offset": offset
        }
        raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
        digest = hashlib.sha256(raw.encode()).hexdigest()
        return f"bookflow:ai:retrieval:v1:{digest}"

    async def _lay_cache(self, key: str) -> dict[str, Any] | None:
        if not self.cache_enabled or redis_client is None:
            return None
        try:
            raw = await redis_client.lay(key)
            if not raw:
                return None
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            data = json.loads(raw)
            return data if isinstance(data, dict) else None
        except Exception as error:
            logger.warning("Không đọc được retrieval cache: %s", error)
            return None

    async def _luu_cache(self, key: str, data: dict[str, Any]) -> None:
        if not self.cache_enabled or redis_client is None:
            return
        try:
            payload = json.dumps(data, ensure_ascii=False, default=str)
            await redis_client.dat(key, payload, self.cache_ttl)
        except Exception as error:
            logger.warning("Không ghi được retrieval cache: %s", error)


tim_kiem_ket_hop_service = TimKiemKetHopService()