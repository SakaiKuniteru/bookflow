# app/services/analytics/theo_doi_su_dung.py

from __future__ import annotations

import inspect
import math
import uuid
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from statistics import mean, median
from typing import Any, Protocol

from app.core.exceptions import AIValidationException


AI_USAGE_EVENT_TYPES = {
    "AI_SEARCH",
    "AI_RECOMMENDATION",
    "AI_CHAT",
    "AI_INTERNAL_ASSISTANT",
    "AI_OCR",
    "AI_EXTRACTION",
    "AI_DOCUMENT_INDEXING",
    "AI_REPORT_ANALYSIS",
    "AI_TOOL_CALL",
    "AI_FEEDBACK",
}

AI_USAGE_STATUSES = {
    "PENDING",
    "PROCESSING",
    "SUCCESS",
    "PARTIAL",
    "FAILED",
    "TIMEOUT",
    "CANCELLED",
}

AI_FEEDBACK_TYPES = {
    "LIKE",
    "DISLIKE",
    "RATING",
    "CORRECTION",
    "REPORT",
}

AI_ERROR_CODES = {
    "LLM_ERROR",
    "EMBEDDING_ERROR",
    "TIMEOUT",
    "TOOL_ERROR",
    "DATABASE_ERROR",
    "BACKEND_ERROR",
    "OCR_ERROR",
    "PARSING_ERROR",
    "VALIDATION_ERROR",
    "PERMISSION_ERROR",
    "RATE_LIMIT",
    "UNKNOWN_ERROR",
}

METADATA_KEYS_CAM = {
    "feature",
    "action",
    "operation",
    "file_id",
    "job_id",
    "resource_type",
    "resource_id",
    "page_count",
    "ocr_version",
    "extraction_version",
    "classification_version",
    "analysis_version",
    "embedding_version",
    "algorithm_version",
    "source_type",
    "error_stage",
    "retry_count",
}

METADATA_KEYS_NHAY_CAM = {
    "prompt",
    "input",
    "output",
    "response",
    "content",
    "text",
    "message",
    "email",
    "phone",
    "address",
    "customer_data",
    "tool_payload",
    "request_body",
    "response_body",
    "access_token",
    "authorization",
}


class UsageEventRepository(Protocol):
    async def ghi_su_kien(self, event: dict[str, Any]) -> Any:
        ...

    async def cap_nhat_su_kien(self, event_id: str, data: dict[str, Any]) -> Any:
        ...

    async def lay_su_kien(self, **filters: Any) -> list[dict[str, Any]]:
        ...


@dataclass
class UsageEvent:
    event_id: str
    request_id: str | None
    user_id: str | None
    session_id: str | None
    conversation_id: str | None
    event_type: str
    feature: str | None
    model: str | None
    model_version: str | None
    provider: str | None
    status: str
    started_at: str | None
    completed_at: str | None
    latency_ms: float | None
    input_tokens: int | None
    output_tokens: int | None
    total_tokens: int | None
    estimated_cost: float | None
    currency: str | None
    tool_count: int
    tool_names: list[str]
    tool_success_count: int
    tool_failure_count: int
    source_count: int | None
    result_count: int | None
    feedback_type: str | None
    rating: float | None
    error_code: str | None
    error_message: str | None
    error_stage: str | None
    retry_count: int
    resource_id: str | None
    page_count: int | None
    scope: dict[str, Any]
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class TheoDoiSuDungService:
    def __init__(self, repository: UsageEventRepository | None = None, max_events_memory: int = 5000):
        self.repository = repository
        self.max_events_memory = max_events_memory
        self._events: dict[str, UsageEvent] = {}

    async def ghi_su_kien(self, event: UsageEvent | dict[str, Any]) -> dict[str, Any]:
        normalized = self.chuan_hoa_su_kien(event)
        existing = self._events.get(normalized.event_id)
        self._events[normalized.event_id] = normalized
        await self._luu_repository(normalized)
        if existing is None and len(self._events) > self.max_events_memory:
            oldest_event_id = next(iter(self._events))
            if oldest_event_id != normalized.event_id:
                self._events.pop(oldest_event_id, None)
        return normalized.to_dict()

    async def bat_dau(self, event: dict[str, Any]) -> dict[str, Any]:
        data = dict(event)
        data.setdefault("event_id", str(uuid.uuid4()))
        data["status"] = data.get("status") or "PROCESSING"
        data["started_at"] = data.get("started_at") or self._thoi_gian_hien_tai()
        return await self.ghi_su_kien(data)

    async def hoan_tat(self, event_id: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
        event = await self._lay_event(event_id)
        if event is None:
            raise AIValidationException(f"Không tìm thấy usage event: {event_id}")
        update = dict(data or {})
        update["status"] = update.get("status") or "SUCCESS"
        update["completed_at"] = update.get("completed_at") or self._thoi_gian_hien_tai()
        update["latency_ms"] = update.get("latency_ms") or self._tinh_latency(event.started_at, update["completed_at"])
        return await self._cap_nhat_event(event, update)

    async def that_bai(self, event_id: str, error_code: str, error_message: str | None = None, data: dict[str, Any] | None = None) -> dict[str, Any]:
        event = await self._lay_event(event_id)
        if event is None:
            raise AIValidationException(f"Không tìm thấy usage event: {event_id}")
        update = dict(data or {})
        update["status"] = update.get("status") or "FAILED"
        update["error_code"] = error_code
        update["error_message"] = error_message
        update["completed_at"] = update.get("completed_at") or self._thoi_gian_hien_tai()
        update["latency_ms"] = update.get("latency_ms") or self._tinh_latency(event.started_at, update["completed_at"])
        return await self._cap_nhat_event(event, update)

    async def tong_hop(
        self,
        events: list[UsageEvent | dict[str, Any]] | None = None,
        tu_ngay: str | datetime | None = None,
        den_ngay: str | datetime | None = None,
        scope: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        source_events = await self._lay_danh_sach_event(events)
        normalized_events = [self.chuan_hoa_su_kien(event) for event in source_events]
        filtered_events = [event for event in normalized_events if self._event_hop_le(event, tu_ngay, den_ngay, scope)]
        return self._tao_usage_metrics(filtered_events, scope)

    def chuan_hoa_su_kien(self, event: UsageEvent | dict[str, Any]) -> UsageEvent:
        data = event.to_dict() if isinstance(event, UsageEvent) else dict(event)
        event_id = str(data.get("event_id") or uuid.uuid4())
        event_type = str(data.get("event_type") or "").strip().upper()
        if event_type not in AI_USAGE_EVENT_TYPES:
            raise AIValidationException(f"Loại usage event không hợp lệ: {event_type}")
        status = str(data.get("status") or "SUCCESS").strip().upper()
        if status not in AI_USAGE_STATUSES:
            raise AIValidationException(f"Trạng thái usage event không hợp lệ: {status}")
        feedback_type = data.get("feedback_type")
        if feedback_type:
            feedback_type = str(feedback_type).strip().upper()
            if feedback_type not in AI_FEEDBACK_TYPES:
                raise AIValidationException(f"Loại feedback không hợp lệ: {feedback_type}")
        error_code = data.get("error_code")
        if error_code:
            error_code = str(error_code).strip().upper()
        tool_names = self._chuan_hoa_danh_sach(data.get("tool_names"))
        tool_count = self._so_nguyen(data.get("tool_count"), 0)
        if tool_count == 0 and tool_names:
            tool_count = len(tool_names)
        metadata = self._loc_metadata(data.get("metadata"))
        return UsageEvent(
            event_id=event_id,
            request_id=self._chuoi(data.get("request_id")),
            user_id=self._chuoi(data.get("user_id")),
            session_id=self._chuoi(data.get("session_id")),
            conversation_id=self._chuoi(data.get("conversation_id")),
            event_type=event_type,
            feature=self._chuoi(data.get("feature")),
            model=self._chuoi(data.get("model")),
            model_version=self._chuoi(data.get("model_version")),
            provider=self._chuoi(data.get("provider")),
            status=status,
            started_at=self._chuoi(data.get("started_at")),
            completed_at=self._chuoi(data.get("completed_at")),
            latency_ms=self._so_thuc(data.get("latency_ms")),
            input_tokens=self._so_nguyen_nullable(data.get("input_tokens")),
            output_tokens=self._so_nguyen_nullable(data.get("output_tokens")),
            total_tokens=self._so_nguyen_nullable(data.get("total_tokens")),
            estimated_cost=self._so_thuc(data.get("estimated_cost")),
            currency=self._chuoi(data.get("currency")),
            tool_count=tool_count,
            tool_names=tool_names,
            tool_success_count=self._so_nguyen(data.get("tool_success_count"), 0),
            tool_failure_count=self._so_nguyen(data.get("tool_failure_count"), 0),
            source_count=self._so_nguyen_nullable(data.get("source_count")),
            result_count=self._so_nguyen_nullable(data.get("result_count")),
            feedback_type=feedback_type,
            rating=self._so_thuc(data.get("rating")),
            error_code=error_code,
            error_message=self._chuoi(data.get("error_message")),
            error_stage=self._chuoi(data.get("error_stage")),
            retry_count=self._so_nguyen(data.get("retry_count"), 0),
            resource_id=self._chuoi(data.get("resource_id")),
            page_count=self._so_nguyen_nullable(data.get("page_count")),
            scope=dict(data.get("scope") or {}),
            metadata=metadata,
            created_at=self._chuoi(data.get("created_at")) or self._thoi_gian_hien_tai(),
        )

    def _tao_usage_metrics(self, events: list[UsageEvent], scope: dict[str, Any] | None) -> dict[str, Any]:
        total = len(events)
        status_counts = Counter(event.status for event in events)
        feature_counts = Counter(event.feature or event.event_type for event in events)
        model_counts = Counter(event.model or "UNKNOWN" for event in events)
        provider_counts = Counter(event.provider or "UNKNOWN" for event in events)
        error_counts = Counter(event.error_code or "UNKNOWN" for event in events if event.status in {"FAILED", "TIMEOUT"})
        tool_counts = Counter(tool for event in events for tool in event.tool_names)
        requests_by_day = Counter(self._lay_ngay(event.started_at or event.created_at) for event in events)
        latencies = [event.latency_ms for event in events if event.latency_ms is not None and event.latency_ms >= 0]
        ratings = [event.rating for event in events if event.rating is not None and 1 <= event.rating <= 5]
        input_tokens = sum(event.input_tokens or 0 for event in events)
        output_tokens = sum(event.output_tokens or 0 for event in events)
        total_tokens = sum(event.total_tokens if event.total_tokens is not None else (event.input_tokens or 0) + (event.output_tokens or 0) for event in events)
        estimated_costs = [event.estimated_cost for event in events if event.estimated_cost is not None and event.estimated_cost >= 0]
        feedback_events = [event for event in events if event.feedback_type]
        positive_feedback = sum(1 for event in feedback_events if self._feedback_tich_cuc(event))
        negative_feedback = sum(1 for event in feedback_events if self._feedback_tieu_cuc(event))
        tool_events = [event for event in events if event.event_type == "AI_TOOL_CALL" or event.tool_count > 0]
        tool_success = sum(event.tool_success_count for event in tool_events)
        tool_failure = sum(event.tool_failure_count for event in tool_events)
        if tool_success == 0 and tool_failure == 0 and tool_events:
            tool_success = sum(1 for event in tool_events if event.status == "SUCCESS")
            tool_failure = sum(1 for event in tool_events if event.status in {"FAILED", "TIMEOUT"})
        return {
            "metric_type": "AI_USAGE",
            "period": self._xac_dinh_period(events),
            "scope": dict(scope or {}),
            "total_requests": total,
            "unique_users": len({event.user_id for event in events if event.user_id}),
            "active_conversations": len({event.conversation_id for event in events if event.conversation_id}),
            "requests_by_feature": dict(feature_counts),
            "requests_by_event_type": dict(Counter(event.event_type for event in events)),
            "requests_by_day": dict(sorted(requests_by_day.items())),
            "requests_by_model": dict(model_counts),
            "requests_by_provider": dict(provider_counts),
            "status": {
                "pending": status_counts.get("PENDING", 0),
                "processing": status_counts.get("PROCESSING", 0),
                "success": status_counts.get("SUCCESS", 0),
                "partial": status_counts.get("PARTIAL", 0),
                "failed": status_counts.get("FAILED", 0),
                "timeout": status_counts.get("TIMEOUT", 0),
                "cancelled": status_counts.get("CANCELLED", 0),
            },
            "reliability": {
                "success_rate": self._ty_le(status_counts.get("SUCCESS", 0), total),
                "failure_rate": self._ty_le(status_counts.get("FAILED", 0), total),
                "timeout_rate": self._ty_le(status_counts.get("TIMEOUT", 0), total),
                "partial_rate": self._ty_le(status_counts.get("PARTIAL", 0), total),
                "cancelled_rate": self._ty_le(status_counts.get("CANCELLED", 0), total),
            },
            "performance": {
                "average_latency_ms": self._lam_tron(latencies),
                "median_latency_ms": self._lam_tron(latencies, median),
                "p95_latency_ms": self._phan_vi(latencies, 0.95),
                "p99_latency_ms": self._phan_vi(latencies, 0.99),
                "sample_count": len(latencies),
            },
            "tokens": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens,
            },
            "cost": {
                "estimated_cost": round(sum(estimated_costs), 8) if estimated_costs else None,
                "currency": self._lay_currency(events),
                "sample_count": len(estimated_costs),
            },
            "tools": {
                "total_calls": sum(event.tool_count for event in events),
                "success_count": tool_success,
                "failure_count": tool_failure,
                "success_rate": self._ty_le(tool_success, tool_success + tool_failure),
                "most_used": [{"tool": name, "count": count} for name, count in tool_counts.most_common(20)],
            },
            "feedback": {
                "count": len(feedback_events),
                "positive_count": positive_feedback,
                "negative_count": negative_feedback,
                "positive_rate": self._ty_le(positive_feedback, len(feedback_events)),
                "negative_rate": self._ty_le(negative_feedback, len(feedback_events)),
                "average_rating": round(mean(ratings), 4) if ratings else None,
                "rating_count": len(ratings),
            },
            "errors": {
                "count": sum(error_counts.values()),
                "by_code": dict(error_counts),
            },
            "retrieval": {
                "average_source_count": self._lam_tron([event.source_count for event in events if event.source_count is not None]),
                "average_result_count": self._lam_tron([event.result_count for event in events if event.result_count is not None]),
            },
            "metadata": {
                "analysis_version": "usage-analytics-v1",
            },
        }

    async def _luu_repository(self, event: UsageEvent) -> None:
        if self.repository is None:
            return
        existing = await self._goi_repository("cap_nhat_su_kien", event.event_id, event.to_dict(), required=False)
        if existing is not None:
            return
        await self._goi_repository("ghi_su_kien", event.to_dict(), required=False)

    async def _cap_nhat_event(self, event: UsageEvent, update: dict[str, Any]) -> dict[str, Any]:
        data = event.to_dict()
        data.update(update)
        normalized = self.chuan_hoa_su_kien(data)
        self._events[normalized.event_id] = normalized
        if self.repository is not None:
            await self._goi_repository("cap_nhat_su_kien", normalized.event_id, normalized.to_dict(), required=False)
        return normalized.to_dict()

    async def _lay_event(self, event_id: str) -> UsageEvent | None:
        event = self._events.get(event_id)
        if event is not None:
            return event
        if self.repository is None:
            return None
        result = await self._goi_repository("lay_theo_id", event_id, required=False)
        if result is None:
            return None
        return self.chuan_hoa_su_kien(result)

    async def _lay_danh_sach_event(self, events: list[UsageEvent | dict[str, Any]] | None) -> list[UsageEvent | dict[str, Any]]:
        if events is not None:
            return events
        if self.repository is not None:
            result = await self._goi_repository("lay_su_kien", required=False)
            if result is not None:
                return result
        return list(self._events.values())

    async def _goi_repository(self, method_name: str, *args: Any, required: bool = False, **kwargs: Any) -> Any:
        method = getattr(self.repository, method_name, None) if self.repository else None
        if method is None:
            if required:
                raise AIValidationException(f"Repository không hỗ trợ method: {method_name}")
            return None
        result = method(*args, **kwargs)
        if inspect.isawaitable(result):
            result = await result
        return result

    def _event_hop_le(
        self,
        event: UsageEvent,
        tu_ngay: str | datetime | None,
        den_ngay: str | datetime | None,
        scope: dict[str, Any] | None,
    ) -> bool:
        event_time = self._parse_datetime(event.started_at or event.created_at)
        start_time = self._parse_datetime(tu_ngay)
        end_time = self._parse_datetime(den_ngay)
        if start_time and event_time and event_time < start_time:
            return False
        if end_time and event_time and event_time > end_time:
            return False
        if scope and not self._scope_match(event.scope, scope):
            return False
        return True

    def _scope_match(self, event_scope: dict[str, Any], requested_scope: dict[str, Any]) -> bool:
        for key, value in requested_scope.items():
            if value is None:
                continue
            if event_scope.get(key) != value:
                return False
        return True

    async def _goi_repository_many(self, method_names: tuple[str, ...], *args: Any, **kwargs: Any) -> Any:
        for method_name in method_names:
            result = await self._goi_repository(method_name, *args, **kwargs)
            if result is not None:
                return result
        return None

    def _loc_metadata(self, metadata: Any) -> dict[str, Any]:
        if not isinstance(metadata, dict):
            return {}
        result: dict[str, Any] = {}
        for key, value in metadata.items():
            normalized_key = str(key).strip().lower()
            if normalized_key in METADATA_KEYS_NHAY_CAM:
                continue
            if normalized_key not in METADATA_KEYS_CAM:
                continue
            if isinstance(value, (str, int, float, bool)) or value is None:
                result[normalized_key] = value
        return result

    def _feedback_tich_cuc(self, event: UsageEvent) -> bool:
        if event.feedback_type == "LIKE":
            return True
        if event.feedback_type == "RATING" and event.rating is not None:
            return event.rating >= 4
        return False

    def _feedback_tieu_cuc(self, event: UsageEvent) -> bool:
        if event.feedback_type in {"DISLIKE", "CORRECTION", "REPORT"}:
            return True
        if event.feedback_type == "RATING" and event.rating is not None:
            return event.rating <= 2
        return False

    def _lay_currency(self, events: list[UsageEvent]) -> str | None:
        currencies = Counter(event.currency for event in events if event.currency)
        return currencies.most_common(1)[0][0] if currencies else None

    def _xac_dinh_period(self, events: list[UsageEvent]) -> dict[str, Any]:
        dates = sorted(self._lay_ngay(event.started_at or event.created_at) for event in events if event.started_at or event.created_at)
        if not dates:
            return {"from": None, "to": None}
        return {"from": dates[0], "to": dates[-1]}

    def _lay_ngay(self, value: str | None) -> str:
        if not value:
            return "UNKNOWN"
        parsed = self._parse_datetime(value)
        return parsed.date().isoformat() if parsed else str(value)[:10]

    def _tinh_latency(self, started_at: str | None, completed_at: str | None) -> float | None:
        start = self._parse_datetime(started_at)
        end = self._parse_datetime(completed_at)
        if not start or not end:
            return None
        return max(0.0, (end - start).total_seconds() * 1000)

    def _parse_datetime(self, value: str | datetime | None) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        try:
            normalized = str(value).strip().replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            return None

    def _thoi_gian_hien_tai(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _chuoi(self, value: Any) -> str | None:
        if value is None:
            return None
        value = str(value).strip()
        return value or None

    def _so_thuc(self, value: Any) -> float | None:
        if value is None or isinstance(value, bool):
            return None
        try:
            parsed = float(value)
            return parsed if math.isfinite(parsed) else None
        except (TypeError, ValueError):
            return None

    def _so_nguyen(self, value: Any, default: int) -> int:
        parsed = self._so_nguyen_nullable(value)
        return parsed if parsed is not None else default

    def _so_nguyen_nullable(self, value: Any) -> int | None:
        if value is None or isinstance(value, bool):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _chuan_hoa_danh_sach(self, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        if not isinstance(value, (list, tuple, set)):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    def _ty_le(self, numerator: int | float, denominator: int | float) -> float:
        if denominator <= 0:
            return 0.0
        return round(numerator / denominator, 6)

    def _lam_tron(self, values: list[float], calculator=mean) -> float | None:
        if not values:
            return None
        return round(float(calculator(values)), 4)

    def _phan_vi(self, values: list[float], percentile: float) -> float | None:
        if not values:
            return None
        ordered = sorted(values)
        if len(ordered) == 1:
            return round(float(ordered[0]), 4)
        position = (len(ordered) - 1) * percentile
        lower = int(position)
        upper = min(lower + 1, len(ordered) - 1)
        fraction = position - lower
        result = ordered[lower] + (ordered[upper] - ordered[lower]) * fraction
        return round(float(result), 4)


_theo_doi_su_dung_service: TheoDoiSuDungService | None = None


def get_theo_doi_su_dung_service(repository: UsageEventRepository | None = None) -> TheoDoiSuDungService:
    global _theo_doi_su_dung_service
    if _theo_doi_su_dung_service is None:
        _theo_doi_su_dung_service = TheoDoiSuDungService(repository=repository)
    elif repository is not None and _theo_doi_su_dung_service.repository is None:
        _theo_doi_su_dung_service.repository = repository
    return _theo_doi_su_dung_service