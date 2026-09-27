from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

@dataclass(slots=True)
class LLMMessage:
    role: str
    content: str

@dataclass(slots=True)
class LLMResponse:
    content: str
    model: str | None = None
    usage: dict[str, Any] | None = None
    raw: dict[str, Any] | None = None

@dataclass(slots=True)
class EmbeddingResponse:
    vectors: list[list[float]]
    model: str | None = None
    usage: dict[str, Any] | None = None
    raw: dict[str, Any] | None = None

class LLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: list[LLMMessage], temperature: float | None = None, max_tokens: int | None = None) -> LLMResponse:
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        raise NotImplementedError

class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed(self, texts: list[str]) -> EmbeddingResponse:
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        raise NotImplementedError