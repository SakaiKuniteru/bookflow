import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("bookflow-ai")

class AIServiceException(Exception):
    def __init__(self, message: str, code: str = "AI_SERVICE_ERROR", status_code: int = 500, details: object | None = None, retryable: bool = False):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        self.retryable = retryable
        super().__init__(message)

class AIValidationException(AIServiceException):
    def __init__(self, message: str, details: object | None = None):
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422, details=details, retryable=False)

class AIProviderException(AIServiceException):
    def __init__(self, message: str = "AI Provider không khả dụng", details: object | None = None):
        super().__init__(message=message, code="AI_PROVIDER_ERROR", status_code=502, details=details, retryable=True)

class AIBackendException(AIServiceException):
    def __init__(self, message: str = "Không thể kết nối Backend", details: object | None = None):
        super().__init__(message=message, code="BACKEND_ERROR", status_code=502, details=details, retryable=True)

class AIRateLimitException(AIServiceException):
    def __init__(self, message: str = "Quá nhiều yêu cầu", details: object | None = None):
        super().__init__(message=message, code="RATE_LIMIT_EXCEEDED", status_code=429, details=details, retryable=True)

class AIAuthenticationException(AIServiceException):
    def __init__(self, message: str = "Xác thực không hợp lệ", details: object | None = None):
        super().__init__(message=message, code="AUTHENTICATION_ERROR", status_code=401, details=details, retryable=False)

class AIAuthorizationException(AIServiceException):
    def __init__(self, message: str = "Không có quyền thực hiện", details: object | None = None):
        super().__init__(message=message, code="AUTHORIZATION_ERROR", status_code=403, details=details, retryable=False)

class AINotFoundException(AIServiceException):
    def __init__(self, message: str = "Không tìm thấy dữ liệu", details: object | None = None):
        super().__init__(message=message, code="NOT_FOUND", status_code=404, details=details, retryable=False)

class AIConflictException(AIServiceException):
    def __init__(self, message: str = "Dữ liệu đang xung đột", details: object | None = None):
        super().__init__(message=message, code="CONFLICT", status_code=409, details=details, retryable=False)

async def xu_ly_ai_exception(request: Request, exc: AIServiceException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"code": exc.code, "message": exc.message, "details": exc.details})

async def xu_ly_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"code": f"HTTP_{exc.status_code}", "message": exc.detail}, headers=exc.headers)

async def xu_ly_validation_exception(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"code": "VALIDATION_ERROR", "message": "Dữ liệu request không hợp lệ", "details": exc.errors()})

async def xu_ly_exception(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"code": "INTERNAL_SERVER_ERROR", "message": "Đã xảy ra lỗi hệ thống"})

def dang_ky_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AIServiceException, xu_ly_ai_exception)
    app.add_exception_handler(StarletteHTTPException, xu_ly_http_exception)
    app.add_exception_handler(RequestValidationError, xu_ly_validation_exception)
    app.add_exception_handler(Exception, xu_ly_exception)