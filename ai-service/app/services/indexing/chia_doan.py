from __future__ import annotations
import hashlib
import re
from dataclasses import dataclass
from typing import Any

DEFAULT_MAX_CHARS = 1600
DEFAULT_OVERLAP_CHARS = 200
DEFAULT_MIN_CHARS = 80
_HEADING_CHAPTER = re.compile(r"^\s*(?:chương|chapter)\s+(.+)$", re.IGNORECASE)
_HEADING_SECTION = re.compile(r"^\s*(\d+(?:\.\d+){0,3})[\.\)]?\s+(.+)$")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?。！？])\s+")

@dataclass(slots=True)
class DonViNoiDung:
    content: str
    metadata: dict[str, Any]

@dataclass(slots=True)
class ChunkNoiDung:
    sequence: int
    content: str
    content_hash: str
    metadata: dict[str, Any]

class ChiaDoanService:
    def __init__(self, max_chars: int = DEFAULT_MAX_CHARS, overlap_chars: int = DEFAULT_OVERLAP_CHARS, min_chars: int = DEFAULT_MIN_CHARS):
        if max_chars <= 0:
            raise ValueError("max_chars phải lớn hơn 0")
        if overlap_chars < 0 or overlap_chars >= max_chars:
            raise ValueError("overlap_chars phải >= 0 và nhỏ hơn max_chars")
        if min_chars < 0 or min_chars > max_chars:
            raise ValueError("min_chars phải >= 0 và không vượt max_chars")
        self.max_chars = max_chars
        self.overlap_chars = overlap_chars
        self.min_chars = min_chars
    def chuan_hoa(self, content: str) -> str:
        if not isinstance(content, str):
            raise ValueError("content phải là chuỗi")
        content = content.replace("\r\n", "\n").replace("\r", "\n").replace("\u00a0", " ")
        content = re.sub(r"[ \t]+", " ", content)
        content = re.sub(r"\n[ \t]+", "\n", content)
        content = re.sub(r"\n{3,}", "\n\n", content)
        content = "\n".join(line.strip() for line in content.split("\n"))
        return content.strip()
    def _la_chuong(self, text: str) -> bool:
        return bool(_HEADING_CHAPTER.match(text.strip()))
    def _la_section(self, text: str) -> bool:
        return bool(_HEADING_SECTION.match(text.strip()))
    def _tach_don_vi(self, content: str, metadata: dict[str, Any]) -> list[DonViNoiDung]:
        paragraphs = [item.strip() for item in re.split(r"\n\s*\n", content) if item.strip()]
        current = dict(metadata)
        result: list[DonViNoiDung] = []
        for paragraph in paragraphs:
            first_line = paragraph.split("\n", 1)[0].strip()
            if self._la_chuong(first_line):
                current["chapter"] = first_line
                current.pop("section", None)
            elif self._la_section(first_line):
                current["section"] = first_line
            result.append(DonViNoiDung(content=paragraph, metadata=dict(current)))
        return result
    def _tach_nho(self, content: str) -> list[str]:
        if len(content) <= self.max_chars:
            return [content]
        sentences = [item.strip() for item in _SENTENCE_SPLIT.split(content) if item.strip()]
        if len(sentences) <= 1:
            return self._tach_theo_tu(content)
        result: list[str] = []
        current = ""
        for sentence in sentences:
            if len(sentence) > self.max_chars:
                if current:
                    result.append(current.strip())
                    current = ""
                result.extend(self._tach_theo_tu(sentence))
                continue
            candidate = f"{current} {sentence}".strip()
            if current and len(candidate) > self.max_chars:
                result.append(current.strip())
                current = sentence
            else:
                current = candidate
        if current:
            result.append(current.strip())
        return result
    def _tach_theo_tu(self, content: str) -> list[str]:
        words = content.split()
        result: list[str] = []
        current: list[str] = []
        current_length = 0
        for word in words:
            next_length = current_length + len(word) + (1 if current else 0)
            if current and next_length > self.max_chars:
                result.append(" ".join(current))
                current = [word]
                current_length = len(word)
            else:
                current.append(word)
                current_length = next_length
        if current:
            result.append(" ".join(current))
        return result
    def _lay_overlap(self, content: str) -> str:
        if self.overlap_chars <= 0 or not content:
            return ""
        overlap = content[-self.overlap_chars:]
        if " " in overlap:
            overlap = overlap[overlap.find(" ") + 1:]
        return overlap.strip()
    def chia(self, *, source_id: str, source_type: str, content: str | None = None, metadata: dict[str, Any] | None = None, version: int = 1, blocks: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
        if not source_id:
            raise ValueError("source_id là bắt buộc")
        if not source_type:
            raise ValueError("source_type là bắt buộc")
        base_metadata = dict(metadata or {})
        if blocks:
            units = []
            for block in blocks:
                block_content = self.chuan_hoa(str(block.get("content") or block.get("text") or ""))
                if not block_content:
                    continue
                block_metadata = dict(base_metadata)
                block_metadata.update({key: block[key] for key in ("chapter", "section", "page", "title") if block.get(key) is not None})
                units.append(DonViNoiDung(content=block_content, metadata=block_metadata))
        else:
            normalized = self.chuan_hoa(content or "")
            if not normalized:
                return []
            units = self._tach_don_vi(normalized, base_metadata)
        chunks: list[ChunkNoiDung] = []
        sequence = 1
        current_content = ""
        current_metadata: dict[str, Any] = {}
        for unit in units:
            small_parts = self._tach_nho(unit.content)
            for part in small_parts:
                if not part:
                    continue
                candidate = f"{current_content}\n\n{part}".strip() if current_content else part
                if current_content and len(candidate) > self.max_chars:
                    if len(current_content) >= self.min_chars:
                        chunks.append(self._tao_chunk(sequence, current_content, current_metadata, source_id, source_type, version))
                        sequence += 1
                    overlap = self._lay_overlap(current_content)
                    available_overlap = max(0, self.max_chars - len(part) - 2)
                    if len(overlap) > available_overlap:
                        overlap = overlap[-available_overlap:].strip() if available_overlap > 0 else ""
                    current_content = f"{overlap}\n\n{part}".strip() if overlap else part
                    current_metadata = dict(unit.metadata)
                else:
                    current_content = candidate
                    if not current_metadata:
                        current_metadata = dict(unit.metadata)
        if current_content:
            chunks.append(self._tao_chunk(sequence, current_content, current_metadata, source_id, source_type, version))
        return [self._chunk_to_dict(chunk) for chunk in chunks]
    def _tao_chunk(self, sequence: int, content: str, metadata: dict[str, Any], source_id: str, source_type: str, version: int) -> ChunkNoiDung:
        chunk_metadata = dict(metadata)
        chunk_metadata["source_id"] = source_id
        chunk_metadata["source_type"] = source_type
        chunk_metadata["version"] = version
        return ChunkNoiDung(sequence=sequence, content=content, content_hash=self.tinh_hash(content), metadata=chunk_metadata)
    def _chunk_to_dict(self, chunk: ChunkNoiDung) -> dict[str, Any]:
        metadata = dict(chunk.metadata)
        return {"sequence": chunk.sequence, "content": chunk.content, "content_hash": chunk.content_hash, "metadata": metadata, "token_count": None, "source_id": metadata.get("source_id"), "entity_type": metadata.get("entity_type"), "entity_id": metadata.get("entity_id"), "version": metadata.get("version"), "access_scope": metadata.get("access_scope") or {}}
    @staticmethod
    def tinh_hash(content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()
    def kiem_tra(self, chunks: list[dict[str, Any]]) -> list[str]:
        errors: list[str] = []
        seen_hashes: set[str] = set()
        for index, chunk in enumerate(chunks, start=1):
            content = str(chunk.get("content") or "").strip()
            if not content:
                errors.append(f"chunk {index}: nội dung rỗng")
                continue
            if len(content) > self.max_chars:
                errors.append(f"chunk {index}: vượt giới hạn {self.max_chars} ký tự")
            chunk_hash = chunk.get("content_hash") or self.tinh_hash(content)
            if chunk_hash in seen_hashes:
                errors.append(f"chunk {index}: trùng nội dung")
            seen_hashes.add(chunk_hash)
            if not chunk.get("metadata", {}).get("source_id"):
                errors.append(f"chunk {index}: thiếu source_id")
            if chunk.get("metadata", {}).get("version") is None:
                errors.append(f"chunk {index}: thiếu version")
        return errors

chia_doan_service = ChiaDoanService()

def tao_chia_doan_service(max_chars: int = DEFAULT_MAX_CHARS, overlap_chars: int = DEFAULT_OVERLAP_CHARS, min_chars: int = DEFAULT_MIN_CHARS) -> ChiaDoanService:
    return ChiaDoanService(max_chars=max_chars, overlap_chars=overlap_chars, min_chars=min_chars)