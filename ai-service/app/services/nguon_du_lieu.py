from __future__ import annotations
from typing import Any
from app.core.exceptions import AIValidationException
from app.repositories.nguon_du_lieu import nguon_du_lieu_repository
async def tao(payload: dict[str, Any], request_context: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise AIValidationException("Nguồn dữ liệu phải là object.")
    access_scope = payload.get("access_scope") or {}
    if hasattr(access_scope, "model_dump"):
        access_scope = access_scope.model_dump(mode="json")
    return await nguon_du_lieu_repository.tao(
        source_type=str(payload.get("source_type") or "OTHER"),
        entity_type=str(payload.get("entity_type") or "OTHER"),
        entity_id=payload.get("entity_id"),
        file_id=payload.get("file_id"),
        title=str(payload.get("title") or "").strip(),
        version=int(payload.get("version") or 1),
        checksum=payload.get("checksum"),
        access_scope=access_scope,
        status="ACTIVE",
        metadata=payload.get("metadata") or {},
    )
async def lay(source_id: str, request_context: dict[str, Any]) -> dict[str, Any] | None:
    return await nguon_du_lieu_repository.lay_theo_id(source_id)