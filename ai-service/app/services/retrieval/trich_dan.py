from dataclasses import dataclass
from typing import Any
import logging

from app.repositories.nguon_du_lieu import nguon_du_lieu_repository

logger = logging.getLogger("bookflow-ai.retrieval.citation")


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


@dataclass(slots=True)
class Citation:
    citation_id: str
    source_id: Any
    chunk_id: Any = None
    entity_id: Any = None
    source_type: str | None = None
    title: str | None = None
    author: str | None = None
    file_name: str | None = None
    page: Any = None
    chapter: str | None = None
    section: str | None = None
    url: str | None = None
    excerpt: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "citation_id": self.citation_id,
            "source_id": self.source_id,
            "chunk_id": self.chunk_id,
            "entity_id": self.entity_id,
            "source_type": self.source_type,
            "title": self.title,
            "author": self.author,
            "file_name": self.file_name,
            "page": self.page,
            "chapter": self.chapter,
            "section": self.section,
            "url": self.url,
            "excerpt": self.excerpt
        }


class TrichDanService:
    def __init__(self, source_repository=None, max_excerpt_chars: int = 800):
        self.source_repository = source_repository or nguon_du_lieu_repository
        self.max_excerpt_chars = max(100, max_excerpt_chars)

    async def tao_citations(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not results:
            return []
        source_ids = []
        for result in results:
            source_id = result.get("source_id")
            if source_id is not None and source_id not in source_ids:
                source_ids.append(source_id)
        source_map = await self._lay_sources(source_ids)
        ket_qua = []
        for result in results:
            source_id = result.get("source_id")
            source = source_map.get(str(source_id)) if source_id is not None else None
            citation = self._tao_citation(result, source)
            item = dict(result)
            item["citation"] = citation.to_dict() if citation else None
            ket_qua.append(item)
        return ket_qua

    async def tao_context_sources(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        cited_results = await self.tao_citations(results)
        sources = []
        da_co = set()
        for result in cited_results:
            citation = result.get("citation")
            if not citation:
                continue
            citation_id = citation.get("citation_id")
            if citation_id in da_co:
                continue
            da_co.add(citation_id)
            sources.append({
                "citation_id": citation_id,
                "source_id": citation.get("source_id"),
                "chunk_id": citation.get("chunk_id"),
                "entity_id": citation.get("entity_id"),
                "title": citation.get("title"),
                "source_type": citation.get("source_type"),
                "page": citation.get("page"),
                "chapter": citation.get("chapter"),
                "section": citation.get("section"),
                "excerpt": citation.get("excerpt"),
                "url": citation.get("url")
            })
        return sources

    async def _lay_sources(self, source_ids: list[Any]) -> dict[str, dict[str, Any]]:
        if not source_ids:
            return {}
        try:
            raw_sources = await self.source_repository.tim_theo_ids(source_ids)
        except Exception as error:
            logger.warning("Không lấy được metadata nguồn citation: %s", error)
            return {}
        sources = _lay_danh_sach(raw_sources)
        return {str(item.get("id", item.get("source_id", item.get("nguon_id")))): item for item in sources if item.get("id", item.get("source_id", item.get("nguon_id"))) is not None}

    def _tao_citation(self, result: dict[str, Any], source: dict[str, Any] | None) -> Citation | None:
        source_id = result.get("source_id")
        chunk_id = result.get("chunk_id")
        entity_id = result.get("entity_id")
        if source_id is None:
            return None
        source = source or {}
        metadata = dict(source.get("metadata") or {})
        metadata.update(result.get("metadata") or {})
        source_type = source.get("source_type", source.get("loai_nguon", metadata.get("source_type")))
        title = source.get("title", source.get("ten", metadata.get("title")))
        author = source.get("author", source.get("tac_gia", metadata.get("author")))
        file_name = source.get("file_name", source.get("ten_file", metadata.get("file_name")))
        page = result.get("page", result.get("so_trang", metadata.get("page", metadata.get("so_trang"))))
        chapter = result.get("chapter", result.get("chuong", metadata.get("chapter", metadata.get("chuong"))))
        section = result.get("section", result.get("muc", metadata.get("section", metadata.get("muc"))))
        url = source.get("url", source.get("link", metadata.get("url")))
        excerpt = self._tao_excerpt(result.get("content", result.get("noi_dung", "")))
        citation_id = self._tao_citation_id(source_id, chunk_id)
        return Citation(
            citation_id=citation_id,
            source_id=source_id,
            chunk_id=chunk_id,
            entity_id=entity_id,
            source_type=source_type,
            title=title,
            author=author,
            file_name=file_name,
            page=page,
            chapter=chapter,
            section=section,
            url=url,
            excerpt=excerpt
        )

    def _tao_citation_id(self, source_id: Any, chunk_id: Any) -> str:
        if chunk_id is not None:
            return f"source:{source_id}:chunk:{chunk_id}"
        return f"source:{source_id}"

    def _tao_excerpt(self, content: Any) -> str | None:
        if content is None:
            return None
        text = " ".join(str(content).split())
        if not text:
            return None
        if len(text) <= self.max_excerpt_chars:
            return text
        return text[:self.max_excerpt_chars].rstrip() + "..."


trich_dan_service = TrichDanService()