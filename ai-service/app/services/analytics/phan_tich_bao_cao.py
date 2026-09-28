# app/services/analytics/phan_tich_bao_cao.py

from __future__ import annotations

import inspect
import json
import math
import re
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import mean
from typing import Any, Protocol

from app.core.exceptions import AIValidationException


ANALYSIS_VERSION = "report-analytics-v1"
PROMPT_VERSION = "report-analysis-prompt-v1"

INSIGHT_TYPES = {
    "TREND",
    "COMPARISON",
    "ANOMALY",
    "DISTRIBUTION",
    "CONCENTRATION",
    "GROWTH",
    "DECLINE",
    "CHANGE",
    "CORRELATION",
    "DATA_QUALITY",
}

DATA_QUALITY_STATUS = {
    "DATA_COMPLETE",
    "DATA_PARTIAL",
    "DATA_MISSING",
    "DATA_CONFLICT",
    "DATA_INVALID",
}

TREND_TYPES = {
    "INCREASING",
    "DECREASING",
    "STABLE",
    "VOLATILE",
    "INSUFFICIENT_DATA",
}


class LLMProviderProtocol(Protocol):
    async def generate(self, messages: Any) -> Any:
        ...


@dataclass
class ReportAnalysisInput:
    report_id: str
    report_type: str
    report_version: str | int
    period: Any
    scope: dict[str, Any]
    generated_at: str | None
    generated_by: str | None
    metrics: Any
    dimensions: Any
    comparisons: Any
    filters: dict[str, Any]
    metadata: dict[str, Any]
    time_series: Any = None
    data_quality: dict[str, Any] = field(default_factory=dict)
    previous_metrics: Any = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ReportAnalysisInput":
        return cls(
            report_id=str(data.get("report_id") or ""),
            report_type=str(data.get("report_type") or "").strip().upper(),
            report_version=data.get("report_version"),
            period=data.get("period"),
            scope=dict(data.get("scope") or {}),
            generated_at=data.get("generated_at"),
            generated_by=data.get("generated_by"),
            metrics=data.get("metrics") or {},
            dimensions=data.get("dimensions") or [],
            comparisons=data.get("comparisons") or {},
            filters=dict(data.get("filters") or {}),
            metadata=dict(data.get("metadata") or {}),
            time_series=data.get("time_series") or data.get("series"),
            data_quality=dict(data.get("data_quality") or {}),
            previous_metrics=data.get("previous_metrics"),
        )


class PhanTichBaoCaoService:
    def __init__(
        self,
        llm_provider: LLMProviderProtocol | None = None,
        trend_threshold: float = 0.05,
        anomaly_zscore_threshold: float = 2.5,
        concentration_threshold: float = 0.5,
        correlation_threshold: float = 0.7,
        min_series_points: int = 3,
    ):
        self.llm_provider = llm_provider
        self.trend_threshold = trend_threshold
        self.anomaly_zscore_threshold = anomaly_zscore_threshold
        self.concentration_threshold = concentration_threshold
        self.correlation_threshold = correlation_threshold
        self.min_series_points = min_series_points
        self.analysis_version = ANALYSIS_VERSION

    async def phan_tich(self, report: ReportAnalysisInput | dict[str, Any], dung_llm: bool = True) -> dict[str, Any]:
        normalized = self.chuan_hoa_report(report)
        self.kiem_tra_input(normalized)
        metrics = self._chuan_hoa_metrics(normalized.metrics)
        dimensions = self._chuan_hoa_dimensions(normalized.dimensions)
        comparisons = self._phan_tich_comparisons(normalized, metrics)
        trends = self._phan_tich_trends(normalized.time_series)
        anomalies = self._phan_tich_anomalies(normalized.time_series)
        distributions = self._phan_tich_phan_bo(dimensions)
        correlations = self._phan_tich_tuong_quan(normalized.time_series)
        data_quality = self._kiem_tra_chat_luong_du_lieu(normalized, metrics)
        findings = self._tao_findings(comparisons, trends, anomalies, distributions, correlations, data_quality)
        confidence = self._tinh_confidence(data_quality, findings, metrics, normalized.time_series)
        summary = self._tao_summary(normalized, comparisons, trends, anomalies, distributions, data_quality)
        result = {
            "analysis_id": str(uuid.uuid4()),
            "report_id": normalized.report_id,
            "report_type": normalized.report_type,
            "report_version": normalized.report_version,
            "period": normalized.period,
            "scope": dict(normalized.scope),
            "summary": summary,
            "explanation": None,
            "metrics": metrics,
            "comparisons": comparisons,
            "trends": trends,
            "anomalies": anomalies,
            "distributions": distributions,
            "correlations": correlations,
            "insights": findings,
            "warnings": self._tao_warnings(data_quality, comparisons, trends, normalized),
            "data_quality": data_quality,
            "confidence": confidence,
            "model": self._lay_llm_model(),
            "model_version": self._lay_llm_model_version(),
            "analysis_version": self.analysis_version,
            "prompt_version": PROMPT_VERSION if self.llm_provider and dung_llm else None,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {
                "filters": normalized.filters,
                "generated_by": normalized.generated_by,
                "source_generated_at": normalized.generated_at,
                "algorithm": "deterministic-analysis",
            },
        }
        if self.llm_provider is not None and dung_llm:
            result["explanation"] = await self._dien_giai_bang_llm(result)
        if not result["explanation"]:
            result["explanation"] = summary
        self.kiem_tra_ket_qua(result)
        return result

    def chuan_hoa_report(self, report: ReportAnalysisInput | dict[str, Any]) -> ReportAnalysisInput:
        if isinstance(report, ReportAnalysisInput):
            return report
        if not isinstance(report, dict):
            raise AIValidationException("Report đầu vào phải là object.")
        return ReportAnalysisInput.from_dict(report)

    def kiem_tra_input(self, report: ReportAnalysisInput) -> None:
        if not report.report_id:
            raise AIValidationException("Thiếu report_id.")
        if not report.report_type:
            raise AIValidationException("Thiếu report_type.")
        if report.report_version is None:
            raise AIValidationException("Thiếu report_version.")
        if report.period is None:
            raise AIValidationException("Thiếu period.")
        if not report.scope:
            raise AIValidationException("Thiếu scope của báo cáo.")
        has_metrics = bool(report.metrics)
        has_dimensions = bool(report.dimensions)
        has_series = bool(report.time_series)
        if not has_metrics and not has_dimensions and not has_series:
            raise AIValidationException("Báo cáo không có dữ liệu để phân tích.")

    def kiem_tra_ket_qua(self, result: dict[str, Any]) -> None:
        required_fields = {
            "analysis_id",
            "report_id",
            "report_type",
            "report_version",
            "period",
            "scope",
            "summary",
            "metrics",
            "comparisons",
            "trends",
            "anomalies",
            "insights",
            "data_quality",
            "confidence",
            "analysis_version",
            "generated_at",
        }
        missing = [field for field in required_fields if field not in result]
        if missing:
            raise AIValidationException(f"AnalyticsResult thiếu trường: {', '.join(missing)}")
        if not isinstance(result["scope"], dict) or not result["scope"]:
            raise AIValidationException("AnalyticsResult không có scope hợp lệ.")
        if result["confidence"] not in {"HIGH", "MEDIUM", "LOW"}:
            raise AIValidationException("Confidence không hợp lệ.")
        for comparison in result["comparisons"]:
            if comparison.get("percentage_change") is not None and not math.isfinite(float(comparison["percentage_change"])):
                raise AIValidationException("Percentage change không hợp lệ.")
        for anomaly in result["anomalies"]:
            if anomaly.get("score") is not None and not math.isfinite(float(anomaly["score"])):
                raise AIValidationException("Anomaly score không hợp lệ.")

    def _chuan_hoa_metrics(self, raw_metrics: Any) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        if isinstance(raw_metrics, dict):
            items = [{"name": key, **value} if isinstance(value, dict) else {"name": key, "value": value} for key, value in raw_metrics.items()]
        elif isinstance(raw_metrics, list):
            items = raw_metrics
        else:
            return result
        for item in items:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or item.get("key") or "").strip()
            value = self._so_thuc(item.get("value"))
            if not name:
                continue
            result.append({
                "name": name,
                "label": item.get("label") or name,
                "value": value,
                "unit": item.get("unit"),
                "currency": item.get("currency"),
                "source": item.get("source") or "BACKEND_REPORT",
                "metadata": dict(item.get("metadata") or {}),
            })
        return result

    def _chuan_hoa_dimensions(self, raw_dimensions: Any) -> list[dict[str, Any]]:
        if isinstance(raw_dimensions, dict):
            rows: list[dict[str, Any]] = []
            for dimension_name, values in raw_dimensions.items():
                if isinstance(values, dict):
                    for dimension_value, metrics in values.items():
                        rows.append({
                            "dimension": dimension_name,
                            "value": dimension_value,
                            "metrics": metrics if isinstance(metrics, dict) else {"value": metrics},
                        })
                elif isinstance(values, list):
                    for item in values:
                        if isinstance(item, dict):
                            rows.append({
                                "dimension": dimension_name,
                                "value": item.get("value") or item.get("name"),
                                "metrics": item.get("metrics") or item,
                            })
            return rows
        if isinstance(raw_dimensions, list):
            return [item for item in raw_dimensions if isinstance(item, dict)]
        return []

    def _phan_tich_comparisons(self, report: ReportAnalysisInput, metrics: list[dict[str, Any]]) -> list[dict[str, Any]]:
        comparisons: list[dict[str, Any]] = []
        current_metrics = {item["name"]: item["value"] for item in metrics if item["value"] is not None}
        raw = report.comparisons
        if isinstance(raw, dict):
            for name, value in raw.items():
                if isinstance(value, dict):
                    current = self._so_thuc(value.get("current", current_metrics.get(name)))
                    previous = self._so_thuc(value.get("previous"))
                    if current is None:
                        current = current_metrics.get(name)
                    comparisons.append(self._tao_comparison(name, current, previous, value))
                else:
                    comparisons.append(self._tao_comparison(name, current_metrics.get(name), self._so_thuc(value), {}))
        elif isinstance(raw, list):
            for item in raw:
                if isinstance(item, dict):
                    name = str(item.get("metric") or item.get("name") or "").strip()
                    current = self._so_thuc(item.get("current", current_metrics.get(name)))
                    previous = self._so_thuc(item.get("previous"))
                    if name:
                        comparisons.append(self._tao_comparison(name, current, previous, item))
        previous_metrics = self._chuan_hoa_metrics(report.previous_metrics)
        if previous_metrics:
            previous_map = {item["name"]: item["value"] for item in previous_metrics if item["value"] is not None}
            existing = {item["metric"] for item in comparisons}
            for name, current in current_metrics.items():
                if name in previous_map and name not in existing:
                    comparisons.append(self._tao_comparison(name, current, previous_map[name], {}))
        return comparisons

    def _tao_comparison(self, name: str, current: float | None, previous: float | None, source: dict[str, Any]) -> dict[str, Any]:
        absolute_change = None
        percentage_change = None
        direction = "NO_CHANGE"
        if current is not None and previous is not None:
            absolute_change = current - previous
            if previous != 0:
                percentage_change = (absolute_change / abs(previous)) * 100
            if absolute_change > 0:
                direction = "INCREASE"
            elif absolute_change < 0:
                direction = "DECREASE"
        return {
            "metric": name,
            "current": current,
            "previous": previous,
            "absolute_change": round(absolute_change, 6) if absolute_change is not None else None,
            "percentage_change": round(percentage_change, 6) if percentage_change is not None else None,
            "direction": direction,
            "source": source.get("source") or "BACKEND_REPORT",
        }

    def _phan_tich_trends(self, raw_series: Any) -> list[dict[str, Any]]:
        series_list = self._chuan_hoa_series(raw_series)
        result: list[dict[str, Any]] = []
        for series in series_list:
            points = [point for point in series["points"] if point["value"] is not None]
            values = [point["value"] for point in points]
            if len(values) < self.min_series_points:
                result.append({
                    "metric": series["metric"],
                    "trend": "INSUFFICIENT_DATA",
                    "points": len(values),
                    "change_percentage": None,
                    "slope": None,
                    "periods": [point["period"] for point in points],
                })
                continue
            first = values[0]
            last = values[-1]
            change_percentage = None if first == 0 else ((last - first) / abs(first)) * 100
            slope = self._tinh_slope(values)
            trend = self._xac_dinh_trend(values, change_percentage)
            result.append({
                "metric": series["metric"],
                "trend": trend,
                "points": len(values),
                "change_percentage": round(change_percentage, 6) if change_percentage is not None else None,
                "slope": round(slope, 8) if slope is not None else None,
                "periods": [point["period"] for point in points],
            })
        return result

    def _phan_tich_anomalies(self, raw_series: Any) -> list[dict[str, Any]]:
        series_list = self._chuan_hoa_series(raw_series)
        result: list[dict[str, Any]] = []
        for series in series_list:
            points = [point for point in series["points"] if point["value"] is not None]
            values = [point["value"] for point in points]
            if len(values) < 4:
                continue
            mean_value = mean(values)
            std = self._std(values)
            for index, point in enumerate(points):
                score = None
                if std > 0:
                    score = abs((point["value"] - mean_value) / std)
                else:
                    q1, q3 = self._quartiles(values)
                    iqr = q3 - q1
                    if iqr > 0:
                        score = abs(point["value"] - mean_value) / iqr
                if score is not None and score >= self.anomaly_zscore_threshold:
                    result.append({
                        "metric": series["metric"],
                        "period": point["period"],
                        "value": point["value"],
                        "score": round(score, 6),
                        "baseline_mean": round(mean_value, 6),
                        "type": "HIGH_SPIKE" if point["value"] > mean_value else "LOW_DROP",
                        "evidence": {
                            "sample_count": len(values),
                            "threshold": self.anomaly_zscore_threshold,
                        },
                    })
        return result

    def _phan_tich_phan_bo(self, dimensions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        grouped: dict[str, list[tuple[str, float]]] = defaultdict(list)
        for row in dimensions:
            dimension = str(row.get("dimension") or row.get("name") or "").strip()
            value = str(row.get("value") or row.get("label") or "").strip()
            metrics = row.get("metrics") if isinstance(row.get("metrics"), dict) else {}
            if not dimension or not value:
                continue
            metric_name = row.get("metric") or row.get("metric_name")
            if metric_name and metric_name in metrics:
                metric_value = self._so_thuc(metrics.get(metric_name))
                if metric_value is not None:
                    grouped[dimension].append((value, metric_value))
                continue
            for name, metric_value in metrics.items():
                parsed = self._so_thuc(metric_value)
                if parsed is not None:
                    grouped[dimension].append((f"{value}:{name}", parsed))
        result: list[dict[str, Any]] = []
        for dimension, values in grouped.items():
            positive_values = [(name, value) for name, value in values if value >= 0]
            total = sum(value for _, value in positive_values)
            if total <= 0:
                continue
            ranked = sorted(positive_values, key=lambda item: item[1], reverse=True)
            items = [{
                "value": name,
                "amount": round(value, 6),
                "share": round(value / total, 6),
            } for name, value in ranked]
            top_share = items[0]["share"] if items else 0
            result.append({
                "dimension": dimension,
                "total": round(total, 6),
                "top_value": items[0]["value"] if items else None,
                "top_share": top_share,
                "concentrated": top_share >= self.concentration_threshold,
                "items": items[:20],
            })
        return result

    def _phan_tich_tuong_quan(self, raw_series: Any) -> list[dict[str, Any]]:
        series_list = self._chuan_hoa_series(raw_series)
        result: list[dict[str, Any]] = []
        for index in range(len(series_list)):
            for other_index in range(index + 1, len(series_list)):
                left = series_list[index]
                right = series_list[other_index]
                right_map = {point["period"]: point["value"] for point in right["points"] if point["value"] is not None}
                pairs = [(point["value"], right_map[point["period"]]) for point in left["points"] if point["value"] is not None and point["period"] in right_map]
                if len(pairs) < self.min_series_points:
                    continue
                coefficient = self._pearson([pair[0] for pair in pairs], [pair[1] for pair in pairs])
                if coefficient is None or abs(coefficient) < self.correlation_threshold:
                    continue
                result.append({
                    "metric_a": left["metric"],
                    "metric_b": right["metric"],
                    "coefficient": round(coefficient, 6),
                    "strength": self._xac_dinh_correlation_strength(abs(coefficient)),
                    "direction": "POSITIVE" if coefficient > 0 else "NEGATIVE",
                    "points": len(pairs),
                    "interpretation": "Mối liên hệ quan sát được trong dữ liệu, không phải kết luận nhân quả.",
                })
        return result

    def _kiem_tra_chat_luong_du_lieu(self, report: ReportAnalysisInput, metrics: list[dict[str, Any]]) -> dict[str, Any]:
        missing_fields = list(report.data_quality.get("missing_fields") or [])
        conflicts = list(report.data_quality.get("conflicts") or [])
        invalid_fields = list(report.data_quality.get("invalid_fields") or [])
        for metric in metrics:
            if metric["value"] is None:
                invalid_fields.append(metric["name"])
        provided_status = report.data_quality.get("status")
        if provided_status in DATA_QUALITY_STATUS:
            status = provided_status
        elif conflicts:
            status = "DATA_CONFLICT"
        elif invalid_fields:
            status = "DATA_INVALID"
        elif missing_fields:
            status = "DATA_MISSING"
        else:
            status = "DATA_COMPLETE"
        completeness = 1.0
        if metrics:
            valid_count = sum(1 for metric in metrics if metric["value"] is not None)
            completeness = valid_count / len(metrics)
        return {
            "status": status,
            "completeness": round(completeness, 6),
            "missing_fields": sorted(set(str(item) for item in missing_fields)),
            "invalid_fields": sorted(set(str(item) for item in invalid_fields)),
            "conflicts": conflicts,
            "warnings": list(report.data_quality.get("warnings") or []),
            "source": "BACKEND_REPORT",
        }

    def _tao_findings(
        self,
        comparisons: list[dict[str, Any]],
        trends: list[dict[str, Any]],
        anomalies: list[dict[str, Any]],
        distributions: list[dict[str, Any]],
        correlations: list[dict[str, Any]],
        data_quality: dict[str, Any],
    ) -> list[dict[str, Any]]:
        findings: list[dict[str, Any]] = []
        if data_quality["status"] != "DATA_COMPLETE":
            findings.append({
                "type": "DATA_QUALITY",
                "title": "Dữ liệu báo cáo chưa hoàn toàn đầy đủ",
                "summary": f"Trạng thái dữ liệu: {data_quality['status']}.",
                "evidence": data_quality,
                "importance": "HIGH",
                "confidence": self._confidence_data_quality(data_quality),
                "related_metrics": data_quality["invalid_fields"] + data_quality["missing_fields"],
            })
        for comparison in comparisons:
            percentage = comparison["percentage_change"]
            if percentage is None:
                continue
            if percentage > 0:
                insight_type = "GROWTH"
                title = f"{comparison['metric']} tăng so với kỳ trước"
            elif percentage < 0:
                insight_type = "DECLINE"
                title = f"{comparison['metric']} giảm so với kỳ trước"
            else:
                insight_type = "CHANGE"
                title = f"{comparison['metric']} không thay đổi so với kỳ trước"
            findings.append({
                "type": insight_type,
                "title": title,
                "summary": self._mo_ta_phan_tram(comparison),
                "evidence": comparison,
                "importance": self._importance_from_percentage(abs(percentage)),
                "confidence": "HIGH" if comparison["current"] is not None and comparison["previous"] is not None else "LOW",
                "related_metrics": [comparison["metric"]],
            })
        for trend in trends:
            if trend["trend"] == "INCREASING":
                title = f"{trend['metric']} có xu hướng tăng"
            elif trend["trend"] == "DECREASING":
                title = f"{trend['metric']} có xu hướng giảm"
            elif trend["trend"] == "VOLATILE":
                title = f"{trend['metric']} có mức dao động đáng chú ý"
            else:
                continue
            findings.append({
                "type": "TREND",
                "title": title,
                "summary": self._mo_ta_trend(trend),
                "evidence": trend,
                "importance": "MEDIUM",
                "confidence": "HIGH" if trend["points"] >= 5 else "MEDIUM",
                "related_metrics": [trend["metric"]],
            })
        for anomaly in anomalies:
            findings.append({
                "type": "ANOMALY",
                "title": f"Phát hiện điểm bất thường ở {anomaly['metric']}",
                "summary": f"Giá trị tại {anomaly['period']} lệch đáng kể so với mức nền của chuỗi dữ liệu được cung cấp.",
                "evidence": anomaly,
                "importance": "HIGH",
                "confidence": "HIGH" if anomaly["score"] >= 3 else "MEDIUM",
                "related_metrics": [anomaly["metric"]],
            })
        for distribution in distributions:
            if distribution["concentrated"]:
                findings.append({
                    "type": "CONCENTRATION",
                    "title": f"Dữ liệu tập trung tại {distribution['top_value']}",
                    "summary": f"Giá trị đứng đầu chiếm {round(distribution['top_share'] * 100, 2)}% tổng phạm vi của chiều {distribution['dimension']}.",
                    "evidence": distribution,
                    "importance": "MEDIUM",
                    "confidence": "HIGH",
                    "related_metrics": [distribution["dimension"]],
                })
        for correlation in correlations:
            findings.append({
                "type": "CORRELATION",
                "title": f"{correlation['metric_a']} và {correlation['metric_b']} có mối liên hệ quan sát được",
                "summary": f"Hệ số tương quan là {round(correlation['coefficient'], 4)} trong dữ liệu được cung cấp.",
                "evidence": correlation,
                "importance": "MEDIUM",
                "confidence": "MEDIUM",
                "related_metrics": [correlation["metric_a"], correlation["metric_b"]],
            })
        return findings

    def _tao_summary(
        self,
        report: ReportAnalysisInput,
        comparisons: list[dict[str, Any]],
        trends: list[dict[str, Any]],
        anomalies: list[dict[str, Any]],
        distributions: list[dict[str, Any]],
        data_quality: dict[str, Any],
    ) -> str:
        parts: list[str] = []
        valid_comparisons = [item for item in comparisons if item["percentage_change"] is not None]
        if valid_comparisons:
            first = valid_comparisons[0]
            parts.append(self._mo_ta_phan_tram(first))
        valid_trends = [item for item in trends if item["trend"] in {"INCREASING", "DECREASING", "VOLATILE"}]
        if valid_trends:
            parts.append(self._mo_ta_trend(valid_trends[0]))
        if anomalies:
            parts.append(f"Có {len(anomalies)} điểm bất thường được phát hiện trong các chuỗi dữ liệu được cung cấp.")
        concentrated = [item for item in distributions if item["concentrated"]]
        if concentrated:
            parts.append(f"Có {len(concentrated)} chiều dữ liệu có mức tập trung đáng chú ý.")
        if not parts:
            if data_quality["status"] == "DATA_COMPLETE":
                return f"Báo cáo {report.report_type} đã được phân tích từ dữ liệu được Backend cung cấp."
            return f"Báo cáo {report.report_type} đã được phân tích nhưng dữ liệu có trạng thái {data_quality['status']}."
        return " ".join(parts)

    def _tao_warnings(
        self,
        data_quality: dict[str, Any],
        comparisons: list[dict[str, Any]],
        trends: list[dict[str, Any]],
        report: ReportAnalysisInput,
    ) -> list[str]:
        warnings: list[str] = []
        if data_quality["status"] != "DATA_COMPLETE":
            warnings.append("Không nên xem kết quả là đầy đủ khi dữ liệu đầu vào chưa ở trạng thái DATA_COMPLETE.")
        if any(item["previous"] is None for item in comparisons):
            warnings.append("Một số chỉ số không có dữ liệu kỳ trước nên không thể tính percentage change.")
        if trends and any(item["trend"] == "INSUFFICIENT_DATA" for item in trends):
            warnings.append("Một số chuỗi thời gian có quá ít điểm để xác định xu hướng.")
        if not report.time_series:
            warnings.append("Không có chuỗi thời gian nên không thực hiện đầy đủ phân tích xu hướng và bất thường.")
        return warnings

    def _tinh_confidence(
        self,
        data_quality: dict[str, Any],
        findings: list[dict[str, Any]],
        metrics: list[dict[str, Any]],
        raw_series: Any,
    ) -> str:
        score = 0
        if data_quality["status"] == "DATA_COMPLETE":
            score += 3
        elif data_quality["status"] == "DATA_PARTIAL":
            score += 2
        else:
            score += 1
        if len(metrics) >= 3:
            score += 1
        if findings:
            score += 1
        if raw_series:
            series = self._chuan_hoa_series(raw_series)
            if any(len(item["points"]) >= 5 for item in series):
                score += 1
        if score >= 5:
            return "HIGH"
        if score >= 3:
            return "MEDIUM"
        return "LOW"

    def _confidence_data_quality(self, data_quality: dict[str, Any]) -> str:
        if data_quality["status"] == "DATA_COMPLETE":
            return "HIGH"
        if data_quality["status"] == "DATA_PARTIAL":
            return "MEDIUM"
        return "LOW"

    def _chuan_hoa_series(self, raw_series: Any) -> list[dict[str, Any]]:
        if raw_series is None:
            return []
        if isinstance(raw_series, dict):
            result = []
            for metric, points in raw_series.items():
                normalized_points = self._chuan_hoa_points(points)
                result.append({"metric": str(metric), "points": normalized_points})
            return result
        if not isinstance(raw_series, list):
            return []
        result = []
        for item in raw_series:
            if not isinstance(item, dict):
                continue
            metric = str(item.get("metric") or item.get("name") or "").strip()
            points = self._chuan_hoa_points(item.get("points") or item.get("data") or [])
            if metric:
                result.append({"metric": metric, "points": points})
        return result

    def _chuan_hoa_points(self, points: Any) -> list[dict[str, Any]]:
        if not isinstance(points, list):
            return []
        result = []
        for point in points:
            if isinstance(point, dict):
                period = str(point.get("period") or point.get("date") or point.get("x") or "").strip()
                value = self._so_thuc(point.get("value", point.get("y")))
            elif isinstance(point, (list, tuple)) and len(point) >= 2:
                period = str(point[0])
                value = self._so_thuc(point[1])
            else:
                continue
            if period:
                result.append({"period": period, "value": value})
        return result

    def _tinh_slope(self, values: list[float]) -> float | None:
        if len(values) < 2:
            return None
        x_mean = (len(values) - 1) / 2
        y_mean = mean(values)
        numerator = sum((index - x_mean) * (value - y_mean) for index, value in enumerate(values))
        denominator = sum((index - x_mean) ** 2 for index in range(len(values)))
        if denominator == 0:
            return None
        return numerator / denominator

    def _xac_dinh_trend(self, values: list[float], change_percentage: float | None) -> str:
        if change_percentage is None:
            return "VOLATILE"
        if abs(change_percentage) <= self.trend_threshold * 100:
            return "STABLE"
        signs = []
        for index in range(1, len(values)):
            difference = values[index] - values[index - 1]
            signs.append(1 if difference > 0 else -1 if difference < 0 else 0)
        direction_changes = sum(1 for index in range(1, len(signs)) if signs[index] != signs[index - 1] and signs[index] != 0 and signs[index - 1] != 0)
        if direction_changes >= max(2, len(values) // 2):
            return "VOLATILE"
        return "INCREASING" if change_percentage > 0 else "DECREASING"

    def _std(self, values: list[float]) -> float:
        if len(values) < 2:
            return 0.0
        average = mean(values)
        variance = sum((value - average) ** 2 for value in values) / len(values)
        return math.sqrt(variance)

    def _quartiles(self, values: list[float]) -> tuple[float, float]:
        ordered = sorted(values)
        midpoint = len(ordered) // 2
        if len(ordered) % 2 == 0:
            lower_half = ordered[:midpoint]
            upper_half = ordered[midpoint:]
        else:
            lower_half = ordered[:midpoint]
            upper_half = ordered[midpoint + 1:]
        return self._median_list(lower_half), self._median_list(upper_half)

    def _median_list(self, values: list[float]) -> float:
        if not values:
            return 0.0
        values = sorted(values)
        midpoint = len(values) // 2
        if len(values) % 2:
            return values[midpoint]
        return (values[midpoint - 1] + values[midpoint]) / 2

    def _pearson(self, left: list[float], right: list[float]) -> float | None:
        if len(left) != len(right) or len(left) < 2:
            return None
        left_mean = mean(left)
        right_mean = mean(right)
        numerator = sum((x - left_mean) * (y - right_mean) for x, y in zip(left, right))
        left_denominator = math.sqrt(sum((x - left_mean) ** 2 for x in left))
        right_denominator = math.sqrt(sum((y - right_mean) ** 2 for y in right))
        denominator = left_denominator * right_denominator
        if denominator == 0:
            return None
        return numerator / denominator

    def _xac_dinh_correlation_strength(self, value: float) -> str:
        if value >= 0.9:
            return "VERY_STRONG"
        if value >= 0.7:
            return "STRONG"
        return "MODERATE"

    def _mo_ta_phan_tram(self, comparison: dict[str, Any]) -> str:
        percentage = comparison["percentage_change"]
        if percentage is None:
            return f"Không đủ dữ liệu để so sánh {comparison['metric']} với kỳ trước."
        absolute = comparison["absolute_change"]
        direction = "tăng" if percentage > 0 else "giảm" if percentage < 0 else "không thay đổi"
        return f"{comparison['metric']} {direction} {abs(round(percentage, 2))}% so với kỳ trước, chênh lệch tuyệt đối {round(absolute, 2)}."

    def _mo_ta_trend(self, trend: dict[str, Any]) -> str:
        direction = {
            "INCREASING": "tăng",
            "DECREASING": "giảm",
            "VOLATILE": "dao động",
        }.get(trend["trend"], "thay đổi")
        if trend["change_percentage"] is None:
            return f"{trend['metric']} có xu hướng {direction} trong chuỗi dữ liệu được cung cấp."
        return f"{trend['metric']} có xu hướng {direction}, thay đổi từ đầu đến cuối chuỗi là {round(trend['change_percentage'], 2)}%."

    def _importance_from_percentage(self, percentage: float) -> str:
        if percentage >= 30:
            return "HIGH"
        if percentage >= 10:
            return "MEDIUM"
        return "LOW"

    async def _dien_giai_bang_llm(self, result: dict[str, Any]) -> str | None:
        if self.llm_provider is None:
            return None
        facts = {
            "report_type": result["report_type"],
            "period": result["period"],
            "metrics": result["metrics"],
            "comparisons": result["comparisons"],
            "trends": result["trends"],
            "anomalies": result["anomalies"],
            "distributions": result["distributions"],
            "correlations": result["correlations"],
            "insights": result["insights"],
            "data_quality": result["data_quality"],
        }
        system_message = (
            "Bạn là lớp diễn đạt của BookFlow Analytics. "
            "Chỉ được diễn đạt lại các facts được cung cấp. "
            "Không tạo số liệu mới, không sửa số liệu, không suy đoán nguyên nhân, "
            "không mở rộng phạm vi báo cáo, không đề xuất hành động nghiệp vụ. "
            "Nếu dữ liệu không đủ thì phải nói rõ dữ liệu không đủ. "
            "Phân biệt tương quan với nguyên nhân. "
            "Trả về một đoạn giải thích ngắn bằng tiếng Việt."
        )
        user_message = json.dumps(facts, ensure_ascii=False, default=str)
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]
        try:
            content = await self._goi_llm(messages)
            if not content:
                return None
            if len(content) > 4000:
                return None
            if not self._kiem_tra_so_lieu_llm(content, facts):
                return None
            return content.strip()
        except Exception:
            return None

    async def _goi_llm(self, messages: list[dict[str, str]]) -> str | None:
        provider = self.llm_provider
        for method_name in ("generate", "chat", "complete"):
            method = getattr(provider, method_name, None)
            if method is None:
                continue
            try:
                result = method(messages)
                if inspect.isawaitable(result):
                    result = await result
                return self._lay_content_llm(result)
            except TypeError:
                continue
        return None

    def _lay_content_llm(self, result: Any) -> str | None:
        if result is None:
            return None
        if isinstance(result, str):
            return result
        if isinstance(result, dict):
            content = result.get("content")
            if content:
                return str(content)
            choices = result.get("choices")
            if choices and isinstance(choices, list):
                first = choices[0]
                if isinstance(first, dict):
                    message = first.get("message")
                    if isinstance(message, dict) and message.get("content"):
                        return str(message["content"])
                    if first.get("text"):
                        return str(first["text"])
        content = getattr(result, "content", None)
        if content:
            return str(content)
        return None

    def _kiem_tra_so_lieu_llm(self, content: str, facts: dict[str, Any]) -> bool:
        allowed_numbers = set(re.findall(r"-?\d+(?:[.,]\d+)?", json.dumps(facts, ensure_ascii=False, default=str)))
        generated_numbers = set(re.findall(r"-?\d+(?:[.,]\d+)?", content))
        return generated_numbers.issubset(allowed_numbers)

    def _lay_llm_model(self) -> str | None:
        if self.llm_provider is None:
            return None
        return getattr(self.llm_provider, "model", None) or getattr(self.llm_provider, "llm_model", None)

    def _lay_llm_model_version(self) -> str | None:
        if self.llm_provider is None:
            return None
        return getattr(self.llm_provider, "model_version", None)

    def _so_thuc(self, value: Any) -> float | None:
        if value is None or isinstance(value, bool):
            return None
        try:
            number = float(value)
            return number if math.isfinite(number) else None
        except (TypeError, ValueError):
            return None


_phan_tich_bao_cao_service: PhanTichBaoCaoService | None = None


def get_phan_tich_bao_cao_service(llm_provider: LLMProviderProtocol | None = None) -> PhanTichBaoCaoService:
    global _phan_tich_bao_cao_service
    if _phan_tich_bao_cao_service is None:
        _phan_tich_bao_cao_service = PhanTichBaoCaoService(llm_provider=llm_provider)
    elif llm_provider is not None and _phan_tich_bao_cao_service.llm_provider is None:
        _phan_tich_bao_cao_service.llm_provider = llm_provider
    return _phan_tich_bao_cao_service