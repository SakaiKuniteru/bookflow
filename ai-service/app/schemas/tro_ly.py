from typing import Any
from pydantic import Field
from app.schemas.dung_chung import Citation, RequestContext, SchemaCoSo

class LoaiPhanHoiTroLy(str):
    TEXT = "TEXT"
    LIST = "LIST"
    BOOK_LIST = "BOOK_LIST"
    NEED_CLARIFICATION = "NEED_CLARIFICATION"
    ERROR = "ERROR"

class CongCuGoi(SchemaCoSo):
    tool_call_id: str = Field(min_length=1, max_length=100)
    tool_name: str = Field(min_length=1, max_length=100)
    arguments: dict[str, Any] = Field(default_factory=dict)

class KetQuaCongCu(SchemaCoSo):
    tool_call_id: str = Field(min_length=1, max_length=100)
    tool_name: str = Field(min_length=1, max_length=100)
    success: bool
    result: Any | None = None
    error: str | None = Field(default=None, max_length=2000)

class CongCuDaSuDung(SchemaCoSo):
    tool_call_id: str = Field(min_length=1, max_length=100)
    tool_name: str = Field(min_length=1, max_length=100)
    success: bool

class TroLyRequest(SchemaCoSo):
    conversation_id: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=1, max_length=5000)
    user_context: dict[str, Any] = Field(default_factory=dict)
    session_context: dict[str, Any] = Field(default_factory=dict)

class TroLyResponse(SchemaCoSo):
    conversation_id: str
    message: str
    answer: str
    sources: list[Citation] = Field(default_factory=list)
    tools_used: list[CongCuDaSuDung] = Field(default_factory=list)
    requires_confirmation: bool = False
    response_type: str = Field(default="TEXT", max_length=50)

class PhanHoiRequest(SchemaCoSo):
    user_id: int | None = Field(default=None, ge=1)
    conversation_id: str | None = Field(default=None, max_length=200)
    message_id: str = Field(min_length=1, max_length=200)
    feedback_type: str = Field(default="GENERAL", min_length=1, max_length=50)
    rating: int | None = Field(default=None, ge=1, le=5)
    content: str | None = Field(default=None, max_length=5000)
    reason: str | None = Field(default=None, max_length=2000)
    metadata: dict[str, Any] = Field(default_factory=dict)