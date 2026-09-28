# app/services/assistant/tro_chuyen.py
# TẠO MỚI / THAY TOÀN BỘ

from __future__ import annotations

import asyncio
import inspect
import json
import logging
import os
import time
import uuid
from typing import Any

from app.core.config import get_settings
from app.core.exceptions import AIBackendException, AIProviderException, AIValidationException
from app.services.assistant.dang_ky_cong_cu import ToolCall, ToolRegistry, tool_registry
from app.services.assistant.kiem_tra_phan_hoi import KiemTraPhanHoiService, kiem_tra_phan_hoi_service
from app.services.assistant.xay_dung_ngu_canh import AssistantContextRequest, HoiThoaiAdapter, XayDungNguCanhService, xay_dung_ngu_canh_service


logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 5
MAX_REPAIR_ROUNDS = 1
MAX_TOOL_RESULT_CHARS = 8000
ASSISTANT_TIMEOUT_SECONDS = max(
    5,
    int(
        os.getenv(
            "AI_ASSISTANT_TIMEOUT",
            "30"
        )
    )
)


class HoiThoaiServiceAdapter(HoiThoaiAdapter):
    async def tao_conversation(
        self,
        user_id: str | int | None,
        session_id: str | None,
        metadata: dict[str, Any]
    ) -> Any:
        if self.repository is None:
            return None
        method = getattr(
            self.repository,
            "tao",
            None
        )
        if method is None:
            return None
        payload = {
            "user_id": user_id,
            "session_id": session_id,
            "status": "ACTIVE",
            "metadata": metadata
        }
        return await self._goi(
            method,
            [
                ((payload,), {}),
                ((user_id, payload), {}),
                ((), payload)
            ]
        )

    async def them_message(
        self,
        conversation_id: str | int,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None
    ) -> Any:
        if self.repository is None:
            return None
        method = getattr(
            self.repository,
            "them_tin_nhan",
            None
        )
        if method is None:
            return None
        payload = {
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "metadata": metadata or {}
        }
        return await self._goi(
            method,
            [
                ((conversation_id, payload), {}),
                ((payload,), {}),
                (
                    (
                        conversation_id,
                        role,
                        content,
                        metadata or {}
                    ),
                    {}
                )
            ]
        )


class LLMAdapter:
    def __init__(
        self,
        provider: Any | None = None
    ) -> None:
        self.provider = provider or self._lay_provider()

    @staticmethod
    def _lay_provider() -> Any | None:
        try:
            import app.providers.llm as module
            for name in (
                "llm_provider",
                "provider",
                "openai_llm_provider"
            ):
                value = getattr(
                    module,
                    name,
                    None
                )
                if value is not None:
                    return value
            for name in (
                "get_llm_provider",
                "tao_llm_provider",
                "get_provider"
            ):
                factory = getattr(
                    module,
                    name,
                    None
                )
                if callable(factory):
                    value = factory()
                    if value is not None:
                        return value
        except Exception:
            return None
        return None

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        temperature: float,
        max_tokens: int
    ) -> dict[str, Any]:
        if self.provider is None:
            raise AIProviderException(
                "LLM provider chưa được cấu hình."
            )
        method = (
            getattr(
                self.provider,
                "chat",
                None
            )
            or getattr(
                self.provider,
                "generate",
                None
            )
        )
        if method is None:
            raise AIProviderException(
                "LLM provider không hỗ trợ chat/generate."
            )
        provider_messages = self._tao_messages(
            messages
        )
        kwargs = {
            "messages": provider_messages,
            "tools": tools,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        try:
            result = method(
                **kwargs
            )
            result = (
                await result
                if inspect.isawaitable(result)
                else result
            )
        except TypeError:
            try:
                result = method(
                    provider_messages,
                    tools=tools,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                result = (
                    await result
                    if inspect.isawaitable(result)
                    else result
                )
            except TypeError:
                result = method(
                    provider_messages
                )
                result = (
                    await result
                    if inspect.isawaitable(result)
                    else result
                )
        return self._normalize_response(
            result
        )

    @staticmethod
    def _tao_messages(
        messages: list[dict[str, Any]]
    ) -> list[Any]:
        try:
            from app.providers.base import LLMMessage
            signature = inspect.signature(
                LLMMessage
            )
            result = []
            for message in messages:
                data = {
                    key: value
                    for key, value in message.items()
                    if key in signature.parameters
                }
                if (
                    "content" not in data
                    and "content" in signature.parameters
                ):
                    data["content"] = ""
                result.append(
                    LLMMessage(**data)
                )
            return result
        except Exception:
            return messages

    @staticmethod
    def _normalize_response(
        result: Any
    ) -> dict[str, Any]:
        if isinstance(
            result,
            dict
        ):
            data = (
                result.get("message")
                if isinstance(
                    result.get("message"),
                    dict
                )
                else result
            )
            return {
                "content": (
                    data.get("content")
                    or result.get("content")
                    or ""
                ),
                "tool_calls": (
                    data.get("tool_calls")
                    or result.get("tool_calls")
                    or []
                ),
                "model": (
                    data.get("model")
                    or result.get("model")
                ),
                "usage": (
                    data.get("usage")
                    or result.get("usage")
                    or {}
                ),
                "finish_reason": (
                    data.get("finish_reason")
                    or result.get("finish_reason")
                )
            }
        return {
            "content": (
                getattr(
                    result,
                    "content",
                    ""
                )
                or ""
            ),
            "tool_calls": (
                getattr(
                    result,
                    "tool_calls",
                    []
                )
                or []
            ),
            "model": getattr(
                result,
                "model",
                None
            ),
            "usage": (
                getattr(
                    result,
                    "usage",
                    {}
                )
                or {}
            ),
            "finish_reason": getattr(
                result,
                "finish_reason",
                None
            )
        }


class TroChuyenService:
    def __init__(
        self,
        llm_provider: Any | None = None,
        registry: ToolRegistry | None = None,
        context_builder: XayDungNguCanhService | None = None,
        response_validator: KiemTraPhanHoiService | None = None,
        conversation_repository: Any | None = None,
        max_tool_rounds: int = MAX_TOOL_ROUNDS,
        max_repair_rounds: int = MAX_REPAIR_ROUNDS,
        timeout_seconds: int = ASSISTANT_TIMEOUT_SECONDS
    ) -> None:
        self.llm = LLMAdapter(
            llm_provider
        )
        self.registry = (
            registry
            or tool_registry
        )
        self.context_builder = (
            context_builder
            or xay_dung_ngu_canh_service
        )
        self.validator = (
            response_validator
            or kiem_tra_phan_hoi_service
        )
        self.conversation_repository = HoiThoaiServiceAdapter(
            conversation_repository
        )
        self.max_tool_rounds = max(
            1,
            int(max_tool_rounds)
        )
        self.max_repair_rounds = max(
            0,
            int(max_repair_rounds)
        )
        self.timeout_seconds = max(
            5,
            int(timeout_seconds)
        )

    async def chat(
        self,
        request: dict[str, Any]
    ) -> dict[str, Any]:
        request_id = str(
            request.get(
                "request_id"
            )
            or uuid.uuid4()
        )
        started_at = time.monotonic()
        try:
            return await asyncio.wait_for(
                self._xu_ly(
                    request,
                    request_id,
                    started_at
                ),
                timeout=self.timeout_seconds
            )
        except asyncio.TimeoutError:
            logger.warning(
                "assistant_timeout request_id=%s",
                request_id
            )
            return await self._fallback(
                request,
                request_id,
                started_at,
                "Yêu cầu mất quá nhiều thời gian để xử lý. Vui lòng thử lại với yêu cầu ngắn gọn hơn."
            )
        except (
            AIProviderException,
            AIBackendException
        ) as error:
            logger.warning(
                "assistant_dependency_error request_id=%s error=%s",
                request_id,
                str(error)
            )
            return await self._fallback(
                request,
                request_id,
                started_at
            )
        except Exception as error:
            logger.exception(
                "assistant_error request_id=%s error=%s",
                request_id,
                str(error)
            )
            return await self._fallback(
                request,
                request_id,
                started_at
            )

    async def _xu_ly(
        self,
        request: dict[str, Any],
        request_id: str,
        started_at: float
    ) -> dict[str, Any]:
        message = str(
            request.get("message")
            or ""
        ).strip()
        if not message:
            raise AIValidationException(
                "Tin nhắn không được để trống."
            )
        user_context = dict(
            request.get(
                "user_context"
            )
            or {}
        )
        user_id = (
            request.get("user_id")
            or user_context.get("user_id")
        )
        conversation_id = request.get(
            "conversation_id"
        )
        if conversation_id is None:
            created = await self.conversation_repository.tao_conversation(
                user_id,
                request.get(
                    "session_id"
                ),
                {
                    "request_id": request_id,
                    "source": "assistant"
                }
            )
            conversation_id = self._extract_id(
                created,
                "conversation_id",
                "id"
            )
        context_request = AssistantContextRequest(
            conversation_id=conversation_id,
            user_id=user_id,
            message=message,
            user_context=user_context,
            retrieved_context=request.get(
                "retrieved_context"
            ) or [],
            recommendation_context=request.get(
                "recommendation_context"
            ) or [],
            business_context=request.get(
                "business_context"
            ) or {},
            metadata={
                "request_id": request_id
            }
        )
        context = await self.context_builder.xay_dung(
            context_request
        )
        await self.conversation_repository.them_message(
            conversation_id,
            "USER",
            message,
            {
                "request_id": request_id
            }
        )
        messages = list(
            context.get(
                "llm_messages"
            )
            or []
        )
        messages.append({
            "role": "user",
            "content": message
        })
        tools = [
            tool.to_llm_schema()
            for tool in self.registry.list_available(
                user_context
            )
        ]
        tool_usage: list[dict[str, Any]] = []
        last_model = None
        last_usage: dict[str, Any] = {}
        for round_number in range(
            1,
            self.max_tool_rounds + 1
        ):
            llm_result = await self.llm.chat(
                messages,
                tools,
                self._temperature(),
                self._max_tokens()
            )
            last_model = (
                llm_result.get("model")
                or last_model
            )
            last_usage = (
                llm_result.get("usage")
                or last_usage
            )
            raw_tool_calls = (
                llm_result.get("tool_calls")
                or []
            )
            if not raw_tool_calls:
                response = self._parse_final_response(
                    llm_result.get(
                        "content"
                    )
                    or ""
                )
                response["tool_usage"] = tool_usage
                response.setdefault(
                    "metadata",
                    {}
                )
                response["metadata"].update({
                    "request_id": request_id,
                    "model": last_model,
                    "usage": last_usage,
                    "tool_rounds": round_number
                })
                valid = await self._validate_and_repair(
                    response,
                    context,
                    messages,
                    tools,
                    request_id
                )
                valid["conversation_id"] = conversation_id
                message_result = await self.conversation_repository.them_message(
                    conversation_id,
                    "ASSISTANT",
                    valid.get(
                        "content",
                        ""
                    ),
                    {
                        "request_id": request_id,
                        "tool_usage": self._audit_tool_usage(
                            tool_usage
                        ),
                        "response_status": valid.get(
                            "metadata",
                            {}
                        ).get(
                            "response_status",
                            "VALID"
                        )
                    }
                )
                valid["message_id"] = self._extract_id(
                    message_result,
                    "message_id",
                    "id"
                )
                valid["metadata"]["latency_ms"] = int(
                    (
                        time.monotonic()
                        - started_at
                    )
                    * 1000
                )
                return valid
            assistant_message = {
                "role": "assistant",
                "content": (
                    llm_result.get("content")
                    or ""
                ),
                "tool_calls": self._normalize_tool_calls_for_message(
                    raw_tool_calls
                )
            }
            messages.append(
                assistant_message
            )
            round_results: list[dict[str, Any]] = []
            for raw_call in raw_tool_calls:
                call = self._parse_tool_call(
                    raw_call
                )
                if call is None:
                    round_results.append({
                        "name": None,
                        "status": "ERROR",
                        "error_code": "INVALID_TOOL_CALL",
                        "result": {
                            "status": "ERROR",
                            "message": "Tool call từ LLM không hợp lệ."
                        }
                    })
                    continue
                started_tool = time.monotonic()
                result = await self.registry.execute(
                    call.name,
                    call.arguments,
                    user_context,
                    request.get(
                        "confirmation"
                    ),
                    request_id
                )
                usage = {
                    "name": call.name,
                    "status": result.get(
                        "status"
                    ),
                    "arguments": self._sanitize_arguments(
                        call.arguments
                    ),
                    "result_summary": self._summarize_tool_result(
                        result
                    ),
                    "latency_ms": int(
                        (
                            time.monotonic()
                            - started_tool
                        )
                        * 1000
                    ),
                    "domain": self._tool_domain(
                        call.name
                    ),
                    "scope_prechecked": True
                }
                if (
                    result.get("status") == "SUCCESS"
                    and call.name in {
                        "tao_dat_truoc",
                        "tao_don_hang",
                        "tao_phieu_muon"
                    }
                ):
                    usage["action_completed"] = bool(
                        result.get(
                            "data",
                            {}
                        ).get(
                            "success"
                        )
                        or result.get(
                            "data",
                            {}
                        ).get(
                            "completed"
                        )
                    )
                tool_usage.append(
                    usage
                )
                round_results.append({
                    "tool_call_id": call.tool_call_id,
                    "name": call.name,
                    "status": result.get(
                        "status"
                    ),
                    "result": result
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.tool_call_id,
                    "name": call.name,
                    "content": self._serialize_tool_result(
                        result
                    )
                })
            context = self.context_builder.tao_context_tiep_theo(
                context,
                round_results
            )
        fallback = self.validator.tao_fallback(
            "Tôi chưa thể hoàn tất yêu cầu trong số lượt xử lý cho phép."
        )
        fallback.update({
            "conversation_id": conversation_id,
            "metadata": {
                "request_id": request_id,
                "response_status": "FALLBACK",
                "tool_rounds": self.max_tool_rounds,
                "latency_ms": int(
                    (
                        time.monotonic()
                        - started_at
                    )
                    * 1000
                )
            },
            "tool_usage": self._audit_tool_usage(
                tool_usage
            )
        })
        await self.conversation_repository.them_message(
            conversation_id,
            "ASSISTANT",
            fallback["content"],
            {
                "request_id": request_id,
                "response_status": "FALLBACK"
            }
        )
        return fallback

    async def _validate_and_repair(
        self,
        response: dict[str, Any],
        context: dict[str, Any],
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        request_id: str
    ) -> dict[str, Any]:
        validation_context = dict(
            context
        )
        validation_context["tool_usage"] = (
            response.get(
                "tool_usage"
            )
            or []
        )
        result = self.validator.kiem_tra(
            response,
            validation_context
        )
        if result.hop_le:
            response = result.normalized
            response.setdefault(
                "metadata",
                {}
            )["response_status"] = "VALID"
            return response
        repair_messages = list(
            messages
        )
        repair_messages.append({
            "role": "system",
            "content": self.validator.tao_prompt_sua(
                response,
                result
            )
        })
        for _ in range(
            self.max_repair_rounds
        ):
            llm_result = await self.llm.chat(
                repair_messages,
                tools,
                self._temperature(),
                self._max_tokens()
            )
            repaired = self._parse_final_response(
                llm_result.get(
                    "content"
                )
                or ""
            )
            repaired["tool_usage"] = (
                response.get(
                    "tool_usage"
                )
                or []
            )
            repaired.setdefault(
                "metadata",
                {}
            )["request_id"] = request_id
            validation_context["tool_usage"] = (
                repaired["tool_usage"]
            )
            checked = self.validator.kiem_tra(
                repaired,
                validation_context
            )
            if checked.hop_le:
                checked.normalized.setdefault(
                    "metadata",
                    {}
                )["response_status"] = "REPAIRED"
                return checked.normalized
        fallback = self.validator.tao_fallback()
        fallback["tool_usage"] = (
            response.get(
                "tool_usage"
            )
            or []
        )
        fallback["metadata"].update({
            "request_id": request_id,
            "response_status": "FALLBACK",
            "validation_errors": result.errors
        })
        return fallback

    async def _fallback(
        self,
        request: dict[str, Any],
        request_id: str,
        started_at: float,
        reason: str | None = None
    ) -> dict[str, Any]:
        response = self.validator.tao_fallback(
            reason
        )
        response["conversation_id"] = request.get(
            "conversation_id"
        )
        response["metadata"].update({
            "request_id": request_id,
            "latency_ms": int(
                (
                    time.monotonic()
                    - started_at
                )
                * 1000
            )
        })
        return response

    def _temperature(self) -> float:
        return float(
            getattr(
                get_settings(),
                "ai_temperature",
                0.2
            )
        )

    def _max_tokens(self) -> int:
        return int(
            getattr(
                get_settings(),
                "ai_max_response_tokens",
                2000
            )
        )

    @staticmethod
    def _extract_id(
        value: Any,
        *keys: str
    ) -> Any:
        if isinstance(
            value,
            dict
        ):
            for key in keys:
                if value.get(key) is not None:
                    return value[key]
            data = value.get(
                "data"
            )
            if isinstance(
                data,
                dict
            ):
                for key in keys:
                    if data.get(key) is not None:
                        return data[key]
        return (
            value
            if isinstance(
                value,
                (str, int)
            )
            else None
        )

    @staticmethod
    def _parse_final_response(
        content: str
    ) -> dict[str, Any]:
        text = str(
            content
            or ""
        ).strip()
        if (
            text.startswith("```")
            and text.endswith("```")
        ):
            text = text.strip("`").strip()
            if text.lower().startswith("json"):
                text = text[4:].strip()
        try:
            parsed = json.loads(
                text
            )
            if (
                isinstance(
                    parsed,
                    dict
                )
                and "content" in parsed
            ):
                parsed.setdefault(
                    "citations",
                    []
                )
                parsed.setdefault(
                    "recommendations",
                    []
                )
                parsed.setdefault(
                    "claims",
                    []
                )
                parsed.setdefault(
                    "metadata",
                    {}
                )
                return parsed
        except (
            TypeError,
            ValueError
        ):
            pass
        return {
            "content": text,
            "citations": [],
            "recommendations": [],
            "claims": [],
            "metadata": {}
        }

    @staticmethod
    def _parse_tool_call(
        raw: Any
    ) -> ToolCall | None:
        if isinstance(
            raw,
            dict
        ):
            function = (
                raw.get("function")
                if isinstance(
                    raw.get("function"),
                    dict
                )
                else raw
            )
            name = function.get(
                "name"
            )
            arguments = function.get(
                "arguments"
            )
            call_id = (
                raw.get("id")
                or raw.get("tool_call_id")
                or str(uuid.uuid4())
            )
        else:
            function = getattr(
                raw,
                "function",
                None
            )
            name = (
                getattr(
                    function,
                    "name",
                    None
                )
                if function is not None
                else getattr(
                    raw,
                    "name",
                    None
                )
            )
            arguments = (
                getattr(
                    function,
                    "arguments",
                    None
                )
                if function is not None
                else getattr(
                    raw,
                    "arguments",
                    None
                )
            )
            call_id = (
                getattr(
                    raw,
                    "id",
                    None
                )
                or str(uuid.uuid4())
            )
        if not name:
            return None
        if isinstance(
            arguments,
            str
        ):
            try:
                arguments = json.loads(
                    arguments
                )
            except (
                TypeError,
                ValueError
            ):
                return None
        if not isinstance(
            arguments,
            dict
        ):
            arguments = {}
        return ToolCall(
            str(call_id),
            str(name),
            arguments
        )

    @staticmethod
    def _normalize_tool_calls_for_message(
        tool_calls: list[Any]
    ) -> list[dict[str, Any]]:
        result = []
        for raw in tool_calls:
            call = TroChuyenService._parse_tool_call(
                raw
            )
            if call is None:
                continue
            result.append({
                "id": call.tool_call_id,
                "type": "function",
                "function": {
                    "name": call.name,
                    "arguments": json.dumps(
                        call.arguments,
                        ensure_ascii=False
                    )
                }
            })
        return result

    @staticmethod
    def _serialize_tool_result(
        result: dict[str, Any]
    ) -> str:
        text = json.dumps(
            result,
            ensure_ascii=False,
            default=str
        )
        return text[
            :MAX_TOOL_RESULT_CHARS
        ]

    @staticmethod
    def _summarize_tool_result(
        result: dict[str, Any]
    ) -> dict[str, Any]:
        if result.get(
            "status"
        ) != "SUCCESS":
            return {
                "status": result.get(
                    "status"
                ),
                "error_code": result.get(
                    "error_code"
                ),
                "message": result.get(
                    "message"
                )
            }
        data = result.get(
            "data"
        )
        if isinstance(
            data,
            dict
        ):
            return {
                "status": "SUCCESS",
                "keys": list(
                    data.keys()
                )[:30]
            }
        if isinstance(
            data,
            list
        ):
            return {
                "status": "SUCCESS",
                "count": len(data)
            }
        return {
            "status": "SUCCESS",
            "type": type(data).__name__
        }

    @staticmethod
    def _sanitize_arguments(
        arguments: dict[str, Any]
    ) -> dict[str, Any]:
        sensitive = {
            "password",
            "access_token",
            "refresh_token",
            "secret",
            "api_key",
            "authorization"
        }
        return {
            key: (
                "[REDACTED]"
                if str(key).lower() in sensitive
                else value
            )
            for key, value in arguments.items()
        }

    @staticmethod
    def _audit_tool_usage(
        tool_usage: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        return [
            {
                key: value
                for key, value in item.items()
                if key != "result"
            }
            for item in tool_usage
        ]

    @staticmethod
    def _tool_domain(
        name: str
    ) -> str:
        return {
            "tim_kiem_sach": "books",
            "lay_chi_tiet_sach": "book_detail",
            "lay_ton_kho": "inventory",
            "lay_chi_tiet_don_hang": "order",
            "lay_trang_thai_don_hang": "order_status",
            "lay_bao_cao": "report",
            "tim_kiem_khach_hang": "customer"
        }.get(
            name,
            "other"
        )


tro_chuyen_service = TroChuyenService()


__all__ = [
    "LLMAdapter",
    "HoiThoaiServiceAdapter",
    "TroChuyenService",
    "tro_chuyen_service"
]