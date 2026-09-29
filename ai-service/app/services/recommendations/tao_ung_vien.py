import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.core.exceptions import AIBackendException, AIValidationException
from app.integrations.backend_client import backend_client, tao_backend_client
from app.services.retrieval.loc_quyen_truy_cap import BoLocTruyCap, LocQuyenTruyCapService, loc_quyen_truy_cap_service
from app.services.retrieval.tim_kiem_ket_hop import TimKiemKetHopService, tim_kiem_ket_hop_service

logger = logging.getLogger("bookflow-ai.recommendations.candidates")

RECOMMENDATION_CONTEXT_HOME = "HOME"
RECOMMENDATION_CONTEXT_BOOK_DETAIL = "BOOK_DETAIL"
RECOMMENDATION_CONTEXT_SEARCH = "SEARCH"
RECOMMENDATION_CONTEXT_PERSONAL = "PERSONAL"
RECOMMENDATION_CONTEXT_CHAT = "CHAT"
RECOMMENDATION_CONTEXT_STAFF = "STAFF"

RECOMMENDATION_MODE_ANY = "ANY"
RECOMMENDATION_MODE_PURCHASE = "PURCHASE"
RECOMMENDATION_MODE_BORROW = "BORROW"
RECOMMENDATION_MODE_RENT = "RENT"
RECOMMENDATION_MODE_READ = "READ"

CANDIDATE_SOURCE_VECTOR = "VECTOR"
CANDIDATE_SOURCE_QUERY = "QUERY"
CANDIDATE_SOURCE_CURRENT_BOOK = "CURRENT_BOOK"
CANDIDATE_SOURCE_SAME_AUTHOR = "SAME_AUTHOR"
CANDIDATE_SOURCE_SAME_CATEGORY = "SAME_CATEGORY"
CANDIDATE_SOURCE_RELATED_BOOK = "RELATED_BOOK"
CANDIDATE_SOURCE_USER_HISTORY = "USER_HISTORY"
CANDIDATE_SOURCE_CONTEXT = "CONTEXT"
CANDIDATE_SOURCE_BUSINESS = "BUSINESS"

BACKEND_SACH_PATH = "/api/internal/ai/sach/{book_id}"
BACKEND_LICH_SU_PATH = "/api/internal/ai/nguoi-dung/{user_id}/lich-su-sach"
BACKEND_CANDIDATE_PATH = "/api/internal/ai/goi-y/ung-vien"
BACKEND_VALIDATE_PATH = "/api/internal/ai/goi-y/kiem-tra"


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


def _lay_id(item: dict[str, Any]) -> Any:
    return item.get("book_id", item.get("sach_id", item.get("entity_id", item.get("id"))))


def _lay_values(value: Any) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, (list, tuple, set)):
        value = [value]
    result = []
    for item in value:
        if isinstance(item, dict):
            item = item.get("name", item.get("ten", item.get("title", item.get("ho_ten"))))
        if item is not None and str(item).strip():
            result.append(str(item).strip())
    return result


@dataclass(slots=True)
class RecommendationContext:
    context_type: str = RECOMMENDATION_CONTEXT_HOME
    user_id: Any = None
    source_book_id: Any = None
    query: str | None = None
    filters: dict[str, Any] = field(default_factory=dict)
    recommendation_mode: str = RECOMMENDATION_MODE_ANY
    personalization_allowed: bool = False
    business_validation_required: bool = False
    excluded_book_ids: tuple[Any, ...] = field(default_factory=tuple)
    limit: int = 10
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def tu_dict(cls, data: dict[str, Any] | None) -> "RecommendationContext":
        data = data or {}
        excluded = data.get("excluded_book_ids", data.get("excludedBookIds", []))
        if not isinstance(excluded, (list, tuple, set)):
            excluded = [excluded]
        context_type = str(data.get("context_type", data.get("contextType", RECOMMENDATION_CONTEXT_HOME))).strip().upper()
        recommendation_mode = str(data.get("recommendation_mode", data.get("recommendationMode", RECOMMENDATION_MODE_ANY))).strip().upper()
        limit = max(1, min(int(data.get("limit", 10) or 10), 50))
        return cls(
            context_type=context_type,
            user_id=data.get("user_id", data.get("userId")),
            source_book_id=data.get("source_book_id", data.get("sourceBookId")),
            query=str(data.get("query", "")).strip() or None,
            filters=dict(data.get("filters") or {}),
            recommendation_mode=recommendation_mode,
            personalization_allowed=bool(data.get("personalization_allowed", data.get("personalizationAllowed", False))),
            business_validation_required=bool(data.get("business_validation_required", data.get("businessValidationRequired", False))),
            excluded_book_ids=tuple(item for item in excluded if item is not None),
            limit=limit,
            metadata=dict(data.get("metadata") or {})
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "context_type": self.context_type,
            "user_id": self.user_id,
            "source_book_id": self.source_book_id,
            "query": self.query,
            "filters": self.filters,
            "recommendation_mode": self.recommendation_mode,
            "personalization_allowed": self.personalization_allowed,
            "business_validation_required": self.business_validation_required,
            "excluded_book_ids": list(self.excluded_book_ids),
            "limit": self.limit,
            "metadata": self.metadata
        }


class RecommendationDataProvider(Protocol):
    async def lay_sach(self, book_id: Any, user_context: dict[str, Any] | None = None) -> dict[str, Any]:
        ...

    async def lay_lich_su(self, user_id: Any, user_context: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        ...

    async def tao_ung_vien_nghiep_vu(self, context: RecommendationContext, source_book: dict[str, Any] | None, history: list[dict[str, Any]], user_context: dict[str, Any] | None, limit: int) -> list[dict[str, Any]]:
        ...

    async def kiem_tra_kha_dung(self, book_ids: list[Any], context: RecommendationContext, user_context: dict[str, Any] | None) -> list[dict[str, Any]]:
        ...


class BackendRecommendationDataProvider:
    def __init__(self, client=None):
        self.client = client or backend_client

    async def _lay_client(self):
        client = self.client
        if client is None:
            client = tao_backend_client()
            await client.khoi_tao()
            return client
        if not client.san_sang():
            await client.khoi_tao()
        return client

    async def lay_sach(self, book_id: Any, user_context: dict[str, Any] | None = None) -> dict[str, Any]:
        client = await self._lay_client()
        path = BACKEND_SACH_PATH.format(book_id=book_id)
        try:
            response = await client.get(path, params={"don_vi_id": (user_context or {}).get("don_vi_id")})
        except Exception as error:
            raise AIBackendException("Không thể lấy thông tin sách từ Backend", details=str(error)) from error
        if isinstance(response, dict) and isinstance(response.get("data"), dict):
            return response["data"]
        if isinstance(response, dict):
            return response
        raise AIBackendException("Backend trả về dữ liệu sách không hợp lệ")

    async def lay_lich_su(self, user_id: Any, user_context: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        client = await self._lay_client()
        path = BACKEND_LICH_SU_PATH.format(user_id=user_id)
        try:
            response = await client.get(path)
        except Exception as error:
            raise AIBackendException("Không thể lấy lịch sử sách của người dùng", details=str(error)) from error
        if isinstance(response, dict) and response.get("personalization_allowed") is False:
            return []
        return _lay_danh_sach(response)

    async def tao_ung_vien_nghiep_vu(self, context: RecommendationContext, source_book: dict[str, Any] | None, history: list[dict[str, Any]], user_context: dict[str, Any] | None, limit: int) -> list[dict[str, Any]]:
        client = await self._lay_client()
        payload = {
            "context": context.to_dict(),
            "source_book": source_book or None,
            "history": history if context.personalization_allowed else [],
            "user_context": user_context or {},
            "limit": limit
        }
        try:
            response = await client.post(BACKEND_CANDIDATE_PATH, json_data=payload)
        except Exception as error:
            raise AIBackendException("Không thể tạo candidate nghiệp vụ từ Backend", details=str(error)) from error
        return _lay_danh_sach(response)

    async def kiem_tra_kha_dung(self, book_ids: list[Any], context: RecommendationContext, user_context: dict[str, Any] | None) -> list[dict[str, Any]]:
        if not book_ids:
            return []
        client = await self._lay_client()
        payload = {
            "book_ids": book_ids,
            "context": context.to_dict(),
            "user_context": user_context or {}
        }
        try:
            response = await client.post(BACKEND_VALIDATE_PATH, json_data=payload)
        except Exception as error:
            raise AIBackendException("Không thể kiểm tra trạng thái sách hiện tại", details=str(error)) from error
        return _lay_danh_sach(response)


class TaoUngVienService:
    def __init__(self, retrieval_service: TimKiemKetHopService | None = None, access_service: LocQuyenTruyCapService | None = None, data_provider: RecommendationDataProvider | None = None):
        self.retrieval_service = retrieval_service or tim_kiem_ket_hop_service
        self.access_service = access_service or loc_quyen_truy_cap_service
        self.data_provider = data_provider or BackendRecommendationDataProvider()

    async def tao_ung_vien(self, context: RecommendationContext | dict[str, Any], user_context: dict[str, Any] | None = None, limit: int | None = None) -> dict[str, Any]:
        context = context if isinstance(context, RecommendationContext) else RecommendationContext.tu_dict(context)
        limit = max(1, min(int(limit or context.limit or 20), 100))
        bo_loc = self.access_service.tao_bo_loc(user_context)
        source_book = None
        history = []
        if context.source_book_id is not None:
            source_book = await self.data_provider.lay_sach(context.source_book_id, user_context)
        if context.personalization_allowed and context.user_id is not None:
            history = await self.data_provider.lay_lich_su(context.user_id, user_context)
            history = history[:10]
        retrieval_query = self._tao_query(context, source_book, history)
        retrieval_result = []
        retrieval_error = None
        if retrieval_query:
            try:
                retrieval_response = await self.retrieval_service.tim_kiem(
                    query=retrieval_query,
                    user_context=user_context,
                    filters=context.filters,
                    keywords=None,
                    intent="GOI_Y_SACH",
                    entities={"source_book_id": context.source_book_id},
                    limit=min(limit * 3, 50),
                    offset=0
                )
                retrieval_result = retrieval_response.get("results", [])
            except Exception as error:
                retrieval_error = error
                logger.warning("Không thể lấy candidate từ Retrieval: %s", error)
        business_result = []
        business_error = None
        try:
            business_result = await self.data_provider.tao_ung_vien_nghiep_vu(
                context=context,
                source_book=source_book,
                history=history,
                user_context=user_context,
                limit=min(limit * 3, 100)
            )
        except Exception as error:
            business_error = error
            logger.warning("Không thể lấy candidate nghiệp vụ: %s", error)
        if retrieval_error and business_error:
            raise AIBackendException("Không thể tạo danh sách ứng viên recommendation", details={"retrieval_error": str(retrieval_error), "business_error": str(business_error)})
        candidates = self._merge_candidates(retrieval_result, business_result, context, history)
        candidates = self._loc_candidate_khong_hop_le(candidates, bo_loc, context)
        candidates = candidates[:min(limit * 3, 100)]
        return {
            "context": context.to_dict(),
            "candidates": candidates,
            "total": len(candidates),
            "metadata": {
                "retrieval_used": bool(retrieval_query),
                "retrieval_fallback": retrieval_error is not None,
                "business_source_used": business_error is None,
                "personalization_used": bool(context.personalization_allowed and history),
                "access_scopes": list(bo_loc.allowed_scopes)
            }
        }

    def _tao_query(self, context: RecommendationContext, source_book: dict[str, Any] | None, history: list[dict[str, Any]]) -> str | None:
        parts = []
        if context.query:
            parts.append(context.query)
        if source_book:
            title = source_book.get("title", source_book.get("ten"))
            authors = _lay_values(source_book.get("authors", source_book.get("tac_gia")))
            categories = _lay_values(source_book.get("categories", source_book.get("the_loai")))
            description = str(source_book.get("description", source_book.get("mo_ta", ""))).strip()
            if title:
                parts.append(str(title))
            parts.extend(authors[:3])
            parts.extend(categories[:5])
            if description:
                parts.append(description[:500])
        if context.personalization_allowed and history:
            history_parts = []
            for item in history[:5]:
                title = item.get("title", item.get("ten"))
                categories = _lay_values(item.get("categories", item.get("the_loai")))
                if title:
                    history_parts.append(str(title))
                history_parts.extend(categories[:2])
            if history_parts:
                parts.append(" ".join(history_parts))
        query = " ".join(part for part in parts if str(part).strip()).strip()
        if not query:
            return None
        return query[:5000]

    def _merge_candidates(self, retrieval_result: list[dict[str, Any]], business_result: list[dict[str, Any]], context: RecommendationContext, history: list[dict[str, Any]]) -> list[dict[str, Any]]:
        merged: dict[str, dict[str, Any]] = {}
        for item in retrieval_result:
            candidate = self._chuan_hoa_candidate(item, CANDIDATE_SOURCE_VECTOR, context, history)
            if candidate:
                self._merge_one(merged, candidate)
        for item in business_result:
            source = str(item.get("source", item.get("candidate_source", CANDIDATE_SOURCE_BUSINESS))).upper()
            candidate = self._chuan_hoa_candidate(item, source, context, history)
            if candidate:
                self._merge_one(merged, candidate)
        return list(merged.values())

    def _chuan_hoa_candidate(self, item: dict[str, Any], source: str, context: RecommendationContext, history: list[dict[str, Any]]) -> dict[str, Any] | None:
        nested_book = item.get("book") if isinstance(item.get("book"), dict) else {}
        data = {**nested_book, **item}
        book_id = _lay_id(data)
        if book_id is None:
            return None
        metadata = dict(data.get("metadata") or {})
        for key in ("access_scope", "don_vi_id", "chi_nhanh_id", "owner_id"):
            if data.get(key) is not None:
                metadata[key] = data[key]
        matched_features = data.get("matched_features", data.get("matchedFeatures", []))
        if not isinstance(matched_features, list):
            matched_features = [matched_features] if matched_features else []
        matched_features = [str(item).strip().upper() for item in matched_features if str(item).strip()]
        feature_from_source = {
            CANDIDATE_SOURCE_VECTOR: "SIMILAR_CONTENT",
            CANDIDATE_SOURCE_QUERY: "QUERY_MATCH",
            CANDIDATE_SOURCE_CURRENT_BOOK: "RELATED_TO_CURRENT_BOOK",
            CANDIDATE_SOURCE_SAME_AUTHOR: "SAME_AUTHOR",
            CANDIDATE_SOURCE_SAME_CATEGORY: "SAME_CATEGORY",
            CANDIDATE_SOURCE_RELATED_BOOK: "RELATED_BOOK",
            CANDIDATE_SOURCE_USER_HISTORY: "SIMILAR_TO_HISTORY",
            CANDIDATE_SOURCE_CONTEXT: "CONTEXT_MATCH",
            CANDIDATE_SOURCE_BUSINESS: "BUSINESS_MATCH"
        }
        feature = feature_from_source.get(source)
        if feature and feature not in matched_features:
            matched_features.append(feature)
        if context.personalization_allowed and history and source == CANDIDATE_SOURCE_VECTOR and "SIMILAR_TO_HISTORY" not in matched_features:
            matched_features.append("SIMILAR_TO_HISTORY")
        source_score = self._score(data.get("source_score", data.get("score", data.get("relevance_score", 0))))
        semantic_score = self._score(data.get("semantic_score", source_score if source == CANDIDATE_SOURCE_VECTOR else 0))
        context_score = self._score(data.get("context_score", 0))
        history_score = self._score(data.get("history_score", 0))
        if "SIMILAR_TO_HISTORY" in matched_features:
            history_score = max(history_score, source_score)
        if "RELATED_TO_CURRENT_BOOK" in matched_features:
            context_score = max(context_score, source_score)
        return {
            "book_id": book_id,
            "title": data.get("title", data.get("ten")),
            "authors": data.get("authors", data.get("tac_gia", [])),
            "categories": data.get("categories", data.get("the_loai", [])),
            "source": source,
            "source_score": source_score,
            "semantic_score": semantic_score,
            "context_score": context_score,
            "history_score": history_score,
            "matched_features": matched_features,
            "metadata": metadata,
            "business": dict(data.get("business") or {}),
            "sources": [source]
        }

    def _merge_one(self, merged: dict[str, dict[str, Any]], candidate: dict[str, Any]) -> None:
        key = str(candidate["book_id"])
        if key not in merged:
            merged[key] = candidate
            return
        current = merged[key]
        current["source_score"] = max(current.get("source_score", 0), candidate.get("source_score", 0))
        current["semantic_score"] = max(current.get("semantic_score", 0), candidate.get("semantic_score", 0))
        current["context_score"] = max(current.get("context_score", 0), candidate.get("context_score", 0))
        current["history_score"] = max(current.get("history_score", 0), candidate.get("history_score", 0))
        current["matched_features"] = list(dict.fromkeys(current.get("matched_features", []) + candidate.get("matched_features", [])))
        current["sources"] = list(dict.fromkeys(current.get("sources", []) + candidate.get("sources", [])))
        current["metadata"] = {**current.get("metadata", {}), **candidate.get("metadata", {})}
        current["business"] = {**current.get("business", {}), **candidate.get("business", {})}
        for key_name in ("title", "authors", "categories"):
            if current.get(key_name) in (None, "", []):
                current[key_name] = candidate.get(key_name)

    def _loc_candidate_khong_hop_le(self, candidates: list[dict[str, Any]], bo_loc: BoLocTruyCap, context: RecommendationContext) -> list[dict[str, Any]]:
        excluded = {str(item) for item in context.excluded_book_ids}
        if context.source_book_id is not None:
            excluded.add(str(context.source_book_id))
        result = []
        for candidate in candidates:
            book_id = candidate.get("book_id")
            if book_id is None or str(book_id) in excluded:
                continue
            business = candidate.get("business") or {}
            if business.get("deleted") is True or business.get("is_deleted") is True:
                continue
            if business.get("active") is False or business.get("is_active") is False:
                continue
            if not self.access_service.kiem_tra_metadata(candidate.get("metadata") or {}, bo_loc):
                continue
            result.append(candidate)
        return result

    def _score(self, value: Any) -> float:
        try:
            value = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, value))


tao_ung_vien_service = TaoUngVienService()