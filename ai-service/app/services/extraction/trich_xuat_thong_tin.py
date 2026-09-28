# app/services/extraction/trich_xuat_thong_tin.py

from __future__ import annotations

import inspect
import json
import re
import unicodedata
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

from app.core.config import get_settings
from app.core.exceptions import AIProviderException, AIValidationException
from app.providers.base import LLMMessage


EXTRACTION_VERSION = "extraction-v1"

DOCUMENT_TYPE_BOOK_COVER = "BOOK_COVER"
DOCUMENT_TYPE_BOOK_METADATA = "BOOK_METADATA"
DOCUMENT_TYPE_BOOK_DOCUMENT = "BOOK_DOCUMENT"
DOCUMENT_TYPE_INVOICE = "INVOICE"
DOCUMENT_TYPE_RECEIPT = "RECEIPT"
DOCUMENT_TYPE_INVENTORY_RECEIPT = "INVENTORY_RECEIPT"
DOCUMENT_TYPE_CONTRACT = "CONTRACT"
DOCUMENT_TYPE_POLICY = "POLICY"
DOCUMENT_TYPE_REPORT = "REPORT"
DOCUMENT_TYPE_OTHER = "OTHER"

EXTRACTION_SCHEMAS: dict[str, dict[str, Any]] = {
    DOCUMENT_TYPE_BOOK_COVER: {
        "fields": ["title", "subtitle", "author", "edition", "isbn"],
        "required": ["title"],
    },
    DOCUMENT_TYPE_BOOK_METADATA: {
        "fields": [
            "title",
            "subtitle",
            "author",
            "publisher",
            "isbn",
            "edition",
            "publication_year",
            "language",
            "category",
            "keywords",
        ],
        "required": ["title"],
    },
    DOCUMENT_TYPE_BOOK_DOCUMENT: {
        "fields": [
            "title",
            "author",
            "publisher",
            "isbn",
            "edition",
            "publication_year",
            "language",
            "topics",
            "keywords",
        ],
        "required": [],
    },
    DOCUMENT_TYPE_INVOICE: {
        "fields": [
            "invoice_number",
            "supplier",
            "date",
            "currency",
            "items",
            "subtotal",
            "tax",
            "total",
        ],
        "required": ["invoice_number"],
    },
    DOCUMENT_TYPE_RECEIPT: {
        "fields": [
            "receipt_number",
            "supplier",
            "date",
            "currency",
            "items",
            "total",
        ],
        "required": [],
    },
    DOCUMENT_TYPE_INVENTORY_RECEIPT: {
        "fields": [
            "receipt_number",
            "supplier",
            "date",
            "warehouse",
            "items",
            "total",
        ],
        "required": [],
    },
    DOCUMENT_TYPE_CONTRACT: {
        "fields": [
            "title",
            "contract_number",
            "parties",
            "date",
            "effective_date",
            "expiry_date",
            "keywords",
        ],
        "required": [],
    },
    DOCUMENT_TYPE_POLICY: {
        "fields": [
            "title",
            "effective_date",
            "keywords",
            "topics",
        ],
        "required": ["title"],
    },
    DOCUMENT_TYPE_REPORT: {
        "fields": [
            "title",
            "date",
            "period",
            "author",
            "keywords",
            "topics",
        ],
        "required": ["title"],
    },
    DOCUMENT_TYPE_OTHER: {
        "fields": [
            "title",
            "author",
            "date",
            "keywords",
            "topics",
        ],
        "required": [],
    },
}

RULE_CONFIDENCE = {
    "isbn": 0.99,
    "email": 0.99,
    "phone": 0.98,
    "date": 0.96,
    "publication_year": 0.95,
    "price": 0.94,
    "invoice_number": 0.96,
    "receipt_number": 0.96,
    "title": 0.88,
    "author": 0.90,
    "publisher": 0.90,
    "edition": 0.88,
    "supplier": 0.90,
}


@dataclass(slots=True)
class ExtractedField:
    value: Any
    confidence: float
    source: str
    evidence: str | None = None
    source_page: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class ExtractionResult:
    source_file_id: str | None
    source_version: int | str | None
    status: str
    document_type: str
    raw_text: str
    pages: list[dict[str, Any]]
    extracted_data: dict[str, Any]
    normalized_data: dict[str, Any]
    confidence: dict[str, float]
    field_evidence: dict[str, dict[str, Any]]
    warnings: list[str]
    errors: list[str]
    conflicts: list[dict[str, Any]]
    missing_fields: list[str]
    extraction_version: str
    ocr_version: str | None
    model_version: str | None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class TrichXuatThongTinService:
    def __init__(self, llm_provider: Any | None = None) -> None:
        self.llm_provider = llm_provider

    async def trich_xuat(
        self,
        ocr_result: dict[str, Any],
        document_type_hint: str | None = None,
        existing_data: dict[str, Any] | None = None,
        verified_fields: list[str] | None = None,
        extraction_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not isinstance(ocr_result, dict):
            raise AIValidationException("ocr_result phải là object.")
        raw_text = str(ocr_result.get("raw_text") or "").strip()
        if not raw_text:
            raise AIValidationException("Không có raw_text để extraction.")
        document_type = self._chuan_hoa_document_type(document_type_hint)
        schema = EXTRACTION_SCHEMAS.get(document_type, EXTRACTION_SCHEMAS[DOCUMENT_TYPE_OTHER])
        warnings = list(ocr_result.get("warnings") or [])
        errors = list(ocr_result.get("errors") or [])
        extracted_fields = self._trich_xuat_bang_rule(
            raw_text=raw_text,
            pages=ocr_result.get("pages") or [],
            document_type=document_type,
            schema=schema,
        )
        model_version: str | None = None
        llm_provider = await self._lay_llm_provider()
        if llm_provider is not None:
            try:
                llm_fields, model_version = await self._trich_xuat_bang_llm(
                    raw_text=raw_text,
                    document_type=document_type,
                    schema=schema,
                    extraction_context=extraction_context or {},
                    provider=llm_provider,
                )
                extracted_fields = self._tron_ket_qua(
                    rule_fields=extracted_fields,
                    llm_fields=llm_fields,
                )
            except Exception as exc:
                warnings.append(f"LLM extraction không thành công: {exc}")
        extracted_data = {
            field_name: field.value
            for field_name, field in extracted_fields.items()
            if field.value is not None and field.value != ""
        }
        normalized_data = {
            field_name: self._chuan_hoa_field(field_name, field.value)
            for field_name, field in extracted_fields.items()
            if field.value is not None and field.value != ""
        }
        confidence = {
            field_name: self._clamp_confidence(field.confidence)
            for field_name, field in extracted_fields.items()
            if field.value is not None and field.value != ""
        }
        field_evidence = {
            field_name: {
                "source": field.source,
                "evidence": field.evidence,
                "source_page": field.source_page,
            }
            for field_name, field in extracted_fields.items()
            if field.value is not None and field.value != ""
        }
        conflicts = self._phat_hien_xung_dot(
            normalized_data=normalized_data,
            existing_data=existing_data or {},
            verified_fields=set(verified_fields or []),
        )
        missing_fields = self._lay_truong_thieu(
            normalized_data=normalized_data,
            required_fields=schema.get("required") or [],
        )
        low_confidence_fields = [
            field_name
            for field_name in schema.get("required") or []
            if field_name in confidence and confidence[field_name] < 0.6
        ]
        if conflicts:
            status = "NEED_REVIEW"
        elif missing_fields or low_confidence_fields:
            status = "NEED_REVIEW"
        elif not extracted_data:
            status = "NEED_REVIEW"
            warnings.append("Không trích xuất được trường dữ liệu có cấu trúc.")
        else:
            status = "COMPLETED"
        if low_confidence_fields:
            warnings.append(
                f"Trường bắt buộc có confidence thấp: {', '.join(low_confidence_fields)}."
            )
        result = ExtractionResult(
            source_file_id=ocr_result.get("source_file_id"),
            source_version=ocr_result.get("source_version"),
            status=status,
            document_type=document_type,
            raw_text=raw_text,
            pages=list(ocr_result.get("pages") or []),
            extracted_data=extracted_data,
            normalized_data=normalized_data,
            confidence=confidence,
            field_evidence=field_evidence,
            warnings=warnings,
            errors=errors,
            conflicts=conflicts,
            missing_fields=missing_fields,
            extraction_version=EXTRACTION_VERSION,
            ocr_version=ocr_result.get("ocr_version"),
            model_version=model_version,
            metadata={
                "file_name": ocr_result.get("file_name"),
                "mime_type": ocr_result.get("mime_type"),
                "ocr_strategy": ocr_result.get("strategy"),
                "extraction_context": extraction_context or {},
                "processed_at": datetime.utcnow().isoformat() + "Z",
            },
        )
        return self.kiem_tra_ket_qua(result.to_dict())

    def _trich_xuat_bang_rule(
        self,
        raw_text: str,
        pages: list[dict[str, Any]],
        document_type: str,
        schema: dict[str, Any],
    ) -> dict[str, ExtractedField]:
        fields: dict[str, ExtractedField] = {}
        allowed_fields = set(schema.get("fields") or [])
        self._them_field(fields, "isbn", self._tim_isbn(raw_text), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "email", self._tim_email(raw_text), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "phone", self._tim_phone(raw_text), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "title", self._tim_label_value(raw_text, ["Tên sách", "Tên tài liệu", "Title", "Tiêu đề"]), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "author", self._tim_label_value(raw_text, ["Tác giả", "Author"]), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "publisher", self._tim_label_value(raw_text, ["Nhà xuất bản", "Publisher"]), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "edition", self._tim_label_value(raw_text, ["Edition", "Lần xuất bản", "Ấn bản"]), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "supplier", self._tim_label_value(raw_text, ["Nhà cung cấp", "Supplier"]), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "invoice_number", self._tim_label_value(raw_text, ["Số hóa đơn", "Invoice No", "Invoice Number"]), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "receipt_number", self._tim_label_value(raw_text, ["Số phiếu", "Số biên nhận", "Receipt No"]), raw_text, allowed_fields, "RULE")
        self._them_field(fields, "warehouse", self._tim_label_value(raw_text, ["Kho", "Warehouse"]), raw_text, allowed_fields, "RULE")
        date_value, date_evidence = self._tim_ngay(raw_text)
        self._them_field_with_evidence(fields, "date", date_value, date_evidence, allowed_fields, "RULE", raw_text)
        self._them_field(fields, "publication_year", self._tim_nam(raw_text), raw_text, allowed_fields, "RULE")
        total_value, total_evidence = self._tim_tien(raw_text, ["Tổng tiền", "Total", "Thành tiền", "Giá"])
        self._them_field_with_evidence(fields, "total", total_value, total_evidence, allowed_fields, "RULE", raw_text)
        items = self._trich_xuat_items_tu_bang(pages)
        if items and "items" in allowed_fields:
            fields["items"] = ExtractedField(
                value=items,
                confidence=0.90,
                source="OCR_TABLE",
                evidence="Dữ liệu lấy từ cấu trúc bảng OCR.",
            )
        if document_type in {DOCUMENT_TYPE_BOOK_COVER, DOCUMENT_TYPE_BOOK_METADATA} and "title" in allowed_fields and "title" not in fields:
            first_line = self._lay_dong_dau_tien_hop_le(raw_text)
            if first_line:
                fields["title"] = ExtractedField(
                    value=first_line,
                    confidence=0.70,
                    source="RULE",
                    evidence=first_line,
                )
        return fields

    async def _trich_xuat_bang_llm(
        self,
        raw_text: str,
        document_type: str,
        schema: dict[str, Any],
        extraction_context: dict[str, Any],
        provider: Any,
    ) -> tuple[dict[str, ExtractedField], str | None]:
        settings = get_settings()
        fields = list(schema.get("fields") or [])
        system_prompt = (
            "Bạn là bộ trích xuất dữ liệu của BookFlow. "
            "Chỉ được trích xuất thông tin có bằng chứng trong nội dung được cung cấp. "
            "Không được suy đoán, tự hoàn thiện ISBN, giá, ngày hoặc thông tin nghiệp vụ. "
            "Trả về JSON hợp lệ duy nhất theo cấu trúc "
            '{"fields":{"field_name":{"value":...,"confidence":0.0,"evidence":"..."}}}. '
            f"Chỉ được sử dụng các field sau: {', '.join(fields)}."
        )
        user_prompt = json.dumps(
            {
                "document_type": document_type,
                "allowed_fields": fields,
                "context": extraction_context,
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
        raw_fields = parsed.get("fields") if isinstance(parsed, dict) else {}
        if not isinstance(raw_fields, dict):
            return {}, self._lay_model_version(response, provider)
        result: dict[str, ExtractedField] = {}
        for field_name, raw_field in raw_fields.items():
            if field_name not in fields:
                continue
            if not isinstance(raw_field, dict):
                continue
            value = raw_field.get("value")
            if value is None or value == "":
                continue
            confidence = self._clamp_confidence(raw_field.get("confidence", 0.65))
            evidence = str(raw_field.get("evidence") or "").strip() or None
            if evidence and not self._evidence_exists(evidence, raw_text):
                evidence = None
                confidence = min(confidence, 0.55)
            result[field_name] = ExtractedField(
                value=value,
                confidence=confidence,
                source="LLM",
                evidence=evidence,
                source_page=self._tim_trang_tu_evidence(evidence, raw_text),
            )
        return result, self._lay_model_version(response, provider)

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

    def _tron_ket_qua(
        self,
        rule_fields: dict[str, ExtractedField],
        llm_fields: dict[str, ExtractedField],
    ) -> dict[str, ExtractedField]:
        result = dict(rule_fields)
        for field_name, llm_field in llm_fields.items():
            if field_name not in result:
                result[field_name] = llm_field
                continue
            current = result[field_name]
            if current.source == "RULE" and current.confidence >= 0.9:
                continue
            if llm_field.confidence > current.confidence:
                result[field_name] = llm_field
        return result

    def _them_field(
        self,
        fields: dict[str, ExtractedField],
        field_name: str,
        value: Any,
        raw_text: str,
        allowed_fields: set[str],
        source: str,
    ) -> None:
        if field_name not in allowed_fields or value is None or value == "":
            return
        evidence = self._tim_evidence_value(value, raw_text)
        fields[field_name] = ExtractedField(
            value=value,
            confidence=RULE_CONFIDENCE.get(field_name, 0.85),
            source=source,
            evidence=evidence,
            source_page=self._tim_trang_tu_evidence(evidence, raw_text),
        )

    def _them_field_with_evidence(
        self,
        fields: dict[str, ExtractedField],
        field_name: str,
        value: Any,
        evidence: str | None,
        allowed_fields: set[str],
        source: str,
        raw_text: str,
    ) -> None:
        if field_name not in allowed_fields or value is None or value == "":
            return
        fields[field_name] = ExtractedField(
            value=value,
            confidence=RULE_CONFIDENCE.get(field_name, 0.85),
            source=source,
            evidence=evidence,
            source_page=self._tim_trang_tu_evidence(evidence, raw_text),
        )

    def _tim_label_value(self, text: str, labels: list[str]) -> str | None:
        label_pattern = "|".join(re.escape(label) for label in labels)
        pattern = rf"(?im)^\s*(?:{label_pattern})\s*[:：\-]\s*(.+?)\s*$"
        match = re.search(pattern, text)
        return match.group(1).strip() if match else None

    def _tim_isbn(self, text: str) -> str | None:
        match = re.search(
            r"(?i)\bISBN(?:-1[03])?\s*[:：]?\s*([0-9Xx][0-9Xx\-\s]{8,20}[0-9Xx])\b",
            text,
        )
        if not match:
            return None
        value = re.sub(r"[\s\-]", "", match.group(1)).upper()
        digits = re.sub(r"[^0-9X]", "", value)
        if len(digits) not in {10, 13}:
            return value
        return value

    def _tim_email(self, text: str) -> str | None:
        match = re.search(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
            text,
        )
        return match.group(0) if match else None

    def _tim_phone(self, text: str) -> str | None:
        match = re.search(r"(?<!\d)(?:\+84|0)(?:[\s.-]?\d){9,10}(?!\d)", text)
        return match.group(0).strip() if match else None

    def _tim_ngay(self, text: str) -> tuple[str | None, str | None]:
        patterns = [
            r"(?im)^\s*(?:Ngày|Date|Ngày lập|Ngày xuất bản)\s*[:：\-]\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
            r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                value = match.group(1)
                return value, match.group(0)
        return None, None

    def _tim_nam(self, text: str) -> str | None:
        match = re.search(
            r"(?im)^\s*(?:Năm xuất bản|Năm|Year|Publication Year)\s*[:：\-]\s*(\d{4})\b",
            text,
        )
        if match:
            return match.group(1)
        return None

    def _tim_tien(
        self,
        text: str,
        labels: list[str],
    ) -> tuple[Any, str | None]:
        label_pattern = "|".join(re.escape(label) for label in labels)
        pattern = rf"(?im)^\s*(?:{label_pattern})\s*[:：\-]?\s*([0-9][0-9.,\s]*)(?:\s*(?:VNĐ|VND|đ|₫))?\s*$"
        match = re.search(pattern, text)
        if not match:
            return None, None
        raw_value = match.group(1).strip()
        return self._chuan_hoa_so_tien(raw_value), match.group(0)

    def _trich_xuat_items_tu_bang(self, pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for page in pages:
            for table in page.get("tables") or []:
                if not isinstance(table, dict):
                    continue
                columns = table.get("columns") or []
                rows = table.get("rows") or []
                if not columns or not rows:
                    continue
                normalized_columns = [self._chuan_hoa_ten_cot(column) for column in columns]
                for row in rows:
                    if isinstance(row, dict):
                        item = dict(row)
                    elif isinstance(row, list):
                        item = {
                            normalized_columns[index]: value
                            for index, value in enumerate(row)
                            if index < len(normalized_columns)
                        }
                    else:
                        continue
                    if item:
                        items.append(item)
        return items

    def _chuan_hoa_ten_cot(self, value: Any) -> str:
        text = self._chuan_hoa_text(str(value or "")).lower()
        mapping = {
            "isbn": "isbn",
            "tên sách": "title",
            "ten sach": "title",
            "số lượng": "quantity",
            "so luong": "quantity",
            "sl": "quantity",
            "giá": "unit_price",
            "gia": "unit_price",
            "đơn giá": "unit_price",
            "don gia": "unit_price",
        }
        return mapping.get(text, text.replace(" ", "_"))

    def _lay_dong_dau_tien_hop_le(self, text: str) -> str | None:
        for line in text.splitlines():
            value = self._chuan_hoa_text(line)
            if value and len(value) <= 200 and not re.search(r"^(ISBN|Tác giả|Author|Publisher)\s*:", value, re.I):
                return value
        return None

    def _chuan_hoa_field(self, field_name: str, value: Any) -> Any:
        if isinstance(value, list):
            return [self._chuan_hoa_field(field_name, item) for item in value]
        if isinstance(value, dict):
            return {
                key: self._chuan_hoa_field(key, item)
                for key, item in value.items()
            }
        if value is None:
            return None
        if field_name == "isbn":
            return re.sub(r"[\s\-]", "", str(value)).upper()
        if field_name in {"price", "total", "subtotal", "tax", "unit_price"}:
            return self._chuan_hoa_so_tien(value)
        if field_name in {"date", "publication_date", "effective_date", "expiry_date"}:
            return self._chuan_hoa_ngay(value)
        if field_name == "publication_year":
            match = re.search(r"\b(19|20)\d{2}\b", str(value))
            return match.group(0) if match else str(value).strip()
        if isinstance(value, str):
            return self._chuan_hoa_text(value)
        return value

    def _chuan_hoa_text(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKC", value)
        normalized = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", normalized)
        normalized = re.sub(r"[ \t]+", " ", normalized)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)
        return normalized.strip()

    def _chuan_hoa_so_tien(self, value: Any) -> int | float | str:
        if isinstance(value, int | float):
            return value
        text = str(value).strip()
        text = re.sub(r"(?i)(vnđ|vnd|đ|₫)", "", text).strip()
        text = text.replace(" ", "")
        if not text:
            return text
        if "." in text and "," in text:
            text = text.replace(".", "").replace(",", ".")
        elif "." in text:
            groups = text.split(".")
            if len(groups[-1]) == 3 and all(group.isdigit() for group in groups):
                text = "".join(groups)
        elif "," in text:
            groups = text.split(",")
            if len(groups[-1]) == 3 and all(group.isdigit() for group in groups):
                text = "".join(groups)
            else:
                text = text.replace(",", ".")
        try:
            number = float(text)
            return int(number) if number.is_integer() else number
        except ValueError:
            return value

    def _chuan_hoa_ngay(self, value: Any) -> Any:
        text = str(value).strip()
        for pattern, input_format in [
            (r"^\d{1,2}/\d{1,2}/\d{4}$", "%d/%m/%Y"),
            (r"^\d{1,2}-\d{1,2}-\d{4}$", "%d-%m-%Y"),
            (r"^\d{4}/\d{1,2}/\d{1,2}$", "%Y/%m/%d"),
            (r"^\d{4}-\d{1,2}-\d{1,2}$", "%Y-%m-%d"),
        ]:
            if re.match(pattern, text):
                try:
                    return datetime.strptime(text, input_format).date().isoformat()
                except ValueError:
                    return value
        return value

    def _phat_hien_xung_dot(
        self,
        normalized_data: dict[str, Any],
        existing_data: dict[str, Any],
        verified_fields: set[str],
    ) -> list[dict[str, Any]]:
        conflicts: list[dict[str, Any]] = []
        for field_name in verified_fields:
            if field_name not in existing_data or field_name not in normalized_data:
                continue
            existing_normalized = self._chuan_hoa_field(
                field_name,
                existing_data[field_name],
            )
            extracted_normalized = self._chuan_hoa_field(
                field_name,
                normalized_data[field_name],
            )
            if existing_normalized != extracted_normalized:
                conflicts.append(
                    {
                        "field": field_name,
                        "existing_value": existing_data[field_name],
                        "extracted_value": normalized_data[field_name],
                        "status": "CONFLICT",
                    }
                )
        return conflicts

    def _lay_truong_thieu(
        self,
        normalized_data: dict[str, Any],
        required_fields: list[str],
    ) -> list[str]:
        return [
            field_name
            for field_name in required_fields
            if field_name not in normalized_data
            or normalized_data[field_name] in {None, ""}
        ]

    def _chuan_hoa_document_type(self, document_type: str | None) -> str:
        if not document_type:
            return DOCUMENT_TYPE_OTHER
        normalized = str(document_type).strip().upper()
        return normalized if normalized in EXTRACTION_SCHEMAS else DOCUMENT_TYPE_OTHER

    def _evidence_exists(self, evidence: str, raw_text: str) -> bool:
        normalized_evidence = self._chuan_hoa_text(evidence).lower()
        normalized_text = self._chuan_hoa_text(raw_text).lower()
        return bool(normalized_evidence and normalized_evidence in normalized_text)

    def _tim_evidence_value(self, value: Any, raw_text: str) -> str | None:
        text_value = str(value or "").strip()
        if not text_value:
            return None
        if self._evidence_exists(text_value, raw_text):
            return text_value
        return None

    def _tim_trang_tu_evidence(self, evidence: str | None, raw_text: str) -> int | None:
        if not evidence:
            return None
        position = raw_text.lower().find(evidence.lower())
        if position < 0:
            return None
        return raw_text[:position].count("\n") + 1

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

    def _tim_isbn_page(self, value: str, pages: list[dict[str, Any]]) -> int | None:
        for page in pages:
            if value.lower() in str(page.get("text") or "").lower():
                return page.get("page_number")
        return None

    def kiem_tra_ket_qua(self, result: dict[str, Any]) -> dict[str, Any]:
        errors = list(result.get("errors") or [])
        if not result.get("source_file_id"):
            errors.append("Thiếu source_file_id.")
        if not result.get("raw_text"):
            errors.append("Thiếu raw_text.")
        if not result.get("document_type"):
            errors.append("Thiếu document_type.")
        if result.get("status") == "FAILED":
            errors.append("Extraction ở trạng thái FAILED.")
        result["valid"] = not errors
        result["validation_errors"] = errors
        return result


def tao_trich_xuat_thong_tin_service(llm_provider: Any | None = None) -> TrichXuatThongTinService:
    return TrichXuatThongTinService(llm_provider=llm_provider)


trich_xuat_thong_tin_service = TrichXuatThongTinService()