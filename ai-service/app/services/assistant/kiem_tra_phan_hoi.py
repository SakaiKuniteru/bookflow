# app/services/assistant/kiem_tra_phan_hoi.py
# TẠO MỚI / THAY TOÀN BỘ

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from app.core.exceptions import AIValidationException


MAX_CONTENT_LENGTH = 20000

SENSITIVE_PATTERNS = [
    r"(?i)\bpassword\s*[:=]",
    r"(?i)\baccess[_ -]?token\s*[:=]",
    r"(?i)\brefresh[_ -]?token\s*[:=]",
    r"(?i)\bapi[_ -]?key\s*[:=]",
    r"(?i)\bsecret\s*[:=]",
    r"(?i)\bauthorization\s*[:=]"
]

ACTION_PATTERNS = [
    r"(?i)\bđã\s+(đặt|tạo|hủy|huỷ|thanh toán|chuyển|cập nhật|xóa|xoá)",
    r"(?i)\btôi\s+đã\s+(đặt|tạo|hủy|huỷ|thanh toán|chuyển|cập nhật|xóa|xoá)",
    r"(?i)\bđơn hàng\s+đã\s+(được|hoàn tất)"
]

CURRENT_FACT_PATTERNS = [
    r"(?i)\bcòn\s+\d+",
    r"(?i)\btồn kho\s+(hiện tại|bây giờ|hiện nay)",
    r"(?i)\bgiá\s+(hiện tại|hiện nay|bây giờ)",
    r"(?i)\btrạng thái\s+đơn hàng",
    r"(?i)\bđơn hàng\s+(đang|đã)",
    r"(?i)\bđã\s+thanh toán"
]


@dataclass(slots=True)
class KetQuaKiemTra:
    hop_le: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    normalized: dict[str, Any] = field(default_factory=dict)


class KiemTraPhanHoiService:
    def kiem_tra(
        self,
        response: dict[str, Any] | str,
        context: dict[str, Any] | None = None
    ) -> KetQuaKiemTra:
        data = self._normalize_response(
            response
        )
        ctx = context or {}
        errors: list[str] = []
        warnings: list[str] = []
        self._kiem_tra_cau_truc(
            data,
            errors
        )
        self._kiem_tra_nhay_cam(
            data,
            errors
        )
        self._kiem_tra_tool_usage(
            data,
            ctx,
            errors,
            warnings
        )
        self._kiem_tra_citation(
            data,
            ctx,
            errors
        )
        self._kiem_tra_claims(
            data,
            ctx,
            errors
        )
        self._kiem_tra_recommendations(
            data,
            errors
        )
        return KetQuaKiemTra(
            hop_le=not errors,
            errors=errors,
            warnings=warnings,
            normalized=data
        )

    def tao_fallback(
        self,
        reason: str | None = None
    ) -> dict[str, Any]:
        return {
            "content": (
                reason
                or "Không thể xác định thông tin phù hợp từ dữ liệu hiện tại."
            ),
            "citations": [],
            "recommendations": [],
            "tool_usage": [],
            "metadata": {
                "response_status": "FALLBACK"
            }
        }

    def tao_prompt_sua(
        self,
        response: dict[str, Any],
        ket_qua: KetQuaKiemTra
    ) -> str:
        return (
            "Phản hồi trước chưa đạt kiểm tra. "
            "Hãy tạo lại phản hồi chỉ dựa trên dữ liệu đã được cung cấp. "
            "Không bịa dữ liệu hoặc hành động. "
            "Lỗi cần sửa: "
            + json.dumps(
                ket_qua.errors,
                ensure_ascii=False
            )
            + ". Phản hồi trước: "
            + json.dumps(
                response,
                ensure_ascii=False,
                default=str
            )
        )

    @staticmethod
    def _normalize_response(
        response: dict[str, Any] | str
    ) -> dict[str, Any]:
        if isinstance(
            response,
            dict
        ):
            data = dict(
                response
            )
        else:
            data = {
                "content": str(
                    response
                    or ""
                )
            }
        data.setdefault(
            "content",
            ""
        )
        data.setdefault(
            "citations",
            []
        )
        data.setdefault(
            "recommendations",
            []
        )
        data.setdefault(
            "tool_usage",
            []
        )
        data.setdefault(
            "metadata",
            {}
        )
        return data

    @staticmethod
    def _kiem_tra_cau_truc(
        data: dict[str, Any],
        errors: list[str]
    ) -> None:
        content = data.get(
            "content"
        )
        if (
            not isinstance(
                content,
                str
            )
            or not content.strip()
        ):
            errors.append(
                "Response không có content hợp lệ."
            )
        elif len(content) > MAX_CONTENT_LENGTH:
            errors.append(
                "Content vượt quá giới hạn cho phép."
            )
        if not isinstance(
            data.get("citations"),
            list
        ):
            errors.append(
                "citations phải là danh sách."
            )
        if not isinstance(
            data.get("recommendations"),
            list
        ):
            errors.append(
                "recommendations phải là danh sách."
            )
        if not isinstance(
            data.get("tool_usage"),
            list
        ):
            errors.append(
                "tool_usage phải là danh sách."
            )
        if not isinstance(
            data.get("metadata"),
            dict
        ):
            errors.append(
                "metadata phải là object."
            )

    @staticmethod
    def _kiem_tra_nhay_cam(
        data: dict[str, Any],
        errors: list[str]
    ) -> None:
        content = str(
            data.get("content")
            or ""
        )
        serialized = json.dumps(
            data,
            ensure_ascii=False,
            default=str
        )
        for pattern in SENSITIVE_PATTERNS:
            if (
                re.search(
                    pattern,
                    content
                )
                or re.search(
                    pattern,
                    serialized
                )
            ):
                errors.append(
                    "Response có dấu hiệu chứa thông tin nhạy cảm hoặc credential."
                )
                break

    @staticmethod
    def _kiem_tra_tool_usage(
        data: dict[str, Any],
        context: dict[str, Any],
        errors: list[str],
        warnings: list[str]
    ) -> None:
        tool_usage = (
            data.get("tool_usage")
            or context.get("tool_usage")
            or []
        )
        if not isinstance(
            tool_usage,
            list
        ):
            errors.append(
                "tool_usage không hợp lệ."
            )
            return
        for item in tool_usage:
            if not isinstance(
                item,
                dict
            ):
                errors.append(
                    "Một tool_usage không đúng cấu trúc."
                )
                continue
            if not item.get("name"):
                errors.append(
                    "tool_usage thiếu tên tool."
                )
            status = str(
                item.get("status")
                or ""
            ).upper()
            if (
                status == "SUCCESS"
                and "result" not in item
                and "result_summary" not in item
            ):
                warnings.append(
                    "Tool thành công nhưng không có result/result_summary để audit."
                )
            if (
                status in {
                    "ERROR",
                    "DENIED",
                    "NEEDS_CONFIRMATION"
                }
                and item.get("success") is True
            ):
                errors.append(
                    "tool_usage có trạng thái lỗi nhưng lại đánh dấu success."
                )
            if (
                status == "SUCCESS"
                and item.get("scope_prechecked") is not True
            ):
                warnings.append(
                    "Tool thành công nhưng chưa có cờ scope_prechecked để audit."
                )

    @staticmethod
    def _kiem_tra_citation(
        data: dict[str, Any],
        context: dict[str, Any],
        errors: list[str]
    ) -> None:
        citations = data.get(
            "citations"
        ) or []
        retrieval = context.get(
            "retrieval"
        ) or []
        known = set()
        for item in retrieval:
            if not isinstance(
                item,
                dict
            ):
                continue
            for key in (
                "source_id",
                "chunk_id",
                "entity_id",
                "citation_id"
            ):
                if item.get(key) is not None:
                    known.add(
                        str(
                            item[key]
                        )
                    )
        for citation in citations:
            if not isinstance(
                citation,
                dict
            ):
                errors.append(
                    "Citation không đúng cấu trúc."
                )
                continue
            source_id = citation.get(
                "source_id"
            )
            chunk_id = citation.get(
                "chunk_id"
            )
            citation_id = citation.get(
                "citation_id"
            )
            if (
                not source_id
                and not chunk_id
                and not citation_id
            ):
                errors.append(
                    "Citation thiếu source_id, chunk_id hoặc citation_id."
                )
                continue
            refs = [
                str(value)
                for value in (
                    source_id,
                    chunk_id,
                    citation_id
                )
                if value is not None
            ]
            if (
                known
                and not any(
                    value in known
                    for value in refs
                )
            ):
                errors.append(
                    "Citation không truy vết được về retrieval context."
                )
            if (
                citation.get("page") is not None
                and not citation.get(
                    "page_verified",
                    False
                )
                and citation.get(
                    "source_type"
                ) in {
                    "DOCUMENT",
                    "FILE"
                }
            ):
                errors.append(
                    "Citation có page nhưng chưa có dữ liệu xác thực page."
                )

    @staticmethod
    def _kiem_tra_claims(
        data: dict[str, Any],
        context: dict[str, Any],
        errors: list[str]
    ) -> None:
        claims = data.get(
            "claims"
        ) or []
        if not isinstance(
            claims,
            list
        ):
            errors.append(
                "claims phải là danh sách nếu được cung cấp."
            )
            return
        tool_usage = (
            context.get(
                "tool_usage"
            )
            or data.get(
                "tool_usage"
            )
            or []
        )
        successful_tools = {
            str(
                item.get("name")
            )
            for item in tool_usage
            if (
                isinstance(
                    item,
                    dict
                )
                and str(
                    item.get("status")
                ).upper() == "SUCCESS"
            )
        }
        content = str(
            data.get("content")
            or ""
        )
        for claim in claims:
            if not isinstance(
                claim,
                dict
            ):
                errors.append(
                    "Claim không đúng cấu trúc."
                )
                continue
            source_type = str(
                claim.get(
                    "source_type"
                )
                or ""
            ).upper()
            if (
                source_type == "TOOL"
                and str(
                    claim.get(
                        "tool_name"
                    )
                    or ""
                ) not in successful_tools
            ):
                errors.append(
                    "Claim tham chiếu tool chưa thành công hoặc không tồn tại."
                )
            if (
                source_type == "RETRIEVAL"
                and not context.get(
                    "retrieval"
                )
            ):
                errors.append(
                    "Claim tham chiếu retrieval nhưng không có retrieval context."
                )
            evidence = claim.get(
                "evidence"
            )
            if (
                evidence is not None
                and isinstance(
                    evidence,
                    str
                )
                and len(evidence) > 1000
            ):
                errors.append(
                    "Evidence của claim quá dài."
                )
        if any(
            re.search(
                pattern,
                content
            )
            for pattern in ACTION_PATTERNS
        ):
            action_success = any(
                isinstance(
                    item,
                    dict
                )
                and str(
                    item.get("status")
                ).upper() == "SUCCESS"
                and bool(
                    item.get(
                        "action_completed"
                    )
                )
                for item in tool_usage
            )
            if not action_success:
                errors.append(
                    "Response khẳng định hành động đã hoàn thành nhưng chưa có Backend action thành công."
                )
        if any(
            re.search(
                pattern,
                content
            )
            for pattern in CURRENT_FACT_PATTERNS
        ):
            current_domains = {
                str(
                    item.get("domain")
                )
                for item in tool_usage
                if (
                    isinstance(
                        item,
                        dict
                    )
                    and str(
                        item.get("status")
                    ).upper() == "SUCCESS"
                )
            }
            lower_content = content.lower()
            required_domain = (
                "inventory"
                if (
                    "tồn kho" in lower_content
                    or "còn " in lower_content
                )
                else "order_status"
                if (
                    "trạng thái đơn hàng"
                    in lower_content
                    or "đơn hàng đang"
                    in lower_content
                    or "đơn hàng đã"
                    in lower_content
                )
                else "other"
            )
            if (
                not current_domains
                and not context.get("business")
                and not context.get("retrieval")
            ):
                errors.append(
                    "Response có thông tin hiện tại nhưng không có nguồn dữ liệu xác thực."
                )
            elif (
                required_domain != "other"
                and required_domain not in current_domains
                and not context.get("business")
                and not context.get("retrieval")
            ):
                errors.append(
                    "Response có thông tin hiện tại nhưng chưa có tool phù hợp xác thực dữ liệu."
                )

    @staticmethod
    def _kiem_tra_recommendations(
        data: dict[str, Any],
        errors: list[str]
    ) -> None:
        recommendations = data.get(
            "recommendations"
        ) or []
        seen: set[str] = set()
        for item in recommendations:
            if not isinstance(
                item,
                dict
            ):
                errors.append(
                    "Recommendation không đúng cấu trúc."
                )
                continue
            book_id = item.get(
                "book_id"
            )
            if book_id is None:
                errors.append(
                    "Recommendation thiếu book_id."
                )
                continue
            key = str(
                book_id
            )
            if key in seen:
                errors.append(
                    "Recommendation bị trùng book_id."
                )
            seen.add(key)
            score = item.get(
                "score"
            )
            if score is not None:
                try:
                    score_value = float(
                        score
                    )
                    if (
                        score_value < 0
                        or score_value > 1
                    ):
                        errors.append(
                            "Recommendation score phải nằm trong khoảng 0 đến 1."
                        )
                except (
                    TypeError,
                    ValueError
                ):
                    errors.append(
                        "Recommendation score không hợp lệ."
                    )

    def kiem_tra_hoac_loi(
        self,
        response: dict[str, Any] | str,
        context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        result = self.kiem_tra(
            response,
            context
        )
        if not result.hop_le:
            raise AIValidationException(
                "; ".join(
                    result.errors
                )
            )
        return result.normalized

kiem_tra_phan_hoi_service = KiemTraPhanHoiService()

__all__ = [
    "KetQuaKiemTra",
    "KiemTraPhanHoiService",
    "kiem_tra_phan_hoi_service"
]