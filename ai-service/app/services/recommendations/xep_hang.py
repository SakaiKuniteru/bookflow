import logging
from typing import Any

from app.core.exceptions import AIBackendException, AIValidationException
from app.services.recommendations.tao_ung_vien import (
    RecommendationContext,
    RecommendationDataProvider,
    BackendRecommendationDataProvider,
    RECOMMENDATION_CONTEXT_BOOK_DETAIL,
    RECOMMENDATION_CONTEXT_CHAT,
    RECOMMENDATION_CONTEXT_HOME,
    RECOMMENDATION_CONTEXT_PERSONAL,
    RECOMMENDATION_CONTEXT_SEARCH,
    RECOMMENDATION_CONTEXT_STAFF,
    RECOMMENDATION_MODE_ANY,
    RECOMMENDATION_MODE_BORROW,
    RECOMMENDATION_MODE_PURCHASE,
    RECOMMENDATION_MODE_RENT,
    RECOMMENDATION_MODE_READ
)

logger = logging.getLogger("bookflow-ai.recommendations.ranking")

DEFAULT_WEIGHT_PROFILES = {
    RECOMMENDATION_CONTEXT_HOME: {
        "semantic": 0.30,
        "context": 0.25,
        "history": 0.20,
        "source": 0.10,
        "business": 0.15
    },
    RECOMMENDATION_CONTEXT_BOOK_DETAIL: {
        "semantic": 0.50,
        "context": 0.30,
        "history": 0.05,
        "source": 0.10,
        "business": 0.05
    },
    RECOMMENDATION_CONTEXT_SEARCH: {
        "semantic": 0.45,
        "context": 0.30,
        "history": 0.10,
        "source": 0.05,
        "business": 0.10
    },
    RECOMMENDATION_CONTEXT_PERSONAL: {
        "semantic": 0.20,
        "context": 0.15,
        "history": 0.40,
        "source": 0.10,
        "business": 0.15
    },
    RECOMMENDATION_CONTEXT_CHAT: {
        "semantic": 0.35,
        "context": 0.30,
        "history": 0.15,
        "source": 0.10,
        "business": 0.10
    },
    RECOMMENDATION_CONTEXT_STAFF: {
        "semantic": 0.30,
        "context": 0.30,
        "history": 0.05,
        "source": 0.15,
        "business": 0.20
    }
}


class XepHangService:
    def __init__(self, data_provider: RecommendationDataProvider | None = None, weight_profiles: dict[str, dict[str, float]] | None = None, diversity_penalty: float = 0.04, algorithm_version: str = "recommendation-v1"):
        self.data_provider = data_provider or BackendRecommendationDataProvider()
        self.weight_profiles = weight_profiles or DEFAULT_WEIGHT_PROFILES
        self.diversity_penalty = max(0.0, min(1.0, diversity_penalty))
        self.algorithm_version = algorithm_version

    async def xep_hang(self, candidates: list[dict[str, Any]] | dict[str, Any], context: RecommendationContext | dict[str, Any], user_context: dict[str, Any] | None = None, limit: int | None = None) -> dict[str, Any]:
        context = context if isinstance(context, RecommendationContext) else RecommendationContext.tu_dict(context)
        if isinstance(candidates, dict):
            candidates = candidates.get("candidates", candidates.get("results", []))
        if not isinstance(candidates, list):
            raise AIValidationException("Candidates recommendation không hợp lệ")
        limit = max(1, min(int(limit or context.limit or 10), 50))
        candidates = self._loai_trung(candidates)
        business_states = {}
        if self._can_kiem_tra_nghiep_vu(context):
            book_ids = [item.get("book_id") for item in candidates if item.get("book_id") is not None]
            try:
                states = await self.data_provider.kiem_tra_kha_dung(book_ids, context, user_context)
            except Exception as error:
                raise AIBackendException("Không thể kiểm tra trạng thái nghiệp vụ hiện tại của sách", details=str(error)) from error
            business_states = {str(self._lay_book_id(item)): item for item in states if self._lay_book_id(item) is not None}
        scored = []
        weights = self._lay_weights(context.context_type)
        for candidate in candidates:
            book_id = candidate.get("book_id")
            if book_id is None:
                continue
            state = business_states.get(str(book_id))
            if self._can_kiem_tra_nghiep_vu(context) and not self._hop_le_theo_nghiep_vu(candidate, state, context):
                continue
            features = self._lay_features(candidate, state, context)
            score = self._tinh_score(features, weights)
            item = dict(candidate)
            item["business"] = {**dict(candidate.get("business") or {}), **dict(state or {})}
            item["ranking_features"] = features
            item["score"] = score
            item["algorithm_version"] = self.algorithm_version
            item["model_version"] = candidate.get("model_version")
            item["embedding_version"] = candidate.get("embedding_version")
            scored.append(item)
        ranked = self._xep_hang_da_dang(scored, context, limit)
        return {
            "context": context.to_dict(),
            "recommendations": ranked,
            "total": len(ranked),
            "metadata": {
                "algorithm_version": self.algorithm_version,
                "weights": weights,
                "business_validation": self._can_kiem_tra_nghiep_vu(context),
                "diversity_penalty": self.diversity_penalty
            }
        }

    def _loai_trung(self, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        result = {}
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            book_id = candidate.get("book_id", candidate.get("sach_id", candidate.get("entity_id")))
            if book_id is None:
                continue
            key = str(book_id)
            if key not in result:
                result[key] = dict(candidate)
                continue
            current = result[key]
            current["matched_features"] = list(dict.fromkeys(current.get("matched_features", []) + candidate.get("matched_features", [])))
            current["sources"] = list(dict.fromkeys(current.get("sources", []) + candidate.get("sources", [])))
            for key_name in ("semantic_score", "context_score", "history_score", "source_score"):
                current[key_name] = max(self._score(current.get(key_name, 0)), self._score(candidate.get(key_name, 0)))
            current["metadata"] = {**dict(current.get("metadata") or {}), **dict(candidate.get("metadata") or {})}
        return list(result.values())

    def _lay_weights(self, context_type: str) -> dict[str, float]:
        base = DEFAULT_WEIGHT_PROFILES[RECOMMENDATION_CONTEXT_HOME]
        profile = self.weight_profiles.get(context_type, base)
        weights = {key: max(0.0, float(value)) for key, value in profile.items()}
        total = sum(weights.values())
        if total <= 0:
            raise AIValidationException("Trọng số recommendation không hợp lệ")
        return {key: value / total for key, value in weights.items()}

    def _lay_features(self, candidate: dict[str, Any], state: dict[str, Any] | None, context: RecommendationContext) -> dict[str, float]:
        matched_features = {str(item).upper() for item in candidate.get("matched_features", [])}
        semantic = self._score(candidate.get("semantic_score", candidate.get("source_score", 0)))
        context_score = self._score(candidate.get("context_score", 0))
        history = self._score(candidate.get("history_score", 0))
        source = self._score(candidate.get("source_score", 0))
        if "RELATED_TO_CURRENT_BOOK" in matched_features or "CONTEXT_MATCH" in matched_features:
            context_score = max(context_score, source)
        if "SIMILAR_TO_HISTORY" in matched_features and context.personalization_allowed:
            history = max(history, source)
        business = self._tinh_business_score(state, context)
        return {
            "semantic": semantic,
            "context": context_score,
            "history": history,
            "source": source,
            "business": business
        }

    def _tinh_business_score(self, state: dict[str, Any] | None, context: RecommendationContext) -> float:
        if state is None:
            return 0.0 if self._can_kiem_tra_nghiep_vu(context) else 0.5
        if state.get("allowed") is False or state.get("duoc_phep") is False or state.get("hop_le") is False:
            return 0.0
        if state.get("active") is False or state.get("is_active") is False:
            return 0.0
        mode = context.recommendation_mode
        if mode == RECOMMENDATION_MODE_PURCHASE:
            if state.get("sale_enabled") is False or state.get("co_the_mua") is False:
                return 0.0
        if mode == RECOMMENDATION_MODE_BORROW:
            if state.get("borrow_enabled") is False or state.get("co_the_muon") is False:
                return 0.0
        if mode == RECOMMENDATION_MODE_RENT:
            if state.get("rental_enabled") is False or state.get("co_the_thue") is False:
                return 0.0
        if mode == RECOMMENDATION_MODE_READ and state.get("read_enabled") is False:
            return 0.0
        return 1.0

    def _tinh_score(self, features: dict[str, float], weights: dict[str, float]) -> float:
        score = 0.0
        for key, weight in weights.items():
            score += self._score(features.get(key, 0)) * weight
        return round(max(0.0, min(1.0, score)), 6)

    def _xep_hang_da_dang(self, candidates: list[dict[str, Any]], context: RecommendationContext, limit: int) -> list[dict[str, Any]]:
        remaining = sorted(candidates, key=lambda item: float(item.get("score", 0)), reverse=True)
        selected = []
        same_author_requested = bool(context.filters.get("author_id") or context.filters.get("authorId"))
        while remaining and len(selected) < limit:
            best_index = 0
            best_adjusted = -1.0
            for index, candidate in enumerate(remaining):
                adjusted = float(candidate.get("score", 0))
                if selected and not same_author_requested:
                    if self._trung_tac_gia(candidate, selected[-1]):
                        adjusted -= self.diversity_penalty
                    if self._trung_the_loai(candidate, selected[-1]):
                        adjusted -= self.diversity_penalty * 0.5
                if adjusted > best_adjusted:
                    best_adjusted = adjusted
                    best_index = index
            candidate = remaining.pop(best_index)
            candidate["ranking_score"] = round(max(0.0, min(1.0, best_adjusted)), 6)
            candidate["score"] = candidate["ranking_score"]
            selected.append(candidate)
        return selected

    def _trung_tac_gia(self, first: dict[str, Any], second: dict[str, Any]) -> bool:
        first_values = {str(item).casefold() for item in self._lay_values(first.get("authors"))}
        second_values = {str(item).casefold() for item in self._lay_values(second.get("authors"))}
        return bool(first_values & second_values)

    def _trung_the_loai(self, first: dict[str, Any], second: dict[str, Any]) -> bool:
        first_values = {str(item).casefold() for item in self._lay_values(first.get("categories"))}
        second_values = {str(item).casefold() for item in self._lay_values(second.get("categories"))}
        return bool(first_values & second_values)

    def _lay_values(self, value: Any) -> list[Any]:
        if value is None:
            return []
        if not isinstance(value, (list, tuple, set)):
            value = [value]
        result = []
        for item in value:
            if isinstance(item, dict):
                item = item.get("name", item.get("ten", item.get("title")))
            if item is not None:
                result.append(item)
        return result

    def _can_kiem_tra_nghiep_vu(self, context: RecommendationContext) -> bool:
        if context.business_validation_required:
            return True
        if context.recommendation_mode != RECOMMENDATION_MODE_ANY:
            return True
        dynamic_filters = {
            "availability",
            "available",
            "con_hang",
            "ton_kho",
            "chi_nhanh_id",
            "chiNhanhId",
            "sale_enabled",
            "borrow_enabled",
            "rental_enabled"
        }
        return any(key in context.filters for key in dynamic_filters)

    def _hop_le_theo_nghiep_vu(self, candidate: dict[str, Any], state: dict[str, Any] | None, context: RecommendationContext) -> bool:
        if state is None:
            return False
        if state.get("allowed") is False or state.get("duoc_phep") is False or state.get("hop_le") is False:
            return False
        if state.get("active") is False or state.get("is_active") is False:
            return False
        mode = context.recommendation_mode
        if mode == RECOMMENDATION_MODE_PURCHASE and (state.get("sale_enabled") is False or state.get("co_the_mua") is False):
            return False
        if mode == RECOMMENDATION_MODE_BORROW and (state.get("borrow_enabled") is False or state.get("co_the_muon") is False):
            return False
        if mode == RECOMMENDATION_MODE_RENT and (state.get("rental_enabled") is False or state.get("co_the_thue") is False):
            return False
        if mode == RECOMMENDATION_MODE_READ and state.get("read_enabled") is False:
            return False
        return True

    def _lay_book_id(self, item: dict[str, Any]) -> Any:
        return item.get("book_id", item.get("sach_id", item.get("id", item.get("entity_id"))))

    def _score(self, value: Any) -> float:
        try:
            value = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, value))


xep_hang_service = XepHangService()