from __future__ import annotations
import asyncio
import inspect
from typing import Any, Awaitable, Callable
from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

router = APIRouter(
    prefix="/health",
    tags=["health"]
)

HEALTH_CHECK_TIMEOUT_SECONDS = 2.0

async def _chay_health_check(
    checker: Callable[[], Any]
) -> dict[str, Any]:
    try:
        result = checker()
        if inspect.isawaitable(result):
            result = await asyncio.wait_for(
                result,
                timeout=HEALTH_CHECK_TIMEOUT_SECONDS
            )
        if isinstance(result, dict):
            return {
                "status": result.get("status", "ok"),
                **{
                    key: value
                    for key, value in result.items()
                    if key != "status"
                }
            }
        if result is False:
            return {
                "status": "error"
            }
        return {
            "status": "ok"
        }
    except asyncio.TimeoutError:
        return {
            "status": "timeout"
        }
    except Exception:
        return {
            "status": "error"
        }

@router.get(
    "/live",
    status_code=status.HTTP_200_OK
)
async def live() -> dict[str, str]:
    return {
        "status": "ok"
    }

@router.get(
    "/ready"
)
async def ready(
    request: Request
) -> JSONResponse:
    health_checks = getattr(
        request.app.state,
        "health_checks",
        {}
    )
    if not health_checks:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "dependencies": {},
                "reason": "health_checks_not_configured"
            }
        )
    dependencies: dict[str, Any] = {}
    for name, checker in health_checks.items():
        dependencies[name] = await _chay_health_check(checker)
    ready_status = all(
        item.get("status") == "ok"
        for item in dependencies.values()
    )
    return JSONResponse(
        status_code=(
            status.HTTP_200_OK
            if ready_status
            else status.HTTP_503_SERVICE_UNAVAILABLE
        ),
        content={
            "status": (
                "ready"
                if ready_status
                else "not_ready"
            ),
            "dependencies": dependencies
        }
    )