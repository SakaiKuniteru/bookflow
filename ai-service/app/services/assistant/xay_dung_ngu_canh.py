# app/services/assistant/xay_dung_ngu_canh.py
# TẠO MỚI / THAY TOÀN BỘ

from __future__ import annotations

import inspect
import json
from dataclasses import dataclass, field
from typing import Any

from app.services.assistant.dang_ky_cong_cu import ToolDefinition, ToolRegistry, tool_registry


DEFAULT_RECENT_MESSAGES = 20
DEFAULT_MAX_CONTEXT_CHARS = 12000


@dataclass(slots=True)
class AssistantContextRequest:
    conversation_id: str | int | None
    user_id: str | int | None
    message: str
    assistant_type: str = "BOOK_ADVISOR"
    user_context: dict[str, Any] = field(default_factory=dict)
    retrieved_context: list[dict[str, Any]] = field(default_factory=list)
    recommendation_context: list[dict[str, Any]] = field(default_factory=list)
    business_context: dict[str, Any] = field(default_factory=dict)
    tool_context: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class HoiThoaiAdapter:
    def __init__(self, repository: Any | None = None) -> None:
        self.repository = repository or self._lay_repository()

    @staticmethod
    def _lay_repository() -> Any | None:
        try:
            import app.repositories.hoi_thoai as module
            for name in (
                "hoi_thoai_repository",
                "repository",
                "repo",
                "HoiThoaiRepository"
            ):
                value = getattr(module, name, None)
                if value is None:
                    continue
                if inspect.isclass(value):
                    try:
                        return value()
                    except Exception:
                        continue
                return value
        except Exception:
            return None
        return None

    async def lay_conversation(
        self,
        conversation_id: str | int,
        user_id: str | int | None = None
    ) -> Any:
        if self.repository is None:
            return None
        method = getattr(
            self.repository,
            "lay_theo_id",
            None
        )
        if method is None:
            return None
        return await self._goi(
            method,
            [
                ((conversation_id, user_id), {}),
                ((conversation_id,), {})
            ]
        )

    async def lay_messages(
        self,
        conversation_id: str | int,
        limit: int = DEFAULT_RECENT_MESSAGES
    ) -> list[dict[str, Any]]:
        if self.repository is None:
            return []
        method = getattr(
            self.repository,
            "lay_tin_nhan_gan_nhat",
            None
        )
        if method is None:
            method = getattr(
                self.repository,
                "lay_day_du",
                None
            )
        if method is None:
            return []
        result = await self._goi(
            method,
            [
                ((conversation_id, limit), {}),
                ((conversation_id,), {"limit": limit}),
                ((conversation_id,), {})
            ]
        )
        return self._extract_messages(result)

    @staticmethod
    def _extract_messages(result: Any) -> list[dict[str, Any]]:
        if isinstance(result, dict):
            value = (
                result.get("messages")
                or result.get("tin_nhan")
                or result.get("items")
                or result.get("data")
                or []
            )
        else:
            value = result
        if not isinstance(value, list):
            return []
        return [
            item
            for item in value
            if isinstance(item, dict)
        ]

    @staticmethod
    async def _goi(
        method: Any,
        variants: list[tuple[tuple[Any, ...], dict[str, Any]]]
    ) -> Any:
        last_error: Exception | None = None
        for args, kwargs in variants:
            try:
                result = method(*args, **kwargs)
                return (
                    await result
                    if inspect.isawaitable(result)
                    else result
                )
            except TypeError as error:
                last_error = error
        if last_error:
            raise last_error
        return None


class XayDungNguCanhService:
    def __init__(
        self,
        registry: ToolRegistry | None = None,
        conversation_repository: Any | None = None,
        max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS
    ) -> None:
        self.registry = registry or tool_registry
        self.conversation_repository = HoiThoaiAdapter(
            conversation_repository
        )
        self.max_context_chars = max(
            1000,
            int(max_context_chars)
        )

    async def xay_dung(
        self,
        request: AssistantContextRequest | dict[str, Any]
    ) -> dict[str, Any]:
        data = self._normalize_request(request)
        user_context = self._sanitize_user_context(
            data.user_context,
            data.user_id
        )
        conversation = None
        messages: list[dict[str, Any]] = []
        if data.conversation_id is not None:
            conversation = await self.conversation_repository.lay_conversation(
                data.conversation_id,
                data.user_id
            )
            messages = await self.conversation_repository.lay_messages(
                data.conversation_id,
                DEFAULT_RECENT_MESSAGES
            )
        allowed_tools = self.registry.list_available(
            user_context
        )
        context = {
            "user": user_context,
            "conversation": self._conversation_context(
                data,
                conversation,
                messages
            ),
            "request": {
                "message": data.message,
                "metadata": data.metadata
            },
            "business": self._sanitize_business_context(
                data.business_context
            ),
            "retrieval": self._sanitize_list(
                data.retrieved_context
            ),
            "recommendations": self._sanitize_list(
                data.recommendation_context
            ),
            "tool_context": self._sanitize_list(
                data.tool_context
            ),
            "permissions": {
                "permissions": user_context.get(
                    "permissions",
                    []
                ),
                "allowed_scope": (
                    user_context.get("allowed_scope")
                    or user_context.get("scope")
                ),
                "allowed_tools": [
                    tool.name
                    for tool in allowed_tools
                ]
            },
            "assistant_type": data.assistant_type,
            "tools": [
                tool.to_dict()
                for tool in allowed_tools
            ]
        }
        context["system_instruction"] = (
            self._tao_system_instruction(
                context,
                allowed_tools
            )
        )
        context["llm_messages"] = self._tao_llm_messages(
            context,
            messages
        )
        return self._truncate_context(context)

    def tao_context_tiep_theo(
        self,
        context: dict[str, Any],
        tool_results: list[dict[str, Any]]
    ) -> dict[str, Any]:
        updated = dict(context)
        current = list(
            updated.get("tool_context")
            or []
        )
        current.extend(
            self._sanitize_list(tool_results)
        )
        updated["tool_context"] = current[-10:]
        updated["llm_messages"] = self._tao_llm_messages(
            updated,
            updated.get(
                "conversation",
                {}
            ).get(
                "messages",
                []
            ),
            include_current=True
        )
        return self._truncate_context(updated)

    @staticmethod
    def _normalize_request(
        request: AssistantContextRequest | dict[str, Any]
    ) -> AssistantContextRequest:
        if isinstance(
            request,
            AssistantContextRequest
        ):
            return request
        return AssistantContextRequest(
            conversation_id=request.get("conversation_id"),
            user_id=request.get("user_id"),
            message=str(request.get("message") or "").strip(),
            assistant_type=str(request.get("assistant_type") or "BOOK_ADVISOR").strip().upper(),
            user_context=request.get("user_context") or {},
            retrieved_context=request.get("retrieved_context") or [],
            recommendation_context=request.get("recommendation_context") or [],
            business_context=request.get("business_context") or {},
            tool_context=request.get("tool_context") or [],
            metadata=request.get("metadata") or {}
        )

    @staticmethod
    def _sanitize_user_context(
        user_context: dict[str, Any],
        user_id: str | int | None
    ) -> dict[str, Any]:
        allowed = {
            "user_id",
            "user_type",
            "customer_id",
            "employee_id",
            "role",
            "roles",
            "permissions",
            "don_vi_id",
            "chi_nhanh_id",
            "kho_id",
            "scope",
            "allowed_scope",
            "session_id"
        }
        context = {
            key: user_context.get(key)
            for key in allowed
            if user_context.get(key) is not None
        }
        if user_id is not None:
            context["user_id"] = user_id
        context["permissions"] = sorted({
            str(item).strip()
            for item in context.get(
                "permissions",
                []
            )
            if str(item).strip()
        })
        return context

    @staticmethod
    def _sanitize_business_context(
        value: dict[str, Any]
    ) -> dict[str, Any]:
        if not isinstance(value, dict):
            return {}
        sensitive = {
            "password",
            "access_token",
            "refresh_token",
            "secret",
            "api_key",
            "authorization"
        }
        return {
            key: item
            for key, item in value.items()
            if str(key).lower() not in sensitive
        }

    @staticmethod
    def _sanitize_list(
        value: list[Any]
    ) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []
        result = []
        for item in value:
            if isinstance(item, dict):
                result.append(
                    XayDungNguCanhService._sanitize_business_context(
                        item
                    )
                )
        return result

    @staticmethod
    def _conversation_context(
        request: AssistantContextRequest,
        conversation: Any,
        messages: list[dict[str, Any]]
    ) -> dict[str, Any]:
        data = {
            "conversation_id": request.conversation_id,
            "messages": messages[
                -DEFAULT_RECENT_MESSAGES:
            ]
        }
        if isinstance(
            conversation,
            dict
        ):
            metadata = conversation.get(
                "metadata"
            ) or {}
            data["title"] = conversation.get(
                "title"
            )
            data["status"] = conversation.get(
                "status"
            )
            data["summary"] = (
                metadata.get("summary")
                if isinstance(
                    metadata,
                    dict
                )
                else None
            )
        return data

    @staticmethod
    def _tao_system_instruction(context: dict[str, Any], tools: list[ToolDefinition]) -> str:
        assistant_type = str(context.get("assistant_type") or "BOOK_ADVISOR").upper()
        if assistant_type == "INTERNAL_ASSISTANT":
            from app.prompts.tro_ly_noi_bo import get_system_prompt
        elif assistant_type == "REPORT_ASSISTANT":
            from app.prompts.tro_ly_bao_cao import get_system_prompt
        else:
            from app.prompts.tu_van_sach import get_system_prompt
        tool_names = [tool.name for tool in tools]
        return get_system_prompt() + "\n\nCác tool được hệ thống cho phép trong phiên này:\n" + json.dumps(tool_names, ensure_ascii=False)
    @staticmethod
    def _tao_llm_messages(context: dict[str, Any], history: list[dict[str, Any]], include_current: bool = False) -> list[dict[str, Any]]:
        assistant_type = str(context.get("assistant_type") or "BOOK_ADVISOR").upper()
        if assistant_type == "INTERNAL_ASSISTANT":
            from app.prompts.tro_ly_noi_bo import build_prompt_context, get_system_prompt
        elif assistant_type == "REPORT_ASSISTANT":
            from app.prompts.tro_ly_bao_cao import build_prompt_context, get_system_prompt
        else:
            from app.prompts.tu_van_sach import build_prompt_context, get_system_prompt
        prompt_context = dict(context)
        prompt_context.pop("system_instruction", None)
        prompt_context.pop("llm_messages", None)
        context_block = build_prompt_context(prompt_context)
        messages: list[dict[str, Any]] = [{"role": "system", "content": get_system_prompt()}]
        for item in history[-DEFAULT_RECENT_MESSAGES:]:
            role = str(item.get("role") or "").lower()
            if role not in {"user", "assistant", "tool"}:
                continue
            message: dict[str, Any] = {"role": role, "content": str(item.get("content") or "")}
            if item.get("tool_call_id"):
                message["tool_call_id"] = item["tool_call_id"]
            if item.get("name"):
                message["name"] = item["name"]
            if item.get("tool_calls"):
                message["tool_calls"] = item["tool_calls"]
            messages.append(message)
        current = str(context.get("request", {}).get("message") or "").strip()
        if current:
            messages.append({"role": "user", "content": f"{context_block}\n\n<bookflow_user_request>\n{current}\n</bookflow_user_request>"})
        return messages

    def _truncate_context(
        self,
        context: dict[str, Any]
    ) -> dict[str, Any]:
        encoded = json.dumps(
            context,
            ensure_ascii=False,
            default=str
        )
        if len(encoded) <= self.max_context_chars:
            return context
        result = dict(context)
        retrieval = list(
            result.get("retrieval")
            or []
        )
        recommendations = list(
            result.get("recommendations")
            or []
        )
        tool_context = list(
            result.get("tool_context")
            or []
        )
        while (
            len(
                json.dumps(
                    result,
                    ensure_ascii=False,
                    default=str
                )
            ) > self.max_context_chars
            and retrieval
        ):
            retrieval.pop()
            result["retrieval"] = retrieval
        while (
            len(
                json.dumps(
                    result,
                    ensure_ascii=False,
                    default=str
                )
            ) > self.max_context_chars
            and recommendations
        ):
            recommendations.pop()
            result["recommendations"] = recommendations
        while (
            len(
                json.dumps(
                    result,
                    ensure_ascii=False,
                    default=str
                )
            ) > self.max_context_chars
            and tool_context
        ):
            tool_context.pop(0)
            result["tool_context"] = tool_context
        if len(
            json.dumps(
                result,
                ensure_ascii=False,
                default=str
            )
        ) > self.max_context_chars:
            result["business"] = {}
        return result


xay_dung_ngu_canh_service = XayDungNguCanhService()


__all__ = [
    "AssistantContextRequest",
    "HoiThoaiAdapter",
    "XayDungNguCanhService",
    "xay_dung_ngu_canh_service"
]