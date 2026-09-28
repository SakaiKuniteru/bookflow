from dataclasses import dataclass, field
from typing import Any

ACCESS_SCOPE_PUBLIC = "PUBLIC"
ACCESS_SCOPE_ORGANIZATION = "ORGANIZATION"
ACCESS_SCOPE_BRANCH = "BRANCH"
ACCESS_SCOPE_PRIVATE = "PRIVATE"

ACCESS_SCOPES = frozenset({
    ACCESS_SCOPE_PUBLIC,
    ACCESS_SCOPE_ORGANIZATION,
    ACCESS_SCOPE_BRANCH,
    ACCESS_SCOPE_PRIVATE
})


def _chuan_hoa_danh_sach(values: Any) -> tuple[Any, ...]:
    if values is None:
        return ()
    if not isinstance(values, (list, tuple, set)):
        values = [values]
    ket_qua = []
    da_co = set()
    for value in values:
        if value is None or value == "":
            continue
        khoa = str(value)
        if khoa in da_co:
            continue
        da_co.add(khoa)
        ket_qua.append(value)
    return tuple(ket_qua)


def _chuan_hoa_scope(values: Any) -> tuple[str, ...]:
    scopes = _chuan_hoa_danh_sach(values)
    ket_qua = []
    for value in scopes:
        scope = str(value).strip().upper()
        if scope in ACCESS_SCOPES and scope not in ket_qua:
            ket_qua.append(scope)
    return tuple(ket_qua)


@dataclass(slots=True, frozen=True)
class NguoiDungContext:
    user_id: Any = None
    don_vi_id: Any = None
    chi_nhanh_id: Any = None
    role: str | None = None
    permissions: tuple[str, ...] = field(default_factory=tuple)
    customer_id: Any = None
    employee_id: Any = None
    session_id: str | None = None
    allowed_scopes: tuple[str, ...] = field(default_factory=lambda: (ACCESS_SCOPE_PUBLIC,))
    allowed_organization_ids: tuple[Any, ...] = field(default_factory=tuple)
    allowed_branch_ids: tuple[Any, ...] = field(default_factory=tuple)
    allowed_entity_ids: tuple[Any, ...] = field(default_factory=tuple)

    @classmethod
    def tu_dict(cls, data: dict[str, Any] | None) -> "NguoiDungContext":
        data = data or {}
        don_vi_id = data.get("don_vi_id", data.get("donViId"))
        chi_nhanh_id = data.get("chi_nhanh_id", data.get("chiNhanhId"))
        allowed_organization_ids = data.get("allowed_organization_ids", data.get("allowedOrganizationIds"))
        allowed_branch_ids = data.get("allowed_branch_ids", data.get("allowedBranchIds"))
        allowed_entity_ids = data.get("allowed_entity_ids", data.get("allowedEntityIds"))
        allowed_scopes = data.get("allowed_scopes", data.get("access_scopes", data.get("accessScopes")))
        if allowed_organization_ids is None and don_vi_id is not None:
            allowed_organization_ids = [don_vi_id]
        if allowed_branch_ids is None and chi_nhanh_id is not None:
            allowed_branch_ids = [chi_nhanh_id]
        scopes = _chuan_hoa_scope(allowed_scopes)
        if not scopes:
            scopes = (ACCESS_SCOPE_PUBLIC,)
        return cls(
            user_id=data.get("user_id", data.get("userId")),
            don_vi_id=don_vi_id,
            chi_nhanh_id=chi_nhanh_id,
            role=data.get("role"),
            permissions=tuple(str(item) for item in _chuan_hoa_danh_sach(data.get("permissions"))),
            customer_id=data.get("customer_id", data.get("customerId")),
            employee_id=data.get("employee_id", data.get("employeeId")),
            session_id=data.get("session_id", data.get("sessionId")),
            allowed_scopes=scopes,
            allowed_organization_ids=_chuan_hoa_danh_sach(allowed_organization_ids),
            allowed_branch_ids=_chuan_hoa_danh_sach(allowed_branch_ids),
            allowed_entity_ids=_chuan_hoa_danh_sach(allowed_entity_ids)
        )


@dataclass(slots=True, frozen=True)
class BoLocTruyCap:
    user_id: Any = None
    role: str | None = None
    permissions: tuple[str, ...] = field(default_factory=tuple)
    allowed_scopes: tuple[str, ...] = field(default_factory=lambda: (ACCESS_SCOPE_PUBLIC,))
    allowed_organization_ids: tuple[Any, ...] = field(default_factory=tuple)
    allowed_branch_ids: tuple[Any, ...] = field(default_factory=tuple)
    allowed_entity_ids: tuple[Any, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "role": self.role,
            "permissions": list(self.permissions),
            "allowed_scopes": list(self.allowed_scopes),
            "allowed_organization_ids": list(self.allowed_organization_ids),
            "allowed_branch_ids": list(self.allowed_branch_ids),
            "allowed_entity_ids": list(self.allowed_entity_ids)
        }

    def fingerprint_data(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "role": self.role,
            "permissions": sorted(self.permissions),
            "allowed_scopes": sorted(self.allowed_scopes),
            "allowed_organization_ids": sorted((str(item) for item in self.allowed_organization_ids)),
            "allowed_branch_ids": sorted((str(item) for item in self.allowed_branch_ids)),
            "allowed_entity_ids": sorted((str(item) for item in self.allowed_entity_ids))
        }


class LocQuyenTruyCapService:
    def tao_context(self, user_context: dict[str, Any] | NguoiDungContext | None) -> NguoiDungContext:
        if isinstance(user_context, NguoiDungContext):
            return user_context
        return NguoiDungContext.tu_dict(user_context)

    def tao_bo_loc(self, user_context: dict[str, Any] | NguoiDungContext | None) -> BoLocTruyCap:
        context = self.tao_context(user_context)
        return BoLocTruyCap(
            user_id=context.user_id,
            role=context.role,
            permissions=context.permissions,
            allowed_scopes=context.allowed_scopes,
            allowed_organization_ids=context.allowed_organization_ids,
            allowed_branch_ids=context.allowed_branch_ids,
            allowed_entity_ids=context.allowed_entity_ids
        )

    def kiem_tra_metadata(self, metadata: dict[str, Any] | None, bo_loc: BoLocTruyCap) -> bool:
        metadata = metadata or {}
        scope = str(metadata.get("access_scope", metadata.get("accessScope", ACCESS_SCOPE_PUBLIC))).strip().upper()
        if scope not in bo_loc.allowed_scopes:
            return False
        if scope == ACCESS_SCOPE_PUBLIC:
            return True
        if scope == ACCESS_SCOPE_ORGANIZATION:
            don_vi_id = metadata.get("don_vi_id", metadata.get("organization_id", metadata.get("organizationId")))
            return self._nam_trong_danh_sach(don_vi_id, bo_loc.allowed_organization_ids)
        if scope == ACCESS_SCOPE_BRANCH:
            don_vi_id = metadata.get("don_vi_id", metadata.get("organization_id", metadata.get("organizationId")))
            chi_nhanh_id = metadata.get("chi_nhanh_id", metadata.get("branch_id", metadata.get("branchId")))
            if not self._nam_trong_danh_sach(don_vi_id, bo_loc.allowed_organization_ids):
                return False
            return self._nam_trong_danh_sach(chi_nhanh_id, bo_loc.allowed_branch_ids)
        if scope == ACCESS_SCOPE_PRIVATE:
            entity_id = metadata.get("entity_id", metadata.get("entityId"))
            owner_id = metadata.get("owner_id", metadata.get("ownerId"))
            return self._nam_trong_danh_sach(entity_id, bo_loc.allowed_entity_ids) or self._nam_trong_danh_sach(owner_id, bo_loc.allowed_entity_ids)
        return False

    def loc_ket_qua(self, results: list[dict[str, Any]], bo_loc: BoLocTruyCap) -> list[dict[str, Any]]:
        ket_qua = []
        for result in results:
            metadata = dict(result.get("metadata") or {})
            for key in ("access_scope", "don_vi_id", "chi_nhanh_id", "entity_id", "owner_id"):
                if result.get(key) is not None:
                    metadata[key] = result[key]
            if self.kiem_tra_metadata(metadata, bo_loc):
                ket_qua.append(result)
        return ket_qua

    def tao_sql_filter(self, bo_loc: BoLocTruyCap, alias: str = "d") -> tuple[str, list[Any]]:
        dieu_kien = []
        params: list[Any] = []
        if ACCESS_SCOPE_PUBLIC in bo_loc.allowed_scopes:
            dieu_kien.append(f"{alias}.access_scope = %s")
            params.append(ACCESS_SCOPE_PUBLIC)
        if ACCESS_SCOPE_ORGANIZATION in bo_loc.allowed_scopes and bo_loc.allowed_organization_ids:
            dieu_kien.append(f"({alias}.access_scope = %s AND {alias}.don_vi_id = ANY(%s))")
            params.extend([ACCESS_SCOPE_ORGANIZATION, list(bo_loc.allowed_organization_ids)])
        if ACCESS_SCOPE_BRANCH in bo_loc.allowed_scopes and bo_loc.allowed_organization_ids and bo_loc.allowed_branch_ids:
            dieu_kien.append(f"({alias}.access_scope = %s AND {alias}.don_vi_id = ANY(%s) AND {alias}.chi_nhanh_id = ANY(%s))")
            params.extend([ACCESS_SCOPE_BRANCH, list(bo_loc.allowed_organization_ids), list(bo_loc.allowed_branch_ids)])
        if ACCESS_SCOPE_PRIVATE in bo_loc.allowed_scopes and bo_loc.allowed_entity_ids:
            dieu_kien.append(f"({alias}.access_scope = %s AND ({alias}.entity_id = ANY(%s) OR {alias}.owner_id = ANY(%s)))")
            params.extend([ACCESS_SCOPE_PRIVATE, list(bo_loc.allowed_entity_ids), list(bo_loc.allowed_entity_ids)])
        if not dieu_kien:
            return "FALSE", []
        return "(" + " OR ".join(dieu_kien) + ")", params

    def _nam_trong_danh_sach(self, value: Any, values: tuple[Any, ...]) -> bool:
        if value is None:
            return False
        value_str = str(value)
        return any(str(item) == value_str for item in values)


loc_quyen_truy_cap_service = LocQuyenTruyCapService()


def tao_loc_quyen_truy_cap(user_context: dict[str, Any] | NguoiDungContext | None) -> BoLocTruyCap:
    return loc_quyen_truy_cap_service.tao_bo_loc(user_context)