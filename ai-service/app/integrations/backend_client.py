from typing import Any
import httpx
from app.core.config import Settings
from app.core.exceptions import AIBackendException

class BackendClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: httpx.AsyncClient | None = None

    async def khoi_tao(self) -> None:
        self.client = httpx.AsyncClient(
            base_url=self.settings.backend_base_url.rstrip("/"),
            timeout=self.settings.backend_request_timeout,
            headers=self._tao_headers()
        )
    async def kiem_tra_ket_noi(self) -> bool:
        if self.client is None:
            return False
        try:
            response = await self.client.get(f"{self.settings.backend_base_url.rstrip('/')}/health", timeout=min(self.settings.backend_request_timeout, 5.0))
            return response.status_code < 500
        except Exception:
            return False
    async def dong(self) -> None:
        if self.client:
            await self.client.aclose()
            self.client = None

    def san_sang(self) -> bool:
        return self.client is not None

    def _tao_headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        if self.settings.backend_internal_token:
            headers["X-Internal-Token"] = self.settings.backend_internal_token
        return headers

    async def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        response = await self._request("GET", path, params=params)
        return response

    async def post(self, path: str, data: dict[str, Any] | None = None, json_data: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = data if data is not None else json_data
        return await self._request("POST", path, json=payload)

    async def put(self, path: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
        response = await self._request("PUT", path, json=data)
        return response

    async def delete(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        response = await self._request("DELETE", path, params=params)
        return response

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        if not self.client:
            raise AIBackendException("Backend Client chưa được khởi tạo")
        try:
            response = await self.client.request(method, path, **kwargs)
        except httpx.TimeoutException as exc:
            raise AIBackendException("Backend phản hồi quá thời gian") from exc
        except httpx.HTTPError as exc:
            raise AIBackendException("Không thể kết nối Backend") from exc
        if response.status_code >= 400:
            try:
                details = response.json()
            except ValueError:
                details = response.text
            raise AIBackendException(
                message=f"Backend trả về HTTP {response.status_code}",
                details=details
            )
        try:
            return response.json()
        except ValueError as exc:
            raise AIBackendException("Backend trả về dữ liệu không phải JSON") from exc

backend_client: BackendClient | None = None

def tao_backend_client(settings: Settings) -> BackendClient:
    global backend_client
    if backend_client is None:
        backend_client = BackendClient(settings)
    return backend_client