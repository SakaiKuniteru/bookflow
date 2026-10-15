export const catalogStatuses = Object.freeze({
  books: { active: "DANG_HIEN_THI", inactive: "NGUNG_KINH_DOANH" },
  authors: { active: "DANG_DUNG", inactive: "NGUNG_DUNG" },
  genres: { active: "DANG_DUNG", inactive: "NGUNG_DUNG" },
  publishers: { active: "DANG_DUNG", inactive: "NGUNG_DUNG" },
  versions: { active: "DANG_DUNG", inactive: "TAM_NGUNG" },
  warehouses: { active: "DANG_HOAT_DONG", inactive: "NGUNG_HOAT_DONG" },
  suppliers: { active: "DANG_HOP_TAC", inactive: "TAM_NGUNG" },
  memberships: { active: "HOAT_DONG", inactive: "TAM_KHOA" },
});

export const catalogStatusRoutes = Object.freeze({
  books: "/trang-thai",
  authors: "/trang-thai",
  genres: "/trang-thai",
  publishers: "/trang-thai",
  versions: "/trang-thai",
  memberships: "/trang-thai",
});

export const catalogDefaultActiveOnCreate = Object.freeze({
  books: true,
  authors: true,
  genres: true,
  publishers: true,
  versions: true,
  warehouses: true,
  suppliers: true,
  memberships: true,
});

export function statusForActiveValue(pageKey, active) {
  const status = catalogStatuses[pageKey];
  return status ? (active ? status.active : status.inactive) : null;
}

export function activeStatusChange(pageKey, active, currentStatus) {
  const target = statusForActiveValue(pageKey, active);
  return target && target !== currentStatus ? target : null;
}
