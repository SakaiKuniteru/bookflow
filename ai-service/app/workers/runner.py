from __future__ import annotations
import asyncio
import inspect
import logging
import os
import signal
import socket
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable
from app.core.config import get_settings
from app.queue.dispatcher import QueueDispatcher
from app.queue.retry import RetryPolicy, chay_retry
from app.repositories.cong_viec import CongViecRepository
from .don_dep_chi_muc import JOB_TYPE as CLEANUP_INDEX, xu_ly as xu_ly_don_dep
from .lap_chi_muc_sach import JOB_TYPE as INDEX_BOOK, xu_ly as xu_ly_sach
from .lap_chi_muc_tai_lieu import JOB_TYPE as INDEX_DOCUMENT, xu_ly as xu_ly_tai_lieu
from .tao_goi_y import JOB_TYPE as GENERATE_RECOMMENDATION, xu_ly as xu_ly_goi_y
from .trich_xuat_thong_tin import JOB_TYPE as EXTRACT_INFORMATION, xu_ly as xu_ly_trich_xuat

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[dict[str, Any]], Awaitable[None]]
WorkerService = Callable[[dict[str, Any], ProgressCallback, dict[str, Any]], Awaitable[dict[str, Any]]]
WorkerHandler = Callable[[dict[str, Any], WorkerService, ProgressCallback, dict[str, Any]], Awaitable[dict[str, Any]]]

JOB_HANDLERS: dict[str, WorkerHandler] = {
    INDEX_BOOK: xu_ly_sach,
    INDEX_DOCUMENT: xu_ly_tai_lieu,
    EXTRACT_INFORMATION: xu_ly_trich_xuat,
    GENERATE_RECOMMENDATION: xu_ly_goi_y,
    CLEANUP_INDEX: xu_ly_don_dep,
}

JOB_TIMEOUTS: dict[str, float] = {
    INDEX_BOOK: 300.0,
    INDEX_DOCUMENT: 900.0,
    EXTRACT_INFORMATION: 900.0,
    GENERATE_RECOMMENDATION: 300.0,
    CLEANUP_INDEX: 600.0,
}

@dataclass(slots=True)
class WorkerServices:
    lap_chi_muc_sach: WorkerService
    lap_chi_muc_tai_lieu: WorkerService
    trich_xuat_thong_tin: WorkerService
    tao_goi_y: WorkerService
    don_dep_chi_muc: WorkerService

    def lay_theo_job_type(self, job_type: str) -> WorkerService:
        mapping = {
            INDEX_BOOK: self.lap_chi_muc_sach,
            INDEX_DOCUMENT: self.lap_chi_muc_tai_lieu,
            EXTRACT_INFORMATION: self.trich_xuat_thong_tin,
            GENERATE_RECOMMENDATION: self.tao_goi_y,
            CLEANUP_INDEX: self.don_dep_chi_muc,
        }
        service = mapping.get(job_type)
        if not callable(service):
            raise RuntimeError(f"Không có service cho job type: {job_type}")
        return service

class WorkerRunner:
    def __init__(
        self,
        queue_dispatcher: QueueDispatcher,
        cong_viec_repository: CongViecRepository,
        services: WorkerServices,
        queue_name: str,
        worker_id: str | None = None,
        concurrency: int = 1,
        poll_timeout: int = 5,
        heartbeat_interval: int = 15,
        retry_policy: RetryPolicy | None = None,
        job_timeouts: dict[str, float] | None = None,
    ):
        if not queue_name:
            raise ValueError("queue_name không được để trống.")
        if concurrency < 1:
            raise ValueError("concurrency phải lớn hơn hoặc bằng 1.")
        self.settings = get_settings()
        self.queue_dispatcher = queue_dispatcher
        self.cong_viec_repository = cong_viec_repository
        self.services = services
        self.queue_name = queue_name
        self.worker_id = worker_id or self._tao_worker_id()
        self.concurrency = concurrency
        self.poll_timeout = poll_timeout
        self.heartbeat_interval = heartbeat_interval
        self.retry_policy = retry_policy or RetryPolicy()
        self.job_timeouts = {**JOB_TIMEOUTS, **(job_timeouts or {})}
        self.dung_event = asyncio.Event()
        self.tasks: set[asyncio.Task[Any]] = set()

    @staticmethod
    def _tao_worker_id() -> str:
        return f"{socket.gethostname()}-{os.getpid()}-{uuid.uuid4().hex[:12]}"

    @staticmethod
    def _utc_now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    async def _goi(ham: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        ket_qua = ham(*args, **kwargs)
        if inspect.isawaitable(ket_qua):
            return await ket_qua
        return ket_qua

    @staticmethod
    def _lay_error_code(error: Exception) -> str:
        code = getattr(error, "error_code", None) or getattr(error, "code", None)
        if code:
            return str(code).upper()
        return error.__class__.__name__.upper()

    @staticmethod
    def _lay_error_message(error: Exception) -> str:
        message = str(error).strip() or error.__class__.__name__
        return message[:2000]

    @staticmethod
    def _la_retryable(error: Exception) -> bool:
        retryable = getattr(error, "retryable", None)
        if retryable is not None:
            return bool(retryable)
        status_code = getattr(error, "status_code", None)
        if status_code in {429, 502, 503, 504}:
            return True
        error_name = error.__class__.__name__.lower()
        if error_name in {"validationerror", "authorizationerror", "authenticationerror", "notfounderror", "conflicterror", "nonretryableerror"}:
            return False
        if error_name in {"timeouterror", "dependencyerror", "providererror", "connectionerror"}:
            return True
        error_code = WorkerRunner._lay_error_code(error)
        retryable_codes = {
            "TIMEOUT",
            "WORKER_TIMEOUT",
            "RATE_LIMIT",
            "DEPENDENCY_ERROR",
            "DEPENDENCY_UNAVAILABLE",
            "PROVIDER_ERROR",
            "PROVIDER_UNAVAILABLE",
            "NETWORK_ERROR",
            "SERVICE_UNAVAILABLE",
        }
        return error_code in retryable_codes

    def _dang_ky_signal(self) -> None:
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                signal.signal(sig, self.dung)
            except (ValueError, OSError):
                continue

    def dung(self, *_args: Any) -> None:
        logger.info("Nhận tín hiệu dừng worker_id=%s", self.worker_id)
        self.dung_event.set()

    async def _cho_tin_hieu(self) -> bool:
        tin_hieu = await self._goi(
            self.queue_dispatcher.receive,
            self.queue_name,
            self.poll_timeout,
        )
        if tin_hieu is None:
            return True
        task_name = tin_hieu.get("task")
        if task_name and task_name not in JOB_HANDLERS:
            logger.warning(
                "Bỏ qua queue task không thuộc AI worker task=%s worker_id=%s",
                task_name,
                self.worker_id,
            )
            return False
        return True

    def _kiem_tra_job(self, job: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        job_id = job.get("job_id")
        job_type = job.get("job_type")
        payload = job.get("payload")
        attempt = job.get("attempt")
        max_attempts = job.get("max_attempts")
        if not job_id:
            raise ValueError("Job thiếu job_id.")
        if not isinstance(job_type, str) or not job_type:
            raise ValueError("Job thiếu job_type.")
        if job_type not in JOB_HANDLERS:
            raise ValueError(f"Job type không được hỗ trợ: {job_type}")
        if not isinstance(payload, dict):
            raise ValueError("Job payload phải là object.")
        if not isinstance(attempt, int) or attempt < 1:
            raise ValueError("Job attempt không hợp lệ.")
        if not isinstance(max_attempts, int) or max_attempts < 1:
            raise ValueError("Job max_attempts không hợp lệ.")
        return job_type, payload

    def _tao_worker_context(self, job: dict[str, Any]) -> dict[str, Any]:
        job_id = str(job["job_id"])
        job_type = str(job["job_type"])
        return {
            "job_id": job_id,
            "job_type": job_type,
            "idempotency_key": job.get("idempotency_key") or f"{job_type}:{job_id}",
            "attempt": job.get("attempt", 1),
            "max_attempts": job.get("max_attempts", self.retry_policy.max_attempts),
            "request_id": job.get("request_id"),
            "trace_id": job.get("trace_id"),
        }

    async def _cap_nhat_metadata(self, job_id: str, progress: dict[str, Any] | None = None) -> None:
        metadata = {
            "heartbeat_at": self._utc_now().isoformat(),
            "worker_id": self.worker_id,
        }
        if progress is not None:
            metadata["progress"] = progress
        await self._goi(
            self.cong_viec_repository.cap_nhat,
            job_id,
            metadata=metadata,
        )

    async def _cap_nhat_tien_do(self, job_id: str, progress_state: dict[str, Any], progress: dict[str, Any]) -> None:
        if not isinstance(progress, dict):
            return
        percentage = progress.get("percentage")
        if percentage is not None:
            try:
                percentage = max(0.0, min(100.0, float(percentage)))
            except (TypeError, ValueError):
                percentage = None
        progress_state.clear()
        for key in ("processed", "total", "percentage", "message"):
            if key in progress:
                progress_state[key] = progress[key]
        if percentage is not None:
            progress_state["percentage"] = percentage
        try:
            await self._cap_nhat_metadata(job_id, dict(progress_state))
        except Exception as error:
            logger.warning(
                "Không cập nhật được progress job_id=%s error=%s",
                job_id,
                self._lay_error_message(error),
            )

    async def _heartbeat(self, job_id: str, progress_state: dict[str, Any]) -> None:
        while not self.dung_event.is_set():
            try:
                await asyncio.sleep(self.heartbeat_interval)
                await self._cap_nhat_metadata(job_id, dict(progress_state))
            except asyncio.CancelledError:
                raise
            except Exception as error:
                logger.warning(
                    "Heartbeat thất bại job_id=%s error=%s",
                    job_id,
                    self._lay_error_message(error),
                )

    async def _ghi_thanh_cong(self, job_id: str, result: dict[str, Any]) -> None:
        completed_at = self._utc_now()
        async def operation() -> Any:
            return await self._goi(
                self.cong_viec_repository.cap_nhat,
                job_id,
                status="COMPLETED",
                result=result,
                completed_at=completed_at,
                worker_id=self.worker_id,
            )
        await chay_retry(
            operation,
            policy=RetryPolicy(max_attempts=3, initial_delay=0.5, max_delay=5.0, multiplier=2.0),
        )

    async def _ghi_that_bai(self, job_id: str, error_code: str, error_message: str) -> None:
        completed_at = self._utc_now()
        async def operation() -> Any:
            return await self._goi(
                self.cong_viec_repository.cap_nhat,
                job_id,
                status="FAILED",
                error_code=error_code,
                error_message=error_message,
                completed_at=completed_at,
                worker_id=self.worker_id,
            )
        await chay_retry(
            operation,
            policy=RetryPolicy(max_attempts=3, initial_delay=0.5, max_delay=5.0, multiplier=2.0),
        )

    async def _retry_job(self, job: dict[str, Any], error_code: str, error_message: str) -> None:
        job_id = str(job["job_id"])
        attempt = int(job.get("attempt", 1))
        max_attempts = int(job.get("max_attempts", self.retry_policy.max_attempts))
        if attempt >= max_attempts:
            await self._ghi_that_bai(job_id, error_code, error_message)
            return
        delay = self.retry_policy.delay_for(attempt)
        scheduled_at = self._utc_now() + timedelta(seconds=delay)
        await self._goi(
            self.cong_viec_repository.retry,
            job_id,
            scheduled_at=scheduled_at,
            error_code=error_code,
            error_message=error_message,
        )
        try:
            await self._goi(
                self.queue_dispatcher.dispatch,
                self.queue_name,
                {
                    "job_id": job_id,
                    "job_type": job["job_type"],
                    "payload": job.get("payload") or {},
                    "attempt": attempt + 1,
                    "max_attempts": max_attempts,
                    "request_id": job.get("request_id"),
                    "trace_id": job.get("trace_id"),
                },
            )
        except Exception as error:
            logger.warning(
                "Không enqueue lại được job retry job_id=%s error=%s; DB vẫn giữ RETRYING",
                job_id,
                self._lay_error_message(error),
            )
        logger.warning(
            "Job được retry job_id=%s job_type=%s attempt=%s max_attempts=%s delay=%.2fs error_code=%s request_id=%s trace_id=%s",
            job_id,
            job["job_type"],
            attempt,
            max_attempts,
            delay,
            error_code,
            job.get("request_id"),
            job.get("trace_id"),
        )

    async def _xu_ly_job(self, job: dict[str, Any]) -> None:
        job_id = str(job.get("job_id") or "")
        heartbeat_task: asyncio.Task[Any] | None = None
        started_at = time.monotonic()
        try:
            job_type, payload = self._kiem_tra_job(job)
            service = self.services.lay_theo_job_type(job_type)
            context = self._tao_worker_context(job)
            progress_state: dict[str, Any] = {"percentage": 0}
            async def cap_nhat_tien_do(progress: dict[str, Any]) -> None:
                await self._cap_nhat_tien_do(job_id, progress_state, progress)
            await cap_nhat_tien_do({"percentage": 0})
            heartbeat_task = asyncio.create_task(self._heartbeat(job_id, progress_state))
            timeout = float(self.job_timeouts.get(job_type, 600.0))
            result = await asyncio.wait_for(
                JOB_HANDLERS[job_type](job, service, cap_nhat_tien_do, context),
                timeout=timeout,
            )
            if not isinstance(result, dict):
                raise ValueError("Worker service phải trả về dict result.")
        except asyncio.TimeoutError as error:
            error_code = "WORKER_TIMEOUT"
            error_message = f"Job vượt timeout {self.job_timeouts.get(job.get('job_type'), 600.0)} giây."
            logger.exception(
                "Worker timeout job_id=%s job_type=%s request_id=%s trace_id=%s",
                job_id,
                job.get("job_type"),
                job.get("request_id"),
                job.get("trace_id"),
            )
            try:
                await self._retry_job(job, error_code, error_message)
            except Exception:
                logger.exception("Không thể xử lý retry sau timeout job_id=%s", job_id)
            return
        except ValueError as error:
            error_code = "JOB_VALIDATION_ERROR"
            error_message = self._lay_error_message(error)
            logger.error(
                "Job validation thất bại job_id=%s job_type=%s error=%s",
                job_id,
                job.get("job_type"),
                error_message,
            )
            try:
                await self._ghi_that_bai(job_id, error_code, error_message)
            except Exception:
                logger.exception("Không thể ghi FAILED job_id=%s", job_id)
            return
        except Exception as error:
            error_code = self._lay_error_code(error)
            error_message = self._lay_error_message(error)
            retryable = self._la_retryable(error)
            logger.exception(
                "Worker xử lý lỗi job_id=%s job_type=%s attempt=%s request_id=%s trace_id=%s retryable=%s",
                job_id,
                job.get("job_type"),
                job.get("attempt"),
                job.get("request_id"),
                job.get("trace_id"),
                retryable,
            )
            try:
                if retryable:
                    await self._retry_job(job, error_code, error_message)
                else:
                    await self._ghi_that_bai(job_id, error_code, error_message)
            except Exception:
                logger.exception("Không thể cập nhật trạng thái lỗi job_id=%s", job_id)
            return
        finally:
            if heartbeat_task is not None:
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass
                except Exception:
                    logger.exception("Heartbeat task kết thúc với lỗi job_id=%s", job_id)
        duration = time.monotonic() - started_at
        try:
            await self._ghi_thanh_cong(job_id, result)
        except Exception:
            logger.exception(
                "Service đã hoàn thành nhưng không ghi được COMPLETED job_id=%s request_id=%s trace_id=%s; không chạy lại service tự động",
                job_id,
                job.get("request_id"),
                job.get("trace_id"),
            )
            return
        logger.info(
            "Job hoàn thành job_id=%s job_type=%s attempt=%s duration=%.3fs request_id=%s trace_id=%s",
            job_id,
            job.get("job_type"),
            job.get("attempt"),
            duration,
            job.get("request_id"),
            job.get("trace_id"),
        )

    async def chay(self) -> None:
        self._dang_ky_signal()
        if not getattr(self.settings, "worker_enabled", True):
            logger.info("Worker đang bị tắt.")
            return
        logger.info(
            "Worker bắt đầu worker_id=%s queue=%s concurrency=%s",
            self.worker_id,
            self.queue_name,
            self.concurrency,
        )
        logger.info(
            "Worker ready worker_id=%s queue=%s; bắt đầu poll queue",
            self.worker_id,
            self.queue_name,
        )
        while not self.dung_event.is_set():
            self.tasks = {task for task in self.tasks if not task.done()}
            if len(self.tasks) >= self.concurrency:
                done, pending = await asyncio.wait(self.tasks, return_when=asyncio.FIRST_COMPLETED)
                self.tasks = pending
                for task in done:
                    try:
                        await task
                    except Exception:
                        logger.exception("Worker task kết thúc bất thường.")
                continue
            try:
                co_tin_hieu = await self._cho_tin_hieu()
                if not co_tin_hieu:
                    continue
                job = await self._goi(self.cong_viec_repository.claim, self.worker_id)
                if not job:
                    continue
                task = asyncio.create_task(self._xu_ly_job(job))
                self.tasks.add(task)
            except asyncio.CancelledError:
                raise
            except Exception as error:
                logger.exception(
                    "Runner gặp lỗi worker_id=%s error=%s",
                    self.worker_id,
                    self._lay_error_message(error),
                )
                await asyncio.sleep(1)
        if self.tasks:
            logger.info("Đang chờ %s job hiện tại hoàn thành trước khi shutdown.", len(self.tasks))
            done, _ = await asyncio.wait(self.tasks)
            for task in done:
                try:
                    await task
                except Exception:
                    logger.exception("Job lỗi trong graceful shutdown.")
        logger.info("Worker đã dừng worker_id=%s", self.worker_id)

async def chay_worker(
    queue_dispatcher: QueueDispatcher,
    cong_viec_repository: CongViecRepository,
    services: WorkerServices,
    queue_name: str,
    worker_id: str | None = None,
    concurrency: int = 1,
    poll_timeout: int = 5,
    heartbeat_interval: int = 15,
    retry_policy: RetryPolicy | None = None,
    job_timeouts: dict[str, float] | None = None,
) -> None:
    runner = WorkerRunner(
        queue_dispatcher=queue_dispatcher,
        cong_viec_repository=cong_viec_repository,
        services=services,
        queue_name=queue_name,
        worker_id=worker_id,
        concurrency=concurrency,
        poll_timeout=poll_timeout,
        heartbeat_interval=heartbeat_interval,
        retry_policy=retry_policy,
        job_timeouts=job_timeouts,
    )
    await runner.chay()

async def khoi_dong_worker() -> None:
    from app.core.config import get_settings
    from app.core.logging import cau_hinh_logging
    from app.integrations.postgres import tao_postgres_client
    from app.integrations.redis import tao_redis_client
    from app.integrations.storage import tao_storage_client
    from app.integrations.backend_client import tao_backend_client
    from app.providers.llm import tao_llm_provider
    from app.providers.embeddings import tao_embedding_provider
    from app.queue.connection import tao_queue_connection
    from app.queue.dispatcher import QueueDispatcher
    from app.repositories.cong_viec import tao_cong_viec_repository
    from app.repositories.doan_du_lieu import doan_du_lieu_repository
    from app.repositories.nguon_du_lieu import nguon_du_lieu_repository
    from app.services.indexing.sach import sach_indexing_service
    from app.services.indexing.tai_lieu import tai_lieu_indexing_service
    from app.services.extraction.trich_xuat_thong_tin import trich_xuat_thong_tin_service
    from app.services.recommendations.tao_ung_vien import tao_ung_vien_service
    settings = get_settings()
    cau_hinh_logging(settings.app_log_level)
    postgres = tao_postgres_client(settings)
    redis = tao_redis_client(settings)
    storage = tao_storage_client(settings)
    backend = tao_backend_client(settings)
    llm = tao_llm_provider(settings)
    embedding = tao_embedding_provider(settings)
    queue = tao_queue_connection(settings)
    initialized = []
    try:
        logger.info("Worker startup: PostgreSQL")
        await postgres.khoi_tao()
        initialized.append(postgres)
        logger.info("Worker startup: Redis")
        await redis.khoi_tao()
        initialized.append(redis)
        logger.info("Worker startup: Storage")
        await storage.khoi_tao()
        initialized.append(storage)
        logger.info("Worker startup: Backend")
        await backend.khoi_tao()
        initialized.append(backend)
        logger.info("Worker startup: LLM")
        await llm.khoi_tao()
        initialized.append(llm)
        logger.info("Worker startup: Embedding")
        await embedding.khoi_tao()
        initialized.append(embedding)
        logger.info("Worker startup: Queue")
        await queue.khoi_tao()
        initialized.append(queue)
        repository = tao_cong_viec_repository(postgres)
        dispatcher = QueueDispatcher(queue)
        async def index_book(payload, progress, context):
            result = await sach_indexing_service.index_sach(
                payload["book_id"],
                du_lieu=payload.get("book_data"),
                backend_path=payload.get("backend_path"),
                force=bool(payload.get("force", False)),
            )
            await progress({"processed": 1, "total": 1, "percentage": 100, "message": "Index sách hoàn tất."})
            return result
        async def index_document(payload, progress, context):
            result = await tai_lieu_indexing_service.index_tai_lieu(
                payload["file_id"],
                du_lieu=payload.get("document_data"),
                backend_path=payload.get("backend_path"),
                force=bool(payload.get("force", False)),
            )
            await progress({"processed": 1, "total": 1, "percentage": 100, "message": "Index tài liệu hoàn tất."})
            return result
        async def extract_information(payload, progress, context):
            result = await trich_xuat_thong_tin_service.trich_xuat(
                ocr_result=payload["ocr_result"],
                document_type_hint=payload.get("document_type"),
                existing_data=payload.get("existing_data"),
                verified_fields=payload.get("verified_fields"),
                extraction_context=payload.get("extraction_context"),
            )
            await progress({"processed": 1, "total": 1, "percentage": 100, "message": "Extraction hoàn tất."})
            return result
        async def generate_recommendation(payload, progress, context):
            result = await tao_ung_vien_service.tao_ung_vien(
                payload.get("context") or payload,
                user_context=payload.get("user_context") or {},
                limit=payload.get("limit"),
            )
            await progress({"processed": 1, "total": 1, "percentage": 100, "message": "Recommendation hoàn tất."})
            return result
        async def cleanup_index(payload, progress, context):
            source_id = payload.get("source_id")
            if source_id:
                chunk_count = await doan_du_lieu_repository.vo_hieu_hoa_theo_source(str(source_id))
                await nguon_du_lieu_repository.vo_hieu_hoa(str(source_id), status="INACTIVE")
            else:
                chunk_count = 0
            await progress({"processed": 1, "total": 1, "percentage": 100, "message": "Cleanup index hoàn tất."})
            return {"source_id": source_id, "affected_chunks": chunk_count}
        services = WorkerServices(
            lap_chi_muc_sach=index_book,
            lap_chi_muc_tai_lieu=index_document,
            trich_xuat_thong_tin=extract_information,
            tao_goi_y=generate_recommendation,
            don_dep_chi_muc=cleanup_index,
        )
        await chay_worker(
            queue_dispatcher=dispatcher,
            cong_viec_repository=repository,
            services=services,
            queue_name=settings.queue_name,
            concurrency=settings.worker_concurrency,
            poll_timeout=settings.worker_poll_timeout,
            heartbeat_interval=settings.worker_heartbeat_interval,
        )
    finally:
        for dependency in reversed(initialized):
            await dependency.dong()
if __name__ == "__main__":
    import asyncio
    asyncio.run(khoi_dong_worker())