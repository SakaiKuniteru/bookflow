from typing import Any

from app.core.exceptions import AIValidationException
from app.services.recommendations.tao_ung_vien import (
    RecommendationContext,
    RECOMMENDATION_MODE_BORROW,
    RECOMMENDATION_MODE_PURCHASE,
    RECOMMENDATION_MODE_RENT
)

EXPLANATION_MAP = {
    "SIMILAR_CONTENT": "Có nội dung tương đồng với nhu cầu hoặc ngữ cảnh hiện tại.",
    "QUERY_MATCH": "Phù hợp với nội dung tìm kiếm hiện tại.",
    "RELATED_TO_CURRENT_BOOK": "Có liên quan trực tiếp đến cuốn sách bạn đang xem.",
    "SAME_AUTHOR": "Có cùng tác giả với sách liên quan trong ngữ cảnh hiện tại.",
    "SAME_CATEGORY": "Có cùng thể loại với sách liên quan trong ngữ cảnh hiện tại.",
    "RELATED_BOOK": "Được xác định là một sách có liên quan.",
    "CONTEXT_MATCH": "Phù hợp với ngữ cảnh recommendation hiện tại.",
    "BUSINESS_MATCH": "Phù hợp với điều kiện nghiệp vụ của yêu cầu.",
    "SIMILAR_TO_HISTORY": "Có điểm tương đồng với những sách bạn đã quan tâm.",
    "POPULAR_IN_CONTEXT": "Phù hợp với dữ liệu phổ biến trong ngữ cảnh hiện tại."
}


class GiaiThichService:
    def __init__(self, max_reasons: int = 3):
        self.max_reasons = max(1, max_reasons)

    async def tao_giai_thich(self, recommendations: list[dict[str, Any]] | dict[str, Any], context: RecommendationContext | dict[str, Any]) -> dict[str, Any]:
        context = context if isinstance(context, RecommendationContext) else RecommendationContext.tu_dict(context)
        if isinstance(recommendations, dict):
            recommendations = recommendations.get("recommendations", recommendations.get("results", []))
        if not isinstance(recommendations, list):
            raise AIValidationException("Danh sách recommendation không hợp lệ")
        result = []
        for recommendation in recommendations:
            if not isinstance(recommendation, dict):
                continue
            item = dict(recommendation)
            reasons = self._tao_reasons(item, context)
            item["matched_features"] = list(dict.fromkeys(item.get("matched_features", [])))
            item["reasons"] = reasons
            item["reason"] = " ".join(reasons)
            item["explanation"] = {
                "type": "RULE_BASED",
                "features": item["matched_features"],
                "reasons": reasons
            }
            result.append(item)
        self.kiem_tra_ket_qua(result, context)
        return {
            "context": context.to_dict(),
            "recommendations": result,
            "total": len(result),
            "metadata": {
                "explanation_type": "RULE_BASED"
            }
        }

    def kiem_tra_ket_qua(self, recommendations: list[dict[str, Any]], context: RecommendationContext | dict[str, Any] | None = None) -> None:
        da_co = set()
        for item in recommendations:
            book_id = item.get("book_id")
            if book_id is None:
                raise AIValidationException("Recommendation thiếu book_id")
            key = str(book_id)
            if key in da_co:
                raise AIValidationException("Recommendation chứa sách trùng lặp", details={"book_id": book_id})
            da_co.add(key)
            score = item.get("score", 0)
            try:
                score = float(score)
            except (TypeError, ValueError):
                raise AIValidationException("Recommendation có score không hợp lệ", details={"book_id": book_id})
            if score < 0 or score > 1:
                raise AIValidationException("Recommendation có score ngoài khoảng 0 đến 1", details={"book_id": book_id})
            if not str(item.get("reason", "")).strip():
                raise AIValidationException("Recommendation thiếu lý do giải thích", details={"book_id": book_id})

    def _tao_reasons(self, item: dict[str, Any], context: RecommendationContext) -> list[str]:
        features = [str(feature).strip().upper() for feature in item.get("matched_features", []) if str(feature).strip()]
        reasons = []
        for feature in features:
            if feature == "SIMILAR_TO_HISTORY" and not context.personalization_allowed:
                continue
            text = EXPLANATION_MAP.get(feature)
            if text and text not in reasons:
                reasons.append(text)
            if len(reasons) >= self.max_reasons:
                break
        business_reason = self._tao_business_reason(item, context)
        if business_reason and business_reason not in reasons and len(reasons) < self.max_reasons:
            reasons.append(business_reason)
        if not reasons:
            reasons.append("Được xếp hạng phù hợp với ngữ cảnh recommendation hiện tại.")
        return reasons[:self.max_reasons]

    def _tao_business_reason(self, item: dict[str, Any], context: RecommendationContext) -> str | None:
        business = item.get("business") or {}
        if business.get("allowed") is not True and business.get("duoc_phep") is not True and business.get("hop_le") is not True:
            return None
        if context.recommendation_mode == RECOMMENDATION_MODE_PURCHASE:
            if business.get("sale_enabled") is True or business.get("co_the_mua") is True:
                return "Đang đáp ứng điều kiện mua theo trạng thái nghiệp vụ hiện tại."
        if context.recommendation_mode == RECOMMENDATION_MODE_BORROW:
            if business.get("borrow_enabled") is True or business.get("co_the_muon") is True:
                return "Đang đáp ứng điều kiện mượn theo trạng thái nghiệp vụ hiện tại."
        if context.recommendation_mode == RECOMMENDATION_MODE_RENT:
            if business.get("rental_enabled") is True or business.get("co_the_thue") is True:
                return "Đang đáp ứng điều kiện thuê theo trạng thái nghiệp vụ hiện tại."
        return None


giai_thich_service = GiaiThichService()