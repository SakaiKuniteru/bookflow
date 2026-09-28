from __future__ import annotations

import inspect
import os
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from app.core.exceptions import AIBackendException, AIValidationException


TOOL_OPERATION_READ = "READ"
TOOL_OPERATION_WRITE = "WRITE"
TOOL_STATUS_ACTIVE = "ACTIVE"
TOOL_STATUS_INACTIVE = "INACTIVE"
TOOL_SCOPE_PUBLIC = "PUBLIC"
TOOL_SCOPE_ORGANIZATION = "ORGANIZATION"
TOOL_SCOPE_BRANCH = "BRANCH"
TOOL_SCOPE_WAREHOUSE = "WAREHOUSE"
TOOL_SCOPE_PERMITTED = "PERMITTED"
TOOL_SCOPE_SELF = "SELF"
TOOL_SCOPE_CUSTOMER = "CUSTOMER"

ToolHandler = Callable[[dict[str, Any], dict[str, Any], dict[str, Any]], Awaitable[Any]]


@dataclass(slots=True)
class ToolDefinition:
    name: str
    description: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    required_permissions: list[str] = field(default_factory=list)
    allowed_scopes: list[str] = field(default_factory=lambda: [TOOL_SCOPE_PERMITTED])
    operation: str = TOOL_OPERATION_READ
    status: str = TOOL_STATUS_ACTIVE
    requires_confirmation: bool = False
    handler: ToolHandler | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_llm_schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema
            }
        }

    def to_dict(self, include_handler: bool = False) -> dict[str, Any]:
        data = {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
            "required_permissions": self.required_permissions,
            "allowed_scopes": self.allowed_scopes,
            "operation": self.operation,
            "status": self.status,
            "requires_confirmation": self.requires_confirmation,
            "metadata": self.metadata
        }
        if include_handler:
            data["has_handler"] = self.handler is not None
        return data


@dataclass(slots=True)
class ToolCall:
    tool_call_id: str
    name: str
    arguments: dict[str, Any]


class BackendToolExecutor:
    def __init__(self, backend_client: Any, path: str, method: str = "POST") -> None:
        self.backend_client = backend_client
        self.path = path
        self.method = method.upper()

    async def __call__(self, arguments: dict[str, Any], user_context: dict[str, Any], metadata: dict[str, Any]) -> Any:
        if not self.path:
            raise AIBackendException("Chưa cấu hình endpoint Backend cho tool.")
        payload = {
            "arguments": arguments,
            "user_context": self._context_for_backend(user_context),
            "tool_name": metadata.get("tool_name"),
            "request_id": metadata.get("request_id")
        }
        method = getattr(self.backend_client, self.method.lower(), None)
        if method is None:
            raise AIBackendException(f"Backend client không hỗ trợ HTTP {self.method}.")
        return await self._goi_method(method, self.path, payload)

    @staticmethod
    def _context_for_backend(user_context: dict[str, Any]) -> dict[str, Any]:
        allowed = {
            "user_id",
            "user_type",
            "customer_id",
            "employee_id",
            "role",
            "roles",
            "permissions",
            "don_vi_id",
            "chi_nhanh_id",
            "kho_id",
            "scope",
            "allowed_scope"
        }
        return {
            key: user_context.get(key)
            for key in allowed
            if user_context.get(key) is not None
        }

    @staticmethod
    async def _goi_method(method: Callable[..., Any], path: str, payload: dict[str, Any]) -> Any:
        attempts = [
            ((path,), {"json": payload}),
            ((path,), {"data": payload}),
            ((path, payload), {})
        ]
        last_error: Exception | None = None
        for args, kwargs in attempts:
            try:
                result = method(*args, **kwargs)
                return await result if inspect.isawaitable(result) else result
            except TypeError as error:
                last_error = error
        if last_error:
            raise last_error
        raise AIBackendException("Không thể gọi Backend tool.")


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition, replace: bool = False) -> ToolDefinition:
        self._validate_definition(tool)
        if tool.name in self._tools and not replace:
            raise AIValidationException(f"Tool đã tồn tại: {tool.name}")
        self._tools[tool.name] = tool
        return tool

    def register_backend_tool(
        self,
        tool: ToolDefinition,
        backend_client: Any,
        path: str,
        method: str = "POST",
        replace: bool = False
    ) -> ToolDefinition:
        tool.handler = BackendToolExecutor(backend_client, path, method)
        return self.register(tool, replace=replace)

    def register_local_tool(
        self,
        tool: ToolDefinition,
        handler: ToolHandler,
        replace: bool = False
    ) -> ToolDefinition:
        tool.handler = handler
        return self.register(tool, replace=replace)

    def get(self, name: str) -> ToolDefinition | None:
        return self._tools.get(str(name or "").strip())

    def list_all(self, include_inactive: bool = False) -> list[ToolDefinition]:
        tools = list(self._tools.values())
        if include_inactive:
            return tools
        return [
            tool
            for tool in tools
            if tool.status == TOOL_STATUS_ACTIVE
        ]

    def list_available(self, user_context: dict[str, Any] | None = None) -> list[ToolDefinition]:
        context = user_context or {}
        return [
            tool
            for tool in self.list_all()
            if self.check_permission(tool, context)
            and self.check_scope(tool, context)
        ]

    def check_permission(
        self,
        tool: ToolDefinition,
        user_context: dict[str, Any]
    ) -> bool:
        permissions = {
            str(item).strip()
            for item in user_context.get("permissions", [])
            if str(item).strip()
        }
        if not tool.required_permissions:
            return True
        return all(
            permission in permissions
            for permission in tool.required_permissions
        )

    def check_scope(
        self,
        tool: ToolDefinition,
        user_context: dict[str, Any]
    ) -> bool:
        if not tool.allowed_scopes:
            return True
        scope = str(
            user_context.get("allowed_scope")
            or user_context.get("scope")
            or TOOL_SCOPE_PERMITTED
        ).upper()
        if scope in {TOOL_SCOPE_PUBLIC, TOOL_SCOPE_PERMITTED}:
            return True
        if scope in tool.allowed_scopes:
            return True
        if (
            TOOL_SCOPE_PERMITTED in tool.allowed_scopes
            and user_context.get("permissions")
        ):
            return True
        return False

    async def execute(
        self,
        name: str,
        arguments: dict[str, Any] | None,
        user_context: dict[str, Any] | None = None,
        confirmation: dict[str, Any] | None = None,
        request_id: str | None = None
    ) -> dict[str, Any]:
        context = user_context or {}
        tool = self.get(name)
        if not tool or tool.status != TOOL_STATUS_ACTIVE:
            return {
                "status": "ERROR",
                "error_code": "TOOL_NOT_FOUND",
                "message": "Công cụ không tồn tại hoặc không còn hoạt động."
            }
        if not self.check_permission(tool, context):
            return {
                "status": "DENIED",
                "error_code": "TOOL_PERMISSION_DENIED",
                "message": "Không được phép truy cập dữ liệu qua công cụ này."
            }
        if not self.check_scope(tool, context):
            return {
                "status": "DENIED",
                "error_code": "TOOL_SCOPE_DENIED",
                "message": "Không được phép truy cập phạm vi dữ liệu này."
            }
        if (
            tool.operation == TOOL_OPERATION_WRITE
            and tool.requires_confirmation
            and not bool((confirmation or {}).get("confirmed"))
        ):
            return {
                "status": "NEEDS_CONFIRMATION",
                "error_code": "CONFIRMATION_REQUIRED",
                "message": "Thao tác cần người dùng xác nhận trước khi thực hiện."
            }
        args = arguments if isinstance(arguments, dict) else {}
        try:
            self.validate_input(tool, args)
        except AIValidationException as error:
            return {
                "status": "ERROR",
                "error_code": "INVALID_TOOL_INPUT",
                "message": str(error)
            }
        if tool.handler is None:
            return {
                "status": "ERROR",
                "error_code": "TOOL_NOT_CONFIGURED",
                "message": "Công cụ chưa được nối với Backend hoặc service xử lý."
            }
        metadata = {
            "tool_name": tool.name,
            "request_id": request_id
        }
        try:
            result = await tool.handler(
                args,
                context,
                metadata
            )
            return {
                "status": "SUCCESS",
                "data": self._normalize_output(result)
            }
        except AIBackendException as error:
            return {
                "status": "ERROR",
                "error_code": "BACKEND_ERROR",
                "message": str(error)
            }
        except Exception:
            return {
                "status": "ERROR",
                "error_code": "TOOL_EXECUTION_ERROR",
                "message": "Công cụ không thể hoàn thành yêu cầu hiện tại."
            }

    def validate_input(
        self,
        tool: ToolDefinition,
        arguments: dict[str, Any]
    ) -> None:
        schema = tool.input_schema or {}
        required = schema.get("required", [])
        for field_name in required:
            if (
                field_name not in arguments
                or arguments[field_name] in (None, "")
            ):
                raise AIValidationException(
                    f"Thiếu tham số bắt buộc: {field_name}"
                )
        properties = schema.get("properties", {})
        for field_name, value in arguments.items():
            if field_name not in properties:
                continue
            self._validate_value(
                field_name,
                value,
                properties[field_name]
            )

    def _validate_value(
        self,
        field_name: str,
        value: Any,
        schema: dict[str, Any]
    ) -> None:
        expected = schema.get("type")
        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "object": dict,
            "array": list
        }
        if (
            expected in type_map
            and not isinstance(value, type_map[expected])
        ):
            raise AIValidationException(
                f"Tham số {field_name} không đúng kiểu dữ liệu."
            )
        if expected == "integer" and isinstance(value, bool):
            raise AIValidationException(
                f"Tham số {field_name} không đúng kiểu dữ liệu."
            )
        if expected == "number" and isinstance(value, bool):
            raise AIValidationException(
                f"Tham số {field_name} không đúng kiểu dữ liệu."
            )
        if (
            isinstance(value, str)
            and schema.get("maxLength") is not None
            and len(value) > int(schema["maxLength"])
        ):
            raise AIValidationException(
                f"Tham số {field_name} vượt quá độ dài cho phép."
            )
        if (
            isinstance(value, (int, float))
            and schema.get("maximum") is not None
            and value > float(schema["maximum"])
        ):
            raise AIValidationException(
                f"Tham số {field_name} vượt quá giới hạn cho phép."
            )
        if schema.get("enum") and value not in schema["enum"]:
            raise AIValidationException(
                f"Tham số {field_name} không thuộc tập giá trị cho phép."
            )

    @staticmethod
    def _normalize_output(value: Any) -> Any:
        if isinstance(value, dict):
            return value
        if isinstance(value, list):
            return {"items": value}
        return {"value": value}

    @staticmethod
    def _validate_definition(tool: ToolDefinition) -> None:
        if not tool.name or not tool.name.replace("_", "").isalnum():
            raise AIValidationException("Tên tool không hợp lệ.")
        if tool.operation not in {
            TOOL_OPERATION_READ,
            TOOL_OPERATION_WRITE
        }:
            raise AIValidationException(
                "Loại thao tác của tool không hợp lệ."
            )
        if (
            tool.operation == TOOL_OPERATION_WRITE
            and not tool.requires_confirmation
        ):
            raise AIValidationException(
                "Tool WRITE phải yêu cầu xác nhận."
            )


def _tool_defs() -> list[ToolDefinition]:
    return [
        ToolDefinition(
            "tim_kiem_sach",
            "Tìm sách trong hệ thống BookFlow theo từ khóa và bộ lọc được phép.",
            {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "maxLength": 500
                    },
                    "filters": {
                        "type": "object"
                    },
                    "limit": {
                        "type": "integer",
                        "maximum": 20
                    }
                },
                "required": ["query"]
            },
            {
                "type": "object",
                "properties": {
                    "books": {
                        "type": "array"
                    }
                }
            },
            ["sach.xem"],
            [
                TOOL_SCOPE_PUBLIC,
                TOOL_SCOPE_ORGANIZATION,
                TOOL_SCOPE_BRANCH,
                TOOL_SCOPE_PERMITTED
            ]
        ),
        ToolDefinition(
            "lay_chi_tiet_sach",
            "Lấy thông tin chi tiết của một sách.",
            {
                "type": "object",
                "properties": {
                    "book_id": {
                        "type": "integer"
                    }
                },
                "required": ["book_id"]
            },
            {
                "type": "object"
            },
            ["sach.xem"],
            [
                TOOL_SCOPE_PUBLIC,
                TOOL_SCOPE_ORGANIZATION,
                TOOL_SCOPE_BRANCH,
                TOOL_SCOPE_PERMITTED
            ]
        ),
        ToolDefinition(
            "lay_ton_kho",
            "Tra cứu tồn kho hiện tại của sách trong phạm vi được Backend cho phép.",
            {
                "type": "object",
                "properties": {
                    "book_id": {
                        "type": "integer"
                    },
                    "chi_nhanh_id": {
                        "type": "integer"
                    },
                    "kho_id": {
                        "type": "integer"
                    }
                },
                "required": ["book_id"]
            },
            {
                "type": "object"
            },
            ["ton_kho.xem"],
            [
                TOOL_SCOPE_ORGANIZATION,
                TOOL_SCOPE_BRANCH,
                TOOL_SCOPE_WAREHOUSE,
                TOOL_SCOPE_PERMITTED
            ]
        ),
        ToolDefinition(
            "lay_chi_tiet_don_hang",
            "Tra cứu chi tiết đơn hàng trong phạm vi được phép.",
            {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "integer"
                    }
                },
                "required": ["order_id"]
            },
            {
                "type": "object"
            },
            ["don_hang.xem"],
            [
                TOOL_SCOPE_SELF,
                TOOL_SCOPE_ORGANIZATION,
                TOOL_SCOPE_BRANCH,
                TOOL_SCOPE_PERMITTED
            ]
        ),
        ToolDefinition(
            "lay_trang_thai_don_hang",
            "Tra cứu trạng thái hiện tại của đơn hàng.",
            {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "integer"
                    }
                },
                "required": ["order_id"]
            },
            {
                "type": "object"
            },
            ["don_hang.xem"],
            [
                TOOL_SCOPE_SELF,
                TOOL_SCOPE_ORGANIZATION,
                TOOL_SCOPE_BRANCH,
                TOOL_SCOPE_PERMITTED
            ]
        ),
        ToolDefinition(
            "lay_bao_cao",
            "Lấy báo cáo nghiệp vụ trong phạm vi được phân quyền.",
            {
                "type": "object",
                "properties": {
                    "loai_bao_cao": {
                        "type": "string",
                        "maxLength": 100
                    },
                    "tu_ngay": {
                        "type": "string",
                        "maxLength": 30
                    },
                    "den_ngay": {
                        "type": "string",
                        "maxLength": 30
                    },
                    "filters": {
                        "type": "object"
                    }
                },
                "required": ["loai_bao_cao"]
            },
            {
                "type": "object"
            },
            ["bao_cao.xem"],
            [
                TOOL_SCOPE_ORGANIZATION,
                TOOL_SCOPE_BRANCH,
                TOOL_SCOPE_WAREHOUSE,
                TOOL_SCOPE_PERMITTED
            ]
        ),
        ToolDefinition(
            "tim_kiem_khach_hang",
            "Tìm khách hàng theo dữ liệu được phép truy cập.",
            {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "maxLength": 300
                    },
                    "limit": {
                        "type": "integer",
                        "maximum": 20
                    }
                },
                "required": ["query"]
            },
            {
                "type": "object",
                "properties": {
                    "customers": {
                        "type": "array"
                    }
                }
            },
            ["khach_hang.xem"],
            [
                TOOL_SCOPE_ORGANIZATION,
                TOOL_SCOPE_BRANCH,
                TOOL_SCOPE_PERMITTED
            ]
        )
    ]


def tao_tool_registry_mac_dinh(
    backend_client: Any | None = None
) -> ToolRegistry:
    registry = ToolRegistry()
    if os.getenv("AI_TOOLS_ENABLED", "false").strip().lower() not in {"1", "true", "yes"}:
        return registry
    if backend_client is None:
        try:
            import app.integrations.backend_client as backend_module
            backend_client = getattr(
                backend_module,
                "backend_client",
                None
            )
            if (
                backend_client is None
                and hasattr(backend_module, "get_backend_client")
            ):
                backend_client = backend_module.get_backend_client()
        except Exception:
            backend_client = None
    base_path = str(
        os.getenv(
            "AI_BACKEND_TOOL_BASE_PATH",
            "/api/internal/ai/tools"
        )
    ).rstrip("/")
    for tool in _tool_defs():
        path = str(
            os.getenv(
                f"AI_TOOL_{tool.name.upper()}_PATH",
                f"{base_path}/{tool.name}"
            )
        )
        if backend_client is not None:
            registry.register_backend_tool(
                tool,
                backend_client,
                path
            )
        else:
            registry.register(tool)
    return registry


tool_registry = tao_tool_registry_mac_dinh()


__all__ = [
    "ToolDefinition",
    "ToolCall",
    "ToolRegistry",
    "BackendToolExecutor",
    "tao_tool_registry_mac_dinh",
    "tool_registry"
]