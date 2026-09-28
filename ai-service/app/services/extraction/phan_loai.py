# app/services/extraction/phan_loai.py

from __future__ import annotations

import inspect
import json
import re
from dataclasses import asdict, dataclass, field
from typing import Any

from app.core.config import get_settings
from app.core.exceptions import AIProviderException
from app.providers.base import LLMMessage


CLASSIFICATION_VERSION = "classification-v1"

DOCUMENT_TYPES = {
    "BOOK_COVER",
    "BOOK_METADATA",
    "BOOK_DOCUMENT",
    "INVOICE",
    "RECEIPT",
    "INVENTORY_RECEIPT",
    "CONTRACT",
    "POLICY",
    "REPORT",
    "OTHER",
}

CLASSIFICATION_STATUS_COMPLETED = "COMPLETED"
CLASSIFICATION_STATUS_NEED_REVIEW = "NEED_REVIEW"

KEYWORDS_BY_TYPE: dict[str, list[str]] = {
    "BOOK_COVER": [
        "book cover",
        "bìa sách",
        "cover",
        "tác giả",
        "author",
        "isbn",
        "edition",
    ],
    "BOOK_METADATA": [
        "isbn",
        "tác giả",
        "author",
        "nhà xuất bản",
        "publisher",
        "năm xuất bản",
        "publication year",
        "edition",
    ],
    "BOOK_DOCUMENT": [
        "chapter",
        "chương",
        "mục lục",
        "table of contents",
        "references",
        "bibliography",
        "abstract",
    ],
    "INVOICE": [
        "hóa đơn",
        "invoice",
        "invoice number",
        "số hóa đơn",
        "thuế",
        "tax",
        "subtotal",
        "total",
    ],
    "RECEIPT": [
        "receipt",
        "biên lai",
        "biên nhận",
        "số biên nhận",
        "đã thanh toán",
        "payment received",
    ],
    "INVENTORY_RECEIPT": [
        "phiếu nhập kho",
        "nhập kho",
        "inventory receipt",
        "nhà cung cấp",
        "supplier",
        "số lượng",
        "đơn giá",
        "kho",
    ],
    "CONTRACT": [
        "hợp đồng",
        "contract",
        "bên a",
        "bên b",
        "điều khoản",
        "party",
        "effective date",
    ],
    "POLICY": [
        "chính sách",
        "policy",
        "quy định",
        "quy chế",
        "điều kiện",
        "terms",
    ],
    "REPORT": [
        "báo cáo",
        "report",
        "thống kê",
        "statistics",
        "tổng hợp",
        "kỳ báo cáo",
        "reporting period",
    ],
}

FILENAME_HINTS: dict[str, list[str]] = {
    "BOOK_COVER": ["cover", "bia", "bìa", "book-cover"],
    "BOOK_METADATA": ["metadata", "thong-tin-sach", "thông tin sách", "book-info"],
    "BOOK_DOCUMENT": ["book", "sach", "sách", "document", "tai-lieu", "tài liệu"],
    "INVOICE": ["invoice", "hoa-don", "hóa đơn"],
    "RECEIPT": ["receipt", "bien-lai", "biên lai", "bien-nhan", "biên nhận"],
    "INVENTORY_RECEIPT": ["nhap-kho", "nhập-kho", "phieu-nhap", "phiếu-nhập"],
    "CONTRACT": ["contract", "hop-dong", "hợp đồng"],
    "POLICY": ["policy", "chinh-sach", "chính sách", "quy-dinh", "quy định"],
    "REPORT": ["report", "bao-cao", "báo cáo", "thong-ke", "thống kê"],
}


@dataclass(slots=True)
class ClassificationResult:
    primary_type: str
    secondary_types: list[str]
    confidence: float
    status: str
    evidence: list[str]
    rule_scores: dict[str, float]
    classifier_version: str
    model_version: str | None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class PhanLoaiService:
    def __init__(
        self,
        llm_provider: Any | None = None,
        confidence_threshold: float = 0.60,
        review_margin: float = 0.08,
    ) -> None:
        self.llm_provider = llm_provider
        self.confidence_threshold = confidence_threshold
        self.review_margin = review_margin

    async def phan_loai(
        self,
        raw_text: str,
        file_name: str | None = None,
        mime_type: str | None = None,
        extracted_data: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        text = str(raw_text or "").strip()
        file_name = str(file_name or "")
        mime_type = str(mime_type or "").lower()
        rule_scores, rule_evidence = self._phan_loai_bang_rule(
            raw_text=text,
            file_name=file_name,
            mime_type=mime_type,
            extracted_data=extracted_data or {},
        )
        model_result: dict[str, Any] | None = None
        model_version: str | None = None
        llm_provider = await self._lay_llm_provider()
        top_type, top_score, second_score = self._lay_top_scores(rule_scores)
        if llm_provider is not None and (
            top_score < 0.75 or top_score - second_score < self.review_margin
        ):
            try:
                model_result, model_version = await self._phan_loai_bang_llm(
                    raw_text=text,
                    file_name=file_name,
                    mime_type=mime_type,
                    extracted_data=extracted_data or {},
                    provider=llm_provider,
                )
            except Exception as exc:
                rule_evidence.setdefault("OTHER", []).append(
                    f"LLM classifier không sử dụng được: {exc}"
                )
        final_scores = self._tron_diem(rule_scores, model_result)
        primary_type, primary_score, second_score = self._lay_top_scores(final_scores)
        if primary_score < self.confidence_threshold:
            primary_type = "OTHER"
        secondary_types = self._lay_secondary_types(final_scores, primary_type)
        evidence = self._lay_evidence(
            primary_type=primary_type,
            rule_evidence=rule_evidence,
            model_result=model_result,
        )
        confidence = self._tinh_confidence(
            primary_score=primary_score,
            second_score=second_score,
            primary_type=primary_type,
        )
        status = self._xac_dinh_status(
            primary_type=primary_type,
            confidence=confidence,
            second_score=second_score,
            primary_score=primary_score,
        )
        result = ClassificationResult(
            primary_type=primary_type,
            secondary_types=secondary_types,
            confidence=confidence,
            status=status,
            evidence=evidence,
            rule_scores=final_scores,
            classifier_version=CLASSIFICATION_VERSION,
            model_version=model_version,
            metadata={
                "file_name": file_name,
                "mime_type": mime_type,
                "input_length": len(text),
                "extracted_fields": list((extracted_data or {}).keys()),
                "source_metadata": metadata or {},
            },
        )
        return self.kiem_tra_ket_qua(result.to_dict())

    def _phan_loai_bang_rule(
        self,
        raw_text: str,
        file_name: str,
        mime_type: str,
        extracted_data: dict[str, Any],
    ) -> tuple[dict[str, float], dict[str, list[str]]]:
        normalized_text = self._normalize_text(raw_text)
        normalized_file_name = self._normalize_text(file_name)
        scores = {document_type: 0.0 for document_type in DOCUMENT_TYPES}
        evidence: dict[str, list[str]] = {
            document_type: [] for document_type in DOCUMENT_TYPES
        }
        for document_type, keywords in KEYWORDS_BY_TYPE.items():
            for keyword in keywords:
                normalized_keyword = self._normalize_text(keyword)
                if normalized_keyword and normalized_keyword in normalized_text:
                    scores[document_type] += 0.14
                    evidence[document_type].append(keyword)
        for document_type, hints in FILENAME_HINTS.items():
            for hint in hints:
                normalized_hint = self._normalize_text(hint)
                if normalized_hint and normalized_hint in normalized_file_name:
                    scores[document_type] += 0.18
                    evidence[document_type].append(f"filename:{hint}")
        self._ap_dung_mime_score(scores, evidence, mime_type)
        self._ap_dung_extracted_data_score(scores, evidence, extracted_data)
        if len(raw_text) > 1500:
            scores["BOOK_DOCUMENT"] += 0.10
            scores["REPORT"] += 0.05
        if not raw_text:
            scores["OTHER"] = 0.10
        normalized_scores = {
            document_type: min(1.0, score)
            for document_type, score in scores.items()
        }
        if max(normalized_scores.values(), default=0.0) == 0:
            normalized_scores["OTHER"] = 0.35
        return normalized_scores, evidence

    def _ap_dung_mime_score(
        self,
        scores: dict[str, float],
        evidence: dict[str, list[str]],
        mime_type: str,
    ) -> None:
        if mime_type in {"image/jpeg", "image/png", "image/tiff", "image/webp", "image/bmp"}:
            scores["BOOK_COVER"] += 0.10
            evidence["BOOK_COVER"].append(f"mime:{mime_type}")
        if mime_type == "application/pdf":
            scores["BOOK_DOCUMENT"] += 0.05
            evidence["BOOK_DOCUMENT"].append("mime:application/pdf")
        if mime_type == "text/csv":
            scores["REPORT"] += 0.05
            scores["INVENTORY_RECEIPT"] += 0.05
            evidence["REPORT"].append("mime:text/csv")
            evidence["INVENTORY_RECEIPT"].append("mime:text/csv")

    def _ap_dung_extracted_data_score(
        self,
        scores: dict[str, float],
        evidence: dict[str, list[str]],
        extracted_data: dict[str, Any],
    ) -> None:
        fields = set(extracted_data.keys())
        if {"isbn", "author"} & fields:
            scores["BOOK_METADATA"] += 0.20
            evidence["BOOK_METADATA"].append("extracted:book-metadata")
        if {"invoice_number", "subtotal", "tax", "total"} & fields:
            scores["INVOICE"] += 0.25
            evidence["INVOICE"].append("extracted:invoice")
        if {"receipt_number"} & fields:
            scores["RECEIPT"] += 0.20
            evidence["RECEIPT"].append("extracted:receipt")
        if {"warehouse", "items"} & fields:
            scores["INVENTORY_RECEIPT"] += 0.20
            evidence["INVENTORY_RECEIPT"].append("extracted:inventory")
        if {"contract_number", "parties"} & fields:
            scores["CONTRACT"] += 0.20
            evidence["CONTRACT"].append("extracted:contract")
        if {"topics", "keywords"} & fields:
            scores["REPORT"] += 0.05
            scores["POLICY"] += 0.05

    async def _phan_loai_bang_llm(
        self,
        raw_text: str,
        file_name: str,
        mime_type: str,
        extracted_data: dict[str, Any],
        provider: Any,
    ) -> tuple[dict[str, Any], str | None]:
        settings = get_settings()
        allowed_types = sorted(DOCUMENT_TYPES)
        system_prompt = (
            "Bạn là bộ phân loại tài liệu của BookFlow. "
            "Chỉ phân loại dựa trên bằng chứng thực tế trong nội dung. "
            "Không được tạo loại tài liệu mới. "
            "Nếu không chắc chắn phải chọn OTHER với confidence thấp. "
            "Trả JSON duy nhất theo dạng "
            '{"primary_type":"...","secondary_types":[],"confidence":0.0,"evidence":[]}. '
            f"Loại hợp lệ: {', '.join(allowed_types)}."
        )
        user_prompt = json.dumps(
            {
                "file_name": file_name,
                "mime_type": mime_type,
                "extracted_data": extracted_data,
                "content": raw_text[: settings.ai_max_context_length],
            },
            ensure_ascii=False,
        )
        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt),
        ]
        response = await self._goi_llm(provider, messages, settings)
        content = self._lay_response_content(response)
        parsed = self._parse_json_response(content)
        if not isinstance(parsed, dict):
            return {}, self._lay_model_version(response, provider)
        primary_type = str(parsed.get("primary_type") or "OTHER").upper()
        if primary_type not in DOCUMENT_TYPES:
            primary_type = "OTHER"
        secondary_types = [
            str(value).upper()
            for value in parsed.get("secondary_types") or []
            if str(value).upper() in DOCUMENT_TYPES and str(value).upper() != primary_type
        ]
        confidence = self._clamp_confidence(parsed.get("confidence", 0.0))
        evidence = [
            str(value)
            for value in parsed.get("evidence") or []
            if isinstance(value, str)
        ]
        evidence = [
            value
            for value in evidence
            if self._evidence_exists(value, raw_text)
        ]
        return {
            "primary_type": primary_type,
            "secondary_types": secondary_types,
            "confidence": confidence,
            "evidence": evidence,
        }, self._lay_model_version(response, provider)

    async def _goi_llm(self, provider: Any, messages: list[LLMMessage], settings: Any) -> Any:
        if hasattr(provider, "generate"):
            result = provider.generate(
                messages=messages,
                temperature=0.0,
                max_tokens=settings.ai_max_response_tokens,
            )
        elif hasattr(provider, "complete"):
            result = provider.complete(
                messages=messages,
                temperature=0.0,
                max_tokens=settings.ai_max_response_tokens,
            )
        elif hasattr(provider, "chat"):
            result = provider.chat(
                messages=messages,
                temperature=0.0,
                max_tokens=settings.ai_max_response_tokens,
            )
        else:
            raise AIProviderException("LLM provider không có method generate/complete/chat.")
        if inspect.isawaitable(result):
            return await result
        return result

    async def _lay_llm_provider(self) -> Any | None:
        if self.llm_provider is not None:
            return self.llm_provider
        try:
            from app.providers.llm import get_llm_provider
            provider = get_llm_provider()
            if inspect.isawaitable(provider):
                provider = await provider
            return provider
        except (ImportError, AttributeError):
            return None

    def _tron_diem(
        self,
        rule_scores: dict[str, float],
        model_result: dict[str, Any] | None,
    ) -> dict[str, float]:
        scores = dict(rule_scores)
        if not model_result:
            return scores
        model_type = model_result.get("primary_type")
        model_confidence = self._clamp_confidence(model_result.get("confidence", 0.0))
        if model_type not in DOCUMENT_TYPES:
            return scores
        for document_type in DOCUMENT_TYPES:
            scores[document_type] = scores.get(document_type, 0.0) * 0.70
        scores[model_type] = scores.get(model_type, 0.0) + model_confidence * 0.30
        for secondary_type in model_result.get("secondary_types") or []:
            if secondary_type in DOCUMENT_TYPES:
                scores[secondary_type] = scores.get(secondary_type, 0.0) + 0.08
        return {
            document_type: min(1.0, score)
            for document_type, score in scores.items()
        }

    def _lay_top_scores(
        self,
        scores: dict[str, float],
    ) -> tuple[str, float, float]:
        ordered = sorted(
            scores.items(),
            key=lambda item: item[1],
            reverse=True,
        )
        if not ordered:
            return "OTHER", 0.0, 0.0
        primary_type, primary_score = ordered[0]
        second_score = ordered[1][1] if len(ordered) > 1 else 0.0
        return primary_type, primary_score, second_score

    def _lay_secondary_types(
        self,
        scores: dict[str, float],
        primary_type: str,
    ) -> list[str]:
        return [
            document_type
            for document_type, score in sorted(
                scores.items(),
                key=lambda item: item[1],
                reverse=True,
            )
            if document_type != primary_type and score >= 0.35
        ][:3]

    def _lay_evidence(
        self,
        primary_type: str,
        rule_evidence: dict[str, list[str]],
        model_result: dict[str, Any] | None,
    ) -> list[str]:
        evidence = list(rule_evidence.get(primary_type) or [])
        if model_result and model_result.get("primary_type") == primary_type:
            evidence.extend(model_result.get("evidence") or [])
        unique: list[str] = []
        seen: set[str] = set()
        for item in evidence:
            if item not in seen:
                seen.add(item)
                unique.append(item)
        return unique[:20]

    def _tinh_confidence(
        self,
        primary_score: float,
        second_score: float,
        primary_type: str,
    ) -> float:
        if primary_type == "OTHER" and primary_score < self.confidence_threshold:
            return min(0.55, primary_score)
        margin = max(0.0, primary_score - second_score)
        confidence = primary_score * 0.80 + min(1.0, margin / 0.5) * 0.20
        return self._clamp_confidence(confidence)

    def _xac_dinh_status(
        self,
        primary_type: str,
        confidence: float,
        second_score: float,
        primary_score: float,
    ) -> str:
        if primary_type == "OTHER":
            return CLASSIFICATION_STATUS_NEED_REVIEW
        if confidence < self.confidence_threshold:
            return CLASSIFICATION_STATUS_NEED_REVIEW
        if primary_score - second_score < self.review_margin:
            return CLASSIFICATION_STATUS_NEED_REVIEW
        return CLASSIFICATION_STATUS_COMPLETED

    def _normalize_text(self, value: str) -> str:
        value = value.lower().strip()
        value = re.sub(r"\s+", " ", value)
        return value

    def _evidence_exists(self, evidence: str, raw_text: str) -> bool:
        normalized_evidence = self._normalize_text(evidence)
        normalized_text = self._normalize_text(raw_text)
        return bool(normalized_evidence and normalized_evidence in normalized_text)

    def _clamp_confidence(self, value: Any) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, number))

    def _lay_response_content(self, response: Any) -> str:
        if response is None:
            return ""
        if isinstance(response, dict):
            if "content" in response:
                return str(response["content"])
            if "text" in response:
                return str(response["text"])
            choices = response.get("choices") or []
            if choices and isinstance(choices[0], dict):
                message = choices[0].get("message") or {}
                return str(message.get("content") or "")
        content = getattr(response, "content", None)
        if content is not None:
            return str(content)
        text = getattr(response, "text", None)
        if text is not None:
            return str(text)
        return str(response)

    def _parse_json_response(self, content: str) -> dict[str, Any]:
        value = content.strip()
        value = re.sub(r"^```json\s*", "", value, flags=re.I)
        value = re.sub(r"^```\s*", "", value)
        value = re.sub(r"\s*```$", "", value)
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", value, flags=re.S)
            if not match:
                return {}
            try:
                parsed = json.loads(match.group(0))
                return parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                return {}

    def _lay_model_version(self, response: Any, provider: Any) -> str | None:
        if isinstance(response, dict):
            return response.get("model") or response.get("model_version")
        return (
            getattr(response, "model", None)
            or getattr(response, "model_version", None)
            or getattr(provider, "model", None)
            or getattr(provider, "model_version", None)
        )

    def kiem_tra_ket_qua(self, result: dict[str, Any]) -> dict[str, Any]:
        errors: list[str] = []
        primary_type = result.get("primary_type")
        if primary_type not in DOCUMENT_TYPES:
            errors.append("primary_type không hợp lệ.")
        confidence = result.get("confidence")
        if not isinstance(confidence, int | float) or not 0 <= confidence <= 1:
            errors.append("confidence phải nằm trong khoảng 0..1.")
        if not result.get("classifier_version"):
            errors.append("Thiếu classifier_version.")
        result["valid"] = not errors
        result["validation_errors"] = errors
        return result


def tao_phan_loai_service(llm_provider: Any | None = None) -> PhanLoaiService:
    return PhanLoaiService(llm_provider=llm_provider)


phan_loai_service = PhanLoaiService()