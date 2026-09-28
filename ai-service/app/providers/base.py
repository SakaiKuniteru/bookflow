from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
@dataclass(slots=True)
class LLMMessage:
    role: str
    content: str | None = None
    name: str | None = None
    tool_call_id: str | None = None
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
@dataclass(slots=True)
class LLMResponse:
    content: str
    model: str | None = None
    usage: dict[str, Any] | None = None
    finish_reason: str | None = None
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    raw: dict[str, Any] | None = None

@dataclass(slots=True)
class EmbeddingResponse:
    vectors: list[list[float]]
    model: str | None = None
    usage: dict[str, Any] | None = None
    raw: dict[str, Any] | None = None

class LLMProvider(ABC):
    @abstractmethod
    async def khoi_tao(self) -> None:
        ...
    @abstractmethod
    async def chat(
        self,
        messages: list[LLMMessage],
        temperature: float | None = None,
        max_tokens: int | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> LLMResponse:
        ...
    @abstractmethod
    async def dong(self) -> None:
        ...
    @abstractmethod
    def san_sang(self) -> bool:
        ...
    @abstractmethod
    async def kiem_tra_ket_noi(self) -> bool:
        ...
class EmbeddingProvider(ABC):
    @abstractmethod
    async def khoi_tao(self) -> None:
        ...
    @abstractmethod
    async def embed(self, texts: list[str]) -> EmbeddingResponse:
        ...
    @abstractmethod
    async def dong(self) -> None:
        ...
    @abstractmethod
    def san_sang(self) -> bool:
        ...
    @abstractmethod
    async def kiem_tra_ket_noi(self) -> bool:
        ...