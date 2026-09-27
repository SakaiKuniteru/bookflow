from typing import Any
import httpx
from app.core.config import Settings
from app.core.exceptions import AIProviderException
from app.providers.base import LLMMessage, LLMProvider, LLMResponse

class OpenAICompatibleLLMProvider(LLMProvider):
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: httpx.AsyncClient | None = None

    async def khoi_tao(self) -> None:
        if not self.settings.llm_base_url:
            return
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.settings.llm_api_key:
            headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"
        self.client = httpx.AsyncClient(
            base_url=self.settings.llm_base_url.rstrip("/"),
            headers=headers,
            timeout=self.settings.llm_timeout
        )

    async def dong(self) -> None:
        if self.client:
            await self.client.aclose()
            self.client = None

    def san_sang(self) -> bool:
        return self.client is not None and bool(self.settings.llm_model)

    async def chat(self, messages: list[LLMMessage], temperature: float | None = None, max_tokens: int | None = None) -> LLMResponse:
        if not self.client:
            raise AIProviderException("LLM Provider chưa được khởi tạo")
        if not self.settings.llm_model:
            raise AIProviderException("Chưa cấu hình LLM_MODEL")
        payload: dict[str, Any] = {
            "model": self.settings.llm_model,
            "messages": [{"role": item.role, "content": item.content} for item in messages],
            "temperature": self.settings.ai_temperature if temperature is None else temperature,
            "max_tokens": self.settings.ai_max_response_tokens if max_tokens is None else max_tokens
        }
        try:
            response = await self.client.post("/chat/completions", json=payload)
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise AIProviderException("LLM Provider phản hồi quá thời gian") from exc
        except httpx.HTTPStatusError as exc:
            details = self._lay_error(exc.response)
            raise AIProviderException("LLM Provider trả về lỗi", details=details) from exc
        except httpx.HTTPError as exc:
            raise AIProviderException("Không thể kết nối LLM Provider") from exc
        try:
            data = response.json()
        except ValueError as exc:
            raise AIProviderException("LLM Provider trả về dữ liệu không hợp lệ") from exc
        choices = data.get("choices") or []
        if not choices:
            raise AIProviderException("LLM Provider không trả về kết quả")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if content is None:
            raise AIProviderException("LLM Provider không trả về nội dung")
        return LLMResponse(
            content=str(content),
            model=data.get("model"),
            usage=data.get("usage"),
            raw=data
        )

    async def health_check(self) -> bool:
        if not self.client or not self.settings.llm_model:
            return False
        try:
            response = await self.client.get("/models")
            return response.status_code < 400
        except httpx.HTTPError:
            return False

    @staticmethod
    def _lay_error(response: httpx.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return response.text

llm_provider: OpenAICompatibleLLMProvider | None = None

def tao_llm_provider(settings: Settings) -> OpenAICompatibleLLMProvider:
    global llm_provider
    if llm_provider is None:
        llm_provider = OpenAICompatibleLLMProvider(settings)
    return llm_provider