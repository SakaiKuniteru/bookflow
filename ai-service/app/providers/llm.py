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

    async def chat(
        self,
        messages: list[LLMMessage],
        temperature: float | None = None,
        max_tokens: int | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> LLMResponse:
        if self.client is None:
            raise AIProviderException("LLM provider chưa được khởi tạo.")
        payload = {
            "model": self.settings.llm_model,
            "messages": [
                {
                    key: value
                    for key, value in {
                        "role": item.role,
                        "content": item.content,
                        "name": item.name,
                        "tool_call_id": item.tool_call_id,
                        "tool_calls": item.tool_calls or None,
                    }.items()
                    if value is not None
                }
                for item in messages
            ],
            "temperature": self.settings.ai_temperature if temperature is None else temperature,
            "max_tokens": self.settings.ai_max_response_tokens if max_tokens is None else max_tokens,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        response = await self.client.post(
            f"{self.settings.llm_base_url.rstrip('/')}/chat/completions",
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        choice = data["choices"][0]
        message = choice.get("message") or {}
        return LLMResponse(
            content=str(message.get("content") or ""),
            model=data.get("model") or self.settings.llm_model,
            usage=data.get("usage") or {},
            finish_reason=choice.get("finish_reason"),
            tool_calls=message.get("tool_calls") or [],
            raw=data,
        )
    async def kiem_tra_ket_noi(self) -> bool:
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
def get_llm_provider() -> LLMProvider:
    return llm_provider