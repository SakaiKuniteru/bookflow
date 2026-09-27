from typing import Any
import httpx
from app.core.config import Settings
from app.core.exceptions import AIProviderException
from app.providers.base import EmbeddingProvider, EmbeddingResponse

class OpenAICompatibleEmbeddingProvider(EmbeddingProvider):
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: httpx.AsyncClient | None = None

    async def khoi_tao(self) -> None:
        if not self.settings.embedding_base_url:
            return
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.settings.embedding_api_key:
            headers["Authorization"] = f"Bearer {self.settings.embedding_api_key}"
        self.client = httpx.AsyncClient(
            base_url=self.settings.embedding_base_url.rstrip("/"),
            headers=headers,
            timeout=self.settings.llm_timeout
        )

    async def dong(self) -> None:
        if self.client:
            await self.client.aclose()
            self.client = None

    def san_sang(self) -> bool:
        return self.client is not None and bool(self.settings.embedding_model)

    async def embed(self, texts: list[str]) -> EmbeddingResponse:
        if not self.client:
            raise AIProviderException("Embedding Provider chưa được khởi tạo")
        if not self.settings.embedding_model:
            raise AIProviderException("Chưa cấu hình EMBEDDING_MODEL")
        if not texts:
            raise AIProviderException("Danh sách văn bản embedding không được rỗng")
        payload: dict[str, Any] = {
            "model": self.settings.embedding_model,
            "input": texts
        }
        try:
            response = await self.client.post("/embeddings", json=payload)
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise AIProviderException("Embedding Provider phản hồi quá thời gian") from exc
        except httpx.HTTPStatusError as exc:
            details = self._lay_error(exc.response)
            raise AIProviderException("Embedding Provider trả về lỗi", details=details) from exc
        except httpx.HTTPError as exc:
            raise AIProviderException("Không thể kết nối Embedding Provider") from exc
        try:
            data = response.json()
        except ValueError as exc:
            raise AIProviderException("Embedding Provider trả về dữ liệu không hợp lệ") from exc
        items = data.get("data") or []
        if not items:
            raise AIProviderException("Embedding Provider không trả về vector")
        items = sorted(items, key=lambda item: item.get("index", 0))
        vectors = [item.get("embedding") for item in items]
        if any(vector is None for vector in vectors):
            raise AIProviderException("Embedding Provider trả về vector không hợp lệ")
        return EmbeddingResponse(
            vectors=vectors,
            model=data.get("model"),
            usage=data.get("usage"),
            raw=data
        )

    async def health_check(self) -> bool:
        if not self.client or not self.settings.embedding_model:
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

embedding_provider: OpenAICompatibleEmbeddingProvider | None = None

def tao_embedding_provider(settings: Settings) -> OpenAICompatibleEmbeddingProvider:
    global embedding_provider
    if embedding_provider is None:
        embedding_provider = OpenAICompatibleEmbeddingProvider(settings)
    return embedding_provider