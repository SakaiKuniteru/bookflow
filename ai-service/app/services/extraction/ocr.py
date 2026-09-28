# app/services/extraction/ocr.py

from __future__ import annotations

import io
import mimetypes
import os
import re
from dataclasses import asdict, dataclass, field
from typing import Any, Protocol
from xml.etree import ElementTree

from app.core.exceptions import AIProviderException, AIValidationException


OCR_STATUS_PENDING = "PENDING"
OCR_STATUS_PROCESSING = "PROCESSING"
OCR_STATUS_COMPLETED = "COMPLETED"
OCR_STATUS_PARTIAL = "PARTIAL"
OCR_STATUS_FAILED = "FAILED"

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
    "application/json",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
    "image/bmp",
}

IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
    "image/bmp",
}

EXTENSION_TO_MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
}

DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024


@dataclass(slots=True)
class OCRRegion:
    text: str
    confidence: float | None = None
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class OCRPage:
    page_number: int
    text: str
    confidence: float | None = None
    regions: list[OCRRegion] = field(default_factory=list)
    tables: list[dict[str, Any]] = field(default_factory=list)
    status: str = OCR_STATUS_COMPLETED
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class OCRResult:
    source_file_id: str | None
    source_version: int | str | None
    file_name: str
    mime_type: str
    status: str
    strategy: str
    raw_text: str
    pages: list[OCRPage]
    warnings: list[str]
    errors: list[str]
    metadata: dict[str, Any]
    ocr_provider: str | None = None
    ocr_version: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_file_id": self.source_file_id,
            "source_version": self.source_version,
            "file_name": self.file_name,
            "mime_type": self.mime_type,
            "status": self.status,
            "strategy": self.strategy,
            "raw_text": self.raw_text,
            "pages": [page.to_dict() for page in self.pages],
            "warnings": self.warnings,
            "errors": self.errors,
            "metadata": self.metadata,
            "ocr_provider": self.ocr_provider,
            "ocr_version": self.ocr_version,
        }


class OCRProvider(Protocol):
    async def recognize(
        self,
        content: bytes,
        mime_type: str,
        file_name: str,
        page_number: int | None = None,
    ) -> dict[str, Any]:
        ...


class OCRService:
    def __init__(
        self,
        provider: OCRProvider | None = None,
        max_file_size: int = DEFAULT_MAX_FILE_SIZE,
    ) -> None:
        self.provider = provider
        self.max_file_size = max_file_size

    async def xu_ly_file(
        self,
        content: bytes,
        file_name: str,
        mime_type: str | None = None,
        source_file_id: str | None = None,
        source_version: int | str | None = None,
        access_verified: bool = False,
        force_ocr: bool = False,
    ) -> dict[str, Any]:
        self._kiem_tra_quyen(access_verified)
        self._kiem_tra_file(content, file_name)
        resolved_mime = self._xac_dinh_mime_type(file_name, mime_type)
        self._kiem_tra_mime_type(resolved_mime)
        warnings: list[str] = []
        errors: list[str] = []
        try:
            if resolved_mime == "application/pdf":
                pages = self._doc_text_pdf(content)
                co_text = any(page.text.strip() for page in pages)
                if co_text and not force_ocr:
                    result = self._tao_result(
                        source_file_id=source_file_id,
                        source_version=source_version,
                        file_name=file_name,
                        mime_type=resolved_mime,
                        status=OCR_STATUS_COMPLETED,
                        strategy="DIRECT_TEXT",
                        pages=pages,
                        warnings=warnings,
                        errors=errors,
                        metadata={"has_text_layer": True},
                    )
                    return result.to_dict()
                ocr_result = await self._ocr_document(
                    content=content,
                    file_name=file_name,
                    mime_type=resolved_mime,
                )
                ocr_result.source_file_id = source_file_id
                ocr_result.source_version = source_version
                if not co_text:
                    ocr_result.metadata["has_text_layer"] = False
                return ocr_result.to_dict()
            if resolved_mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                text = self._doc_text_docx(content)
                page = OCRPage(page_number=1, text=text, confidence=None)
                result = self._tao_result(
                    source_file_id=source_file_id,
                    source_version=source_version,
                    file_name=file_name,
                    mime_type=resolved_mime,
                    status=OCR_STATUS_COMPLETED,
                    strategy="DIRECT_TEXT",
                    pages=[page],
                    warnings=warnings,
                    errors=errors,
                    metadata={"has_text_layer": bool(text.strip())},
                )
                return result.to_dict()
            if resolved_mime in {"text/plain", "text/csv", "application/json"}:
                text = self._doc_text_plain(content, resolved_mime)
                page = OCRPage(page_number=1, text=text, confidence=None)
                result = self._tao_result(
                    source_file_id=source_file_id,
                    source_version=source_version,
                    file_name=file_name,
                    mime_type=resolved_mime,
                    status=OCR_STATUS_COMPLETED,
                    strategy="DIRECT_TEXT",
                    pages=[page],
                    warnings=warnings,
                    errors=errors,
                    metadata={"has_text_layer": bool(text.strip())},
                )
                return result.to_dict()
            if resolved_mime in IMAGE_MIME_TYPES:
                ocr_result = await self._ocr_document(
                    content=content,
                    file_name=file_name,
                    mime_type=resolved_mime,
                )
                ocr_result.source_file_id = source_file_id
                ocr_result.source_version = source_version
                return ocr_result.to_dict()
            raise AIValidationException(f"Không hỗ trợ loại file: {resolved_mime}")
        except AIValidationException:
            raise
        except AIProviderException as exc:
            result = self._tao_result(
                source_file_id=source_file_id,
                source_version=source_version,
                file_name=file_name,
                mime_type=resolved_mime,
                status=OCR_STATUS_FAILED,
                strategy="OCR",
                pages=[],
                warnings=warnings,
                errors=[str(exc)],
                metadata={},
            )
            return result.to_dict()
        except Exception as exc:
            result = self._tao_result(
                source_file_id=source_file_id,
                source_version=source_version,
                file_name=file_name,
                mime_type=resolved_mime,
                status=OCR_STATUS_FAILED,
                strategy="UNKNOWN",
                pages=[],
                warnings=warnings,
                errors=[str(exc)],
                metadata={},
            )
            return result.to_dict()

    def _kiem_tra_quyen(self, access_verified: bool) -> None:
        if not access_verified:
            raise AIValidationException(
                "Extraction yêu cầu file đã được Backend xác thực quyền truy cập."
            )

    def _kiem_tra_file(self, content: bytes, file_name: str) -> None:
        if not content:
            raise AIValidationException("File rỗng.")
        if not file_name or not file_name.strip():
            raise AIValidationException("Thiếu tên file.")
        if len(content) > self.max_file_size:
            raise AIValidationException(
                f"File vượt quá kích thước cho phép: {self.max_file_size} bytes."
            )

    def _kiem_tra_mime_type(self, mime_type: str) -> None:
        if mime_type not in SUPPORTED_MIME_TYPES:
            raise AIValidationException(f"MIME type không được hỗ trợ: {mime_type}")

    def _xac_dinh_mime_type(self, file_name: str, mime_type: str | None) -> str:
        if mime_type:
            normalized = mime_type.split(";")[0].strip().lower()
            if normalized != "application/octet-stream":
                return normalized
        extension = os.path.splitext(file_name.lower())[1]
        if extension in EXTENSION_TO_MIME:
            return EXTENSION_TO_MIME[extension]
        guessed, _ = mimetypes.guess_type(file_name)
        if guessed:
            return guessed
        raise AIValidationException(f"Không xác định được MIME type của file: {file_name}")

    def _doc_text_plain(self, content: bytes, mime_type: str) -> str:
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = content.decode("utf-8", errors="replace")
        if mime_type == "application/json":
            try:
                import json
                parsed = json.loads(text)
                return json.dumps(parsed, ensure_ascii=False, indent=2)
            except Exception:
                return text
        return text

    def _doc_text_docx(self, content: bytes) -> str:
        try:
            import zipfile
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                xml_content = archive.read("word/document.xml")
        except Exception as exc:
            raise AIValidationException(f"Không đọc được DOCX: {exc}") from exc
        try:
            root = ElementTree.fromstring(xml_content)
        except ElementTree.ParseError as exc:
            raise AIValidationException(f"DOCX có XML không hợp lệ: {exc}") from exc
        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs: list[str] = []
        for paragraph in root.findall(".//w:p", namespace):
            parts = [node.text or "" for node in paragraph.findall(".//w:t", namespace)]
            value = "".join(parts).strip()
            if value:
                paragraphs.append(value)
        return "\n".join(paragraphs)

    def _doc_text_pdf(self, content: bytes) -> list[OCRPage]:
        try:
            from pypdf import PdfReader
        except ImportError:
            return []
        try:
            reader = PdfReader(io.BytesIO(content))
        except Exception:
            return []
        pages: list[OCRPage] = []
        for index, pdf_page in enumerate(reader.pages, start=1):
            try:
                text = (pdf_page.extract_text() or "").strip()
                pages.append(
                    OCRPage(
                        page_number=index,
                        text=text,
                        confidence=None,
                        status=OCR_STATUS_COMPLETED,
                    )
                )
            except Exception as exc:
                pages.append(
                    OCRPage(
                        page_number=index,
                        text="",
                        confidence=None,
                        status=OCR_STATUS_FAILED,
                        error=str(exc),
                    )
                )
        return pages

    async def _ocr_document(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
    ) -> OCRResult:
        if self.provider is None:
            raise AIProviderException(
                "Chưa cấu hình OCR provider cho file không có text layer."
            )
        response = await self.provider.recognize(
            content=content,
            mime_type=mime_type,
            file_name=file_name,
        )
        return self._chuan_hoa_ocr_response(
            response=response,
            file_name=file_name,
            mime_type=mime_type,
        )

    def _chuan_hoa_ocr_response(
        self,
        response: dict[str, Any],
        file_name: str,
        mime_type: str,
    ) -> OCRResult:
        if not isinstance(response, dict):
            raise AIProviderException("OCR provider trả về response không hợp lệ.")
        raw_pages = response.get("pages") or []
        warnings = list(response.get("warnings") or [])
        errors = list(response.get("errors") or [])
        pages: list[OCRPage] = []
        if raw_pages:
            for index, raw_page in enumerate(raw_pages, start=1):
                pages.append(self._chuan_hoa_page(raw_page, index))
        else:
            text = str(response.get("text") or "").strip()
            if text:
                pages.append(
                    OCRPage(
                        page_number=1,
                        text=text,
                        confidence=self._safe_float(response.get("confidence")),
                        regions=[],
                        tables=list(response.get("tables") or []),
                    )
                )
                if mime_type == "application/pdf":
                    warnings.append(
                        "OCR provider không trả page boundary; page_number chỉ là vùng kết quả tổng hợp."
                    )
        successful_pages = [page for page in pages if page.status == OCR_STATUS_COMPLETED]
        failed_pages = [page for page in pages if page.status == OCR_STATUS_FAILED]
        if failed_pages and successful_pages:
            status = OCR_STATUS_PARTIAL
        elif failed_pages and not successful_pages:
            status = OCR_STATUS_FAILED
        else:
            status = OCR_STATUS_COMPLETED
        if not pages and not errors:
            errors.append("OCR provider không trả về nội dung.")
            status = OCR_STATUS_FAILED
        raw_text = "\n\n".join(
            page.text.strip() for page in pages if page.text and page.text.strip()
        )
        return OCRResult(
            source_file_id=None,
            source_version=None,
            file_name=file_name,
            mime_type=mime_type,
            status=status,
            strategy="OCR",
            raw_text=raw_text,
            pages=pages,
            warnings=warnings,
            errors=errors,
            metadata=dict(response.get("metadata") or {}),
            ocr_provider=response.get("provider") or self.provider.__class__.__name__,
            ocr_version=response.get("version") or getattr(self.provider, "version", None),
        )

    def _chuan_hoa_page(self, raw_page: Any, default_page_number: int) -> OCRPage:
        if not isinstance(raw_page, dict):
            return OCRPage(
                page_number=default_page_number,
                text=str(raw_page or ""),
                confidence=None,
            )
        page_number = self._safe_int(raw_page.get("page_number")) or default_page_number
        raw_regions = raw_page.get("regions") or raw_page.get("blocks") or []
        regions = [self._chuan_hoa_region(region) for region in raw_regions if isinstance(region, dict)]
        return OCRPage(
            page_number=page_number,
            text=str(raw_page.get("text") or "").strip(),
            confidence=self._safe_float(raw_page.get("confidence")),
            regions=regions,
            tables=list(raw_page.get("tables") or []),
            status=str(raw_page.get("status") or OCR_STATUS_COMPLETED),
            error=raw_page.get("error"),
        )

    def _chuan_hoa_region(self, raw_region: dict[str, Any]) -> OCRRegion:
        return OCRRegion(
            text=str(raw_region.get("text") or ""),
            confidence=self._safe_float(raw_region.get("confidence")),
            x=self._safe_float(raw_region.get("x")),
            y=self._safe_float(raw_region.get("y")),
            width=self._safe_float(raw_region.get("width")),
            height=self._safe_float(raw_region.get("height")),
            metadata=dict(raw_region.get("metadata") or {}),
        )

    def _tao_result(
        self,
        source_file_id: str | None,
        source_version: int | str | None,
        file_name: str,
        mime_type: str,
        status: str,
        strategy: str,
        pages: list[OCRPage],
        warnings: list[str],
        errors: list[str],
        metadata: dict[str, Any],
    ) -> OCRResult:
        raw_text = "\n\n".join(
            page.text.strip() for page in pages if page.text and page.text.strip()
        )
        return OCRResult(
            source_file_id=source_file_id,
            source_version=source_version,
            file_name=file_name,
            mime_type=mime_type,
            status=status,
            strategy=strategy,
            raw_text=raw_text,
            pages=pages,
            warnings=warnings,
            errors=errors,
            metadata=metadata,
        )

    def kiem_tra_ket_qua(self, result: dict[str, Any]) -> dict[str, Any]:
        errors: list[str] = []
        if not result.get("source_file_id"):
            errors.append("Thiếu source_file_id.")
        if result.get("status") == OCR_STATUS_FAILED:
            errors.append("Kết quả OCR ở trạng thái FAILED.")
        if not result.get("raw_text") and not result.get("pages"):
            errors.append("Không có text hoặc page nào.")
        result["valid"] = not errors
        result["validation_errors"] = errors
        return result


def tao_ocr_service(provider: OCRProvider | None = None) -> OCRService:
    return OCRService(provider=provider)


ocr_service = OCRService()