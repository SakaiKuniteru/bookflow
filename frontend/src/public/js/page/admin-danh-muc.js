import {
  closeModal,
  openModal,
  setModalLoading,
} from "/js/components/modals.js?v=20261010-2";
import { setSelectDisabled, syncSelect } from "/js/components/forms/select.js";
import {
  applyServerFieldErrors,
  bindInlineValidation,
  validateForm,
} from "/js/components/forms/validation.js?v=20261014-1";
import { initDataTables } from "/js/components/tables.js?v=20261010-3";
import { bindApiTable } from "/js/components/api-table.js?v=20261013-1";
import {
  catalogDefaultActiveOnCreate,
  catalogStatuses,
  catalogStatusRoutes,
} from "/js/page/catalog-status.js?v=20261014-1";

const page = document.querySelector("[data-catalog-page]");

if (page) {
  const table = page.querySelector("[data-bf-table]");
  const tableBody = table?.querySelector("[data-bf-table-body]");
  const emptyState = table?.querySelector("[data-bf-table-empty]");
  const formModal = document.querySelector("#catalog-form-modal");
  const form = document.querySelector("[data-catalog-form]");
  const viewModal = document.querySelector("#catalog-view-modal");
  const viewDetails = viewModal?.querySelector("[data-catalog-view-details]");
  const formError = form?.querySelector("[data-catalog-form-error]");
  const formNotice = form?.querySelector("[data-catalog-form-notice]");
  const actionModal = document.createElement("div");
  actionModal.className = "bf-modal";
  actionModal.dataset.bfModal = "";
  actionModal.dataset.modalSize = "sm";
  actionModal.dataset.closeOnBackdrop = "true";
  actionModal.dataset.loading = "false";
  actionModal.setAttribute("role", "dialog");
  actionModal.setAttribute("aria-modal", "true");
  actionModal.setAttribute("aria-hidden", "true");
  actionModal.setAttribute("aria-labelledby", "catalog-action-title");
  actionModal.hidden = true;
  actionModal.innerHTML = `<button type="button" class="bf-modal-backdrop" data-bf-modal-backdrop aria-label="Đóng cửa sổ"></button><section class="bf-modal-dialog"><header class="bf-modal-header"><div class="bf-modal-heading"><h2 id="catalog-action-title" class="bf-modal-title" data-catalog-action-title>Xác nhận thao tác</h2><p class="bf-modal-description">Kiểm tra lại trước khi tiếp tục.</p></div><button type="button" class="bf-modal-close" data-bf-modal-close aria-label="Đóng">×</button></header><div class="bf-modal-body"><div class="bf-modal-confirm bf-modal-confirm-danger"><p class="bf-modal-confirm-message" data-catalog-action-message></p></div><p class="bf-form-error" data-catalog-action-error role="alert" hidden></p></div><footer class="bf-modal-footer"><button type="button" class="bf-btn bf-btn-secondary bf-btn-md" data-bf-modal-close>Hủy</button><div class="bf-modal-footer-actions"><button type="button" class="bf-btn bf-btn-danger bf-btn-md" data-bf-modal-submit data-catalog-action-confirm>Tiếp tục</button></div></footer><div class="bf-modal-loading-overlay" data-bf-modal-loading-overlay hidden><span class="bf-ui-spinner" aria-hidden="true"></span><span>Đang xử lý...</span></div></section></div>`;
  document.body.appendChild(actionModal);
  let pendingAction = null;
  const laTrangTacGia = page.dataset.pageKey === "authors";
  const coApiGhi = [
    "books",
    "authors",
    "genres",
    "publishers",
    "warehouses",
    "memberships",
    "versions",
    "suppliers",
  ].includes(page.dataset.pageKey);
  const rowsKey = String(page.dataset.rowsKey || "");
  const endpoint = page.dataset.endpoint;
  const pageTitle =
    document.querySelector(".bf-admin-page-heading h1")?.textContent?.trim() ||
    document.title.split("|")[0].trim();
  const defaultEmptyTitle =
    emptyState?.querySelector("strong")?.textContent ||
    "Chưa có dữ liệu để hiển thị";
  const defaultEmptyDescription =
    emptyState?.querySelector("[data-table-empty-description]")?.textContent ||
    "Dữ liệu sẽ xuất hiện tại đây.";
  let records = [];
  let busy = false;

  const normalizeApiData = (value) => value;
  const request = async (url) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || result?.success === false) {
      const error = new Error(
        result?.error?.message || "Không tải được dữ liệu.",
      );
      error.details = result?.error?.details || [];
      throw error;
    }
    return normalizeApiData(result?.data ?? result);
  };
  const statusLabels = {
    DANG_DUNG: "Đang dùng",
    TAM_AN: "Tạm ẩn",
    NGUNG_DUNG: "Ngừng dùng",
    TAM_NGUNG: "Tạm ngưng",
    NGUNG_HOP_TAC: "Ngừng hợp tác",
    DANG_HOP_TAC: "Đang hợp tác",
    NGUNG_CUNG_UNG: "Ngừng cung ứng",
    DANG_CUNG_UNG: "Đang cung ứng",
    TIEM_NANG: "Tiềm năng",
    DANH_SACH_DEN: "Danh sách đen",
    DANG_HOAT_DONG: "Đang hoạt động",
    CHUAN_BI: "Chuẩn bị",
    DANG_KIEM_KE: "Đang kiểm kê",
    NGUNG_HOAT_DONG: "Ngừng hoạt động",
    NHAP: "Bản nháp",
    CHO_DUYET: "Chờ duyệt",
    DANG_HIEN_THI: "Đang hiển thị",
    NGUNG_KINH_DOANH: "Ngừng kinh doanh",
    NGUNG_PHAT_HANH: "Ngừng phát hành",
    HOAT_DONG: "Hoạt động",
    TAM_KHOA: "Tạm khóa",
    HET_HAN: "Hết hạn",
    SACH: "Sách",
    TRUYEN_TRANH: "Truyện tranh",
    GIAO_TRINH: "Giáo trình",
    TAP_CHI: "Tạp chí",
    SACH_IN: "Sách in",
    EBOOK: "Ebook",
    SACH_NOI: "Sách nói",
    BIA_MEM: "Bìa mềm",
    BIA_CUNG: "Bìa cứng",
    BIA_GAP: "Bìa gập",
    TONG_HOP: "Tổng hợp",
    BAN_HANG: "Bán hàng",
    DU_TRU: "Dự trữ",
    TRUNG_CHUYEN: "Trung chuyển",
    NHAN_HANG: "Nhận hàng",
    TRA_HANG: "Trả hàng",
    CACH_LY: "Cách ly",
    KY_GUI: "Ký gửi",
    SO_HUU: "Sở hữu",
    THUE: "Thuê",
    THUE_NGOAI: "Thuê ngoài",
    DOI_TAC: "Đối tác",
    FIFO: "FIFO",
    FEFO: "FEFO",
    THU_CONG: "Thủ công",
    CA_NHAN: "Cá nhân",
    HO_KINH_DOANH: "Hộ kinh doanh",
    DOANH_NGHIEP: "Doanh nghiệp",
    NHA_XUAT_BAN: "Nhà xuất bản",
    NHA_PHAN_PHOI: "Nhà phân phối",
    TIEN_MAT: "Tiền mặt",
    CHUYEN_KHOAN: "Chuyển khoản",
    CONG_NO: "Công nợ",
  };
  const statusForPage = catalogStatuses;
  const statusRoute = catalogStatusRoutes;
  const formatDate = (value) => {
    if (!value) return "";
    const text = String(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return text;
    return `${match[3]}/${match[2]}/${match[1]}`;
  };
  const formatValue = (value, key = "") => {
    if (value == null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Có" : "Không";
    if (Array.isArray(value))
      return value.map((item) => formatValue(item)).join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    const text = String(value);
    if (
      /^(ngay|thoiDiem|hieuLuc)/i.test(key) &&
      /^\d{4}-\d{2}-\d{2}/.test(text)
    )
      return formatDate(text);
    return statusLabels[text] || text;
  };
  const rawValue = (value) =>
    value == null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  const setEmpty = (title, description) => {
    if (!emptyState) return;
    const heading = emptyState.querySelector("strong");
    const detail = emptyState.querySelector("[data-table-empty-description]");
    if (heading) heading.textContent = title;
    if (detail) detail.textContent = description;
    emptyState.hidden = false;
  };
  const makeAction = (type, record) => {
    const status = statusForPage[page.dataset.pageKey];
    const isActive = record.trangThai === status?.active;
    const configs = {
      view: {
        label: `Xem chi tiết ${pageTitle.toLocaleLowerCase("vi")}`,
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
      },
      edit: {
        label: `Chỉnh sửa ${pageTitle.toLocaleLowerCase("vi")}`,
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z"></path></svg>',
      },
      toggle: {
        label: `${isActive ? "Tắt hiệu lực" : "Kích hoạt"} ${pageTitle.toLocaleLowerCase("vi")}`,
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"></path><path d="M12 7v5l3 2"></path><path d="M16 4h5v5"></path></svg>',
      },
      delete: {
        label: `Xóa ${pageTitle.toLocaleLowerCase("vi")}`,
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg>',
      },
    };
    const button = document.createElement("button");
    button.type = "button";
    button.className = `bf-branch-icon-action bf-branch-icon-${type}`;
    button.dataset.catalogAction = type;
    button.dataset.catalogId = String(record.id);
    button.setAttribute("aria-label", configs[type].label);
    button.title = configs[type].label;
    button.innerHTML = configs[type].svg;
    return button;
  };
  const columnHeaders = () =>
    [...table.querySelectorAll("thead tr:first-child th")].map((header) => ({
      key: header.dataset.columnKey,
      type: header.dataset.sortType || "text",
      label:
        header.querySelector(".bf-table-sort span")?.textContent?.trim() ||
        header.textContent.trim(),
    }));
  const sortedRows = (rows) => {
    const key = table.dataset.sort;
    const direction = table.dataset.order === "desc" ? -1 : 1;
    const header = columnHeaders().find((item) => item.key === key);
    if (!header || !key || key === "actions" || key === "stt") return rows;
    return [...rows].sort((left, right) => {
      const a = left?.[key];
      const b = right?.[key];
      if (a == null || a === "") return b == null || b === "" ? 0 : 1;
      if (b == null || b === "") return -1;
      if (header.type === "number") return (Number(a) - Number(b)) * direction;
      if (header.type === "date")
        return (new Date(a).getTime() - new Date(b).getTime()) * direction;
      return (
        String(a).localeCompare(String(b), "vi", {
          numeric: true,
          sensitivity: "base",
        }) * direction
      );
    });
  };
  const renderRow = (record, index, headers) => {
    const row = document.createElement("tr");
    row.dataset.tableRow = "true";
    row.dataset.catalogRecord = JSON.stringify(record);
    row.dataset.searchText = Object.values(record).map(rawValue).join(" ");
    row.dataset.filterValues = "{}";
    headers.forEach(({ key }) => {
      const cell = document.createElement("td");
      cell.dataset.columnKey = key;
      if (key === "actions") {
        cell.className = "bf-branch-row-actions";
        cell.append(
          makeAction("view", record),
          makeAction("edit", record),
          makeAction("toggle", record),
          makeAction("delete", record),
        );
      } else if (laTrangTacGia && key === "anhDaiDienTepId") {
        const value = record[key];
        if (value) {
          const image = document.createElement("img");
          image.className = "bf-author-avatar";
          image.src = `/api/tep-tin/${encodeURIComponent(value)}/noi-dung`;
          image.alt = `Ảnh tác giả ${record.tenHienThi || record.hoTen || ""}`;
          image.loading = "lazy";
          cell.appendChild(image);
        } else {
          cell.textContent = "—";
        }
        cell.dataset.searchValue = rawValue(value);
        cell.dataset.sortValue = rawValue(value);
      } else {
        const value = key === "stt" ? index : record[key];
        const display = key === "stt" ? String(index) : formatValue(value, key);
        cell.textContent = display;
        cell.dataset.searchValue = rawValue(value);
        cell.dataset.sortValue = rawValue(value);
      }
      row.appendChild(cell);
    });
    return row;
  };
  const renderRows = (items, offset = 0) => {
    const headers = columnHeaders();
    const ordered = sortedRows(items);
    tableBody.replaceChildren(
      ...ordered.map((record, index) =>
        renderRow(record, offset + index + 1, headers),
      ),
    );
    table.dataset.loading = "false";
    if (emptyState) {
      emptyState.hidden = ordered.length > 0;
      if (!ordered.length) setEmpty(defaultEmptyTitle, defaultEmptyDescription);
    }
  };
  const readFilters = () => {
    const values = {};
    table.querySelectorAll("[data-bf-table-filter]").forEach((filter) => {
      filter.querySelectorAll("input, select, textarea").forEach((input) => {
        if (!input.name || input.disabled) return;
        if (input.type === "checkbox") {
          if (input.checked) values[input.name] = input.value;
          return;
        }
        if (
          input.type === "hidden" &&
          !input.closest(".bf-select-hidden-values")
        )
          return;
        if (input.value !== "") values[input.name] = input.value;
      });
    });
    return values;
  };
  const apiTable = bindApiTable(table, {
    endpoint,
    rowsKeys: [rowsKey],
    paginationKeys: ["phanTrang"],
    queryNames: { page: "trang", pageSize: "kichThuoc", search: "tuKhoa" },
    extraParams: (state) => state.filters || readFilters(),
    normalize: normalizeApiData,
    onRows(items, { offset }) {
      records = items;
      renderRows(items, offset);
    },
    onError(error) {
      records = [];
      tableBody.replaceChildren();
      table.dataset.loading = "false";
      setEmpty(
        `Không tải được ${pageTitle.toLocaleLowerCase("vi")}`,
        error.message || "Vui lòng kiểm tra quyền truy cập rồi thử lại.",
      );
    },
  });

  const getFieldValue = (field, record) => {
    if (!field) return undefined;
    const name = field.dataset.name || field.name;
    if (!name) return undefined;
    const parts = name.split(".");
    const value = parts.reduce((current, part) => current?.[part], record);
    return value;
  };
  const setSelectValue = (select, value) => {
    if (!select) return;
    const normalized = new Set(
      (Array.isArray(value) ? value : [value])
        .filter((item) => item != null)
        .map(String),
    );
    select.querySelectorAll(".bf-select-option").forEach((option) => {
      const selected = normalized.has(option.dataset.value);
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-selected", String(selected));
    });
    syncSelect(select);
  };
  const getSelectedValues = (select) =>
    [...(select?.querySelectorAll(".bf-select-option.is-selected") || [])].map(
      (option) => String(option.dataset.value || ""),
    );
  const replaceOptions = (select, items, preserve = true) => {
    if (!select) return;
    const previous = preserve ? getSelectedValues(select) : [];
    const optionsBox = select.querySelector(".bf-select-options");
    if (!optionsBox) return;
    optionsBox.replaceChildren(
      ...items.map((item) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "bf-select-option";
        option.dataset.value = String(item.value ?? "");
        option.dataset.label = String(item.label ?? item.value ?? "");
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        const label = document.createElement("span");
        label.className = "bf-select-option-label";
        label.textContent = option.dataset.label;
        const check = document.createElement("span");
        check.className = "bf-select-check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = "✓";
        option.append(label, check);
        return option;
      }),
    );
    select
      .querySelectorAll(".bf-select-option")
      .forEach((option) =>
        option.classList.toggle(
          "is-selected",
          previous.includes(option.dataset.value),
        ),
      );
    syncSelect(select);
  };
  const rowsFrom = (data, rowsKey) => {
    if (Array.isArray(data)) return data;
    const candidate = rowsKey ? data?.[rowsKey] : null;
    if (Array.isArray(candidate)) return candidate;
    return Object.values(data || {}).find(Array.isArray) || [];
  };
  const fetchAllOptions = async (url, rowsKey) => {
    const first = await request(
      `${url}${url.includes("?") ? "&" : "?"}trang=1&kichThuoc=100`,
    );
    const pagination = first?.phanTrang || {};
    const pages = Math.max(1, Math.min(100, Number(pagination.tongTrang) || 1));
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, index) =>
        request(
          `${url}${url.includes("?") ? "&" : "?"}trang=${index + 2}&kichThuoc=100`,
        ),
      ),
    );
    return [first, ...rest].flatMap((data) => rowsFrom(data, rowsKey));
  };
  let countriesDataPromise;
  let locationDataPromise;
  const getCountriesData = () =>
    (countriesDataPromise ||= fetch("/data/dia-chi/countries.json", {
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Không tải được quốc gia.");
        return response.json();
      })
      .then((countries) => countries.data || []));
  const getLocationData = () =>
    (locationDataPromise ||= Promise.all([
      getCountriesData(),
      fetch("/data/dia-chi/provinces.json", {
        credentials: "same-origin",
      }).then((response) => {
        if (!response.ok) throw new Error("Không tải được tỉnh/thành.");
        return response.json();
      }),
      fetch("/data/dia-chi/wards.json", { credentials: "same-origin" }).then(
        (response) => {
          if (!response.ok) throw new Error("Không tải được xã/phường.");
          return response.json();
        },
      ),
    ]).then(([countries, provinces, wards]) => ({
      countries,
      provinces: provinces.data || [],
      wards: wards.data || [],
    })));
  const addressGroupSelects = (group) => [
    ...form.querySelectorAll(`[data-address-group="${CSS.escape(group)}"]`),
  ];
  const addressRoleSelect = (group, role) =>
    addressGroupSelects(group).find(
      (select) => select.dataset.addressRole === role,
    );
  const refreshAddressGroup = async (group, preserve = true) => {
    const data = await getLocationData();
    const country = addressRoleSelect(group, "country");
    const province = addressRoleSelect(group, "province");
    const ward = addressRoleSelect(group, "ward");
    const countryCode = getSelectedValues(country)[0] || "";
    const provinceCode = getSelectedValues(province)[0] || "";
    const provinces = data.provinces.filter(
      (item) => item.countryCode === countryCode,
    );
    const wards = data.wards.filter(
      (item) =>
        item.provinceCode === provinceCode && item.countryCode === countryCode,
    );
    if (province) {
      replaceOptions(
        province,
        provinces.map((item) => ({ value: item.code, label: item.name })),
        preserve,
      );
      setSelectDisabled(province, !countryCode || provinces.length === 0);
    }
    if (ward) {
      replaceOptions(
        ward,
        wards.map((item) => ({ value: item.code, label: item.name })),
        preserve,
      );
      setSelectDisabled(ward, !provinceCode || wards.length === 0);
    }
  };
  const loadDependentOptions = async (select) => {
    const template = select?.dataset.optionsEndpoint;
    if (!template) return;
    const dependency = select.dataset.optionsDependsOn;
    const parent = dependency ? document.getElementById(dependency) : null;
    const parentValue = parent ? getSelectedValues(parent)[0] || "" : "";
    if (template.includes("{") && !parentValue) {
      replaceOptions(select, [], false);
      setSelectDisabled(select, true);
      return;
    }
    const url = template.replace(/\{[^}]+\}/g, encodeURIComponent(parentValue));
    setSelectDisabled(select, false);
    const items = await fetchAllOptions(url, select.dataset.optionsRowsKey);
    const valueKey = select.dataset.optionsValueKey || "id";
    const labelKey = select.dataset.optionsLabelKey || "ten";
    const secondaryKey = select.dataset.optionsSecondaryKey;
    replaceOptions(
      select,
      items
        .map((item) => ({
          value: item?.[valueKey],
          label: [
            item?.[labelKey] ||
              item?.hoTen ||
              item?.tenNhaCungCap ||
              item?.tenNhaPhatHanh,
            secondaryKey ? item?.[secondaryKey] : "",
          ]
            .filter(Boolean)
            .join(" — "),
        }))
        .filter((item) => item.value != null && item.label),
    );
  };
  const loadCatalogFormOptions = async () => {
    if (!form) return;
    const selects = [...form.querySelectorAll("[data-bf-select]")];
    const countrySelects = selects.filter(
      (select) => select.dataset.addressRole === "country",
    );
    if (countrySelects.length) {
      const countries = await getCountriesData();
      countrySelects.forEach((select) => {
        replaceOptions(
          select,
          countries.map((item) => ({ value: item.code, label: item.name })),
        );
        setSelectDisabled(select, false);
      });
    }
    await Promise.all(
      selects
        .filter(
          (select) =>
            select.dataset.optionsEndpoint &&
            !select.dataset.optionsEndpoint.includes("{"),
        )
        .map((select) =>
          loadDependentOptions(select).catch(() =>
            setSelectDisabled(select, true),
          ),
        ),
    );
    for (const group of new Set(
      selects.map((select) => select.dataset.addressGroup).filter(Boolean),
    )) {
      if (
        addressRoleSelect(group, "country") &&
        (addressRoleSelect(group, "province") ||
          addressRoleSelect(group, "ward"))
      ) {
        setSelectDisabled(addressRoleSelect(group, "province"), true);
        setSelectDisabled(addressRoleSelect(group, "ward"), true);
        await refreshAddressGroup(group, false);
      }
    }
    await Promise.all(
      selects
        .filter((select) => select.dataset.optionsEndpoint?.includes("{"))
        .map((select) =>
          loadDependentOptions(select).catch(() =>
            setSelectDisabled(select, true),
          ),
        ),
    );
  };
  const formOptionsReady = loadCatalogFormOptions().catch((error) => {
    if (formError) {
      formError.textContent =
        error.message || "Không tải được dữ liệu để chọn.";
      formError.hidden = false;
    }
  });
  const resetForm = () => {
    form.reset();
    form.dataset.recordId = "";
    form
      .querySelectorAll(
        "[data-readonly-on-edit] input, [data-readonly-on-edit] textarea, [data-readonly-on-edit] select, [data-readonly-on-edit] [data-bf-select]",
      )
      .forEach((field) => {
        if (field.matches("[data-bf-select]")) setSelectDisabled(field, false);
        else field.disabled = false;
      });
    form
      .querySelectorAll(".bf-select[data-bf-select]")
      .forEach((select) => setSelectValue(select, ""));
    for (const group of new Set(
      [...form.querySelectorAll("[data-address-group]")].map(
        (select) => select.dataset.addressGroup,
      ),
    )) {
      setSelectDisabled(addressRoleSelect(group, "country"), false);
      setSelectDisabled(addressRoleSelect(group, "province"), true);
      setSelectDisabled(addressRoleSelect(group, "ward"), true);
    }
    form
      .querySelectorAll("[data-bf-field-error]")
      .forEach((error) => error.remove());
    form
      .querySelectorAll(".is-invalid")
      .forEach((input) => input.classList.remove("is-invalid"));
    form
      .querySelectorAll("[aria-invalid]")
      .forEach((input) => input.removeAttribute("aria-invalid"));
    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }
    if (formNotice) formNotice.hidden = true;
    form.dispatchEvent(new CustomEvent("bookflow:catalog:form-reset"));
  };
  const setFormMode = async (mode, record = null) => {
    await formOptionsReady;
    resetForm();
    const editing = mode === "edit";
    form.dataset.mode = mode;
    form.dataset.recordId = editing ? String(record?.id ?? "") : "";
    form.dataset.initialStatus = editing ? String(record?.trangThai || "") : "";
    const activeControl = form.querySelector("[data-catalog-active-toggle]");
    const status = statusForPage[page.dataset.pageKey];
    const initiallyActive = editing
      ? record?.trangThai === status?.active
      : Boolean(catalogDefaultActiveOnCreate[page.dataset.pageKey]);
    if (activeControl) {
      activeControl.checked = initiallyActive;
      form.dataset.initialActive = String(initiallyActive);
    }
    formModal.querySelector(".bf-modal-title").textContent = editing
      ? `Chỉnh sửa ${pageTitle.toLocaleLowerCase("vi")}`
      : `Thêm mới ${pageTitle.toLocaleLowerCase("vi")}`;
    formModal.querySelector(".bf-modal-description").textContent = laTrangTacGia
      ? "Nhập thông tin tác giả. Ảnh đại diện hỗ trợ JPEG, PNG hoặc WebP."
      : editing && page.dataset.pageKey === "memberships"
        ? "Có thể cập nhật mã và ngày hết hạn. Khách hàng và hạng được giữ theo lịch sử hội viên."
        : `Nhập thông tin ${pageTitle.toLocaleLowerCase("vi")}.`;
    formModal.querySelector("[data-bf-modal-submit]").textContent = editing
      ? "Lưu thay đổi"
      : "Thêm mới";
    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }
    if (!editing) {
      const defaults =
        page.dataset.pageKey === "books"
          ? {
              loaiTacPham: "SACH",
              laTacPhamDich: "false",
              laTacPhamDocLap: "true",
            }
          : page.dataset.pageKey === "warehouses"
            ? {
                loaiKho: "TONG_HOP",
                hinhThucSoHuu: "SO_HUU",
                phuongPhapXuatKho: "FIFO",
              }
            : {};
      for (const [name, value] of Object.entries(defaults)) {
        const select = [...form.querySelectorAll("[data-bf-select]")].find(
          (item) => item.dataset.name === name,
        );
        if (select) setSelectValue(select, value);
      }
      if (page.dataset.pageKey === "warehouses") {
        const country = addressRoleSelect("warehouse", "country");
        if (country?.querySelector('.bf-select-option[data-value="VN"]'))
          setSelectValue(country, "VN");
        await refreshAddressGroup("warehouse", false);
      }
    }
    if (!record) {
      for (const group of new Set(
        [...form.querySelectorAll("[data-address-group]")].map(
          (select) => select.dataset.addressGroup,
        ),
      )) {
        if (
          addressRoleSelect(group, "province") ||
          addressRoleSelect(group, "ward")
        )
          await refreshAddressGroup(group, false);
      }
      for (const select of form.querySelectorAll(
        "[data-options-endpoint*='{']",
      ))
        await loadDependentOptions(select).catch(() => {});
      form.dispatchEvent(
        new CustomEvent("bookflow:catalog:form-mode", {
          detail: { mode, record: null },
        }),
      );
      return;
    }
    const supplierAddress =
      page.dataset.pageKey === "suppliers"
        ? (record.diaChiNhaCungCap || record.diaChi || []).find(
            (item) => item.laMacDinh,
          ) || (record.diaChiNhaCungCap || record.diaChi || [])[0]
        : null;
    form.dataset.addressRecordId = supplierAddress?.id
      ? String(supplierAddress.id)
      : "";
    const fields = [
      ...form.querySelectorAll("input, textarea, select, [data-bf-select]"),
    ];
    const addressNameValues =
      page.dataset.pageKey === "suppliers"
        ? {
            maTinhThanh: supplierAddress?.maTinhThanh,
            diaChiChiTiet: supplierAddress?.diaChiChiTiet,
            quocGia: record.quocGia || supplierAddress?.quocGia,
            maPhuongXa: supplierAddress?.maPhuongXa,
          }
        : {};
    const applyFieldValue = (field, value) => {
      if (value === undefined || value === null) return;
      // Browsers intentionally forbid restoring a file input's value. Existing
      // uploads are restored through the companion hidden image value instead.
      if (field instanceof HTMLInputElement && field.type === "file") return;
      if (field.matches("[data-bf-select]")) {
        let selectedValue = value;
        if (field.dataset.addressRole === "country") {
          const normalized = String(value).trim().toLocaleLowerCase("vi");
          const match = field.querySelectorAll(".bf-select-option");
          const country = [...match].find(
            (option) =>
              option.dataset.value === String(value) ||
              option.dataset.label.trim().toLocaleLowerCase("vi") ===
                normalized,
          );
          if (country) selectedValue = country.dataset.value;
        }
        setSelectValue(field, selectedValue);
      } else if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else {
        if (field.matches(".bf-date-input")) {
          const text = String(value);
          if (field.dataset.dateType === "year") field.value = text.slice(0, 4);
          else {
            const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
            field.value = match ? `${match[3]}/${match[2]}/${match[1]}` : text;
          }
        } else
          field.value =
            field.type === "date" ? String(value).slice(0, 10) : String(value);
      }
    };
    const countrySelects = [
      ...form.querySelectorAll('[data-address-role="country"]'),
    ];
    fields.forEach((field) => {
      const name = field.dataset.name || field.name;
      let value = addressNameValues[name];
      if (value === undefined) value = getFieldValue(field, record);
      if (
        field.matches(
          '[data-address-role="province"], [data-address-role="ward"]',
        )
      )
        return;
      applyFieldValue(field, value);
    });
    for (const country of countrySelects) {
      const group = country.dataset.addressGroup;
      const province = addressRoleSelect(group, "province");
      const ward = addressRoleSelect(group, "ward");
      if (!province && !ward) continue;
      await refreshAddressGroup(group, false);
      const provinceValue =
        addressNameValues[province?.dataset.name] ??
        getFieldValue(province, record);
      if (provinceValue != null) setSelectValue(province, provinceValue);
      await refreshAddressGroup(group, false);
      const wardValue =
        addressNameValues[ward?.dataset.name] ?? getFieldValue(ward, record);
      if (wardValue != null) setSelectValue(ward, wardValue);
    }
    for (const select of form.querySelectorAll("[data-options-endpoint*='{']"))
      await loadDependentOptions(select).catch(() => {});
    if (page.dataset.pageKey === "books") {
      for (const relation of [
        { path: "tac-gia", field: "tacGiaId", key: "tacGiaId" },
        { path: "the-loai", field: "theLoaiId", key: "theLoaiId" },
      ]) {
        const select = [...form.querySelectorAll("[data-bf-select]")].find(
          (item) => item.dataset.name === relation.field,
        );
        const linked = rowsFrom(
          await request(
            `/api/sach/${encodeURIComponent(record.id)}/${relation.path}`,
          ),
        );
        setSelectValue(
          select,
          linked.map((item) => item[relation.key]),
        );
      }
      const imageResponse = await request(
        `/api/sach/${encodeURIComponent(record.id)}/anh`,
      );
      const images = rowsFrom(imageResponse, "anhSach").map((image) => ({
        id: image.id,
        value: image.tepDinhKemId,
        src: `/api/tep-tin/${encodeURIComponent(image.tepDinhKemId)}/noi-dung`,
      }));
      const gallery = [...form.querySelectorAll("[data-bf-image]")].find(
        (wrapper) => wrapper.dataset.multiple === "true",
      );
      gallery?.dispatchEvent(
        new CustomEvent("bookflow:image:set-existing", {
          detail: { items: images },
        }),
      );
    }
    if (editing)
      form
        .querySelectorAll(
          "[data-readonly-on-edit] input, [data-readonly-on-edit] textarea, [data-readonly-on-edit] select, [data-readonly-on-edit] [data-bf-select]",
        )
        .forEach((field) => {
          if (field.matches("[data-bf-select]")) setSelectDisabled(field, true);
          else field.disabled = true;
        });
    form.dispatchEvent(
      new CustomEvent("bookflow:catalog:form-mode", {
        detail: { mode, record },
      }),
    );
  };
  const labelFor = (key) => {
    const normalized = key.split(".").at(-1);
    const field = [...form.querySelectorAll("[data-form-field]")].find(
      (container) => {
        const control = container.querySelector(
          "input, textarea, select, [data-bf-select]",
        );
        return (
          control && (control.dataset.name || control.name || "") === normalized
        );
      },
    );
    return (
      field
        ?.querySelector(".bf-form-label")
        ?.textContent?.replace("*", "")
        .trim() ||
      columnHeaders().find((header) => header.key === normalized)?.label ||
      normalized
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (letter) => letter.toLocaleUpperCase("vi"))
    );
  };
  const flattenDetails = (value, prefix = "", output = []) => {
    if (value === null || value === undefined || value === "") return output;
    if (Array.isArray(value)) {
      output.push([
        prefix,
        value
          .map((item) =>
            typeof item === "object" ? JSON.stringify(item) : formatValue(item),
          )
          .join("; ") || "—",
      ]);
      return output;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([key, child]) =>
        flattenDetails(child, prefix ? `${prefix}.${key}` : key, output),
      );
      return output;
    }
    const lastKey = prefix.split(".").at(-1) || prefix;
    const label = labelFor(lastKey);
    const pathLabel = prefix.includes(".")
      ? `${prefix
          .split(".")
          .slice(0, -1)
          .map((part) => labelFor(part))
          .join(" · ")} · ${label}`
      : label;
    output.push([pathLabel, formatValue(value, lastKey)]);
    return output;
  };
  const renderDetails = (record) => {
    const details = laTrangTacGia ? { ...record } : record;
    if (laTrangTacGia) delete details.anhDaiDienTepId;
    const rows = flattenDetails(details);
    viewDetails.replaceChildren(
      ...rows.map(([label, value]) => {
        const field = document.createElement("div");
        field.className = "bf-form-field";
        const labelNode = document.createElement("span");
        labelNode.className = "bf-form-label";
        labelNode.textContent = label;
        const valueNode = document.createElement("p");
        valueNode.className = "bf-form-help";
        valueNode.textContent = value;
        field.append(labelNode, valueNode);
        return field;
      }),
    );
    viewDetails.dispatchEvent(
      new CustomEvent("bookflow:catalog:details-rendered", { detail: record }),
    );
  };
  const loadFilterOptions = async () => {
    const optionFilters = [
      ...table.querySelectorAll(
        "[data-bf-table-filter][data-options-endpoint]",
      ),
    ];
    await Promise.all(
      optionFilters.map(async (filter) => {
        const select = filter.querySelector("[data-bf-select]");
        const optionsBox = select?.querySelector(".bf-select-options");
        if (!select || !optionsBox) return;
        const endpoint = filter.dataset.optionsEndpoint;
        const rowsKey = filter.dataset.optionsRowsKey;
        const getItems = (data) =>
          Array.isArray(data) ? data : data?.[rowsKey] || data?.danhSach || [];
        const loadPage = async (pageNumber) => {
          const params = new URLSearchParams({
            trang: String(pageNumber),
            kichThuoc: "100",
          });
          return request(`${endpoint}?${params}`);
        };
        try {
          const firstPage = await loadPage(1);
          const pagination = firstPage?.phanTrang || {};
          const totalPages = Math.max(1, Number(pagination.tongTrang) || 1);
          const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              loadPage(index + 2),
            ),
          );
          const items = [firstPage, ...remainingPages].flatMap(getItems);
          const valueKey = filter.dataset.optionsValueKey || "id";
          const labelKey = filter.dataset.optionsLabelKey || "ten";
          const secondaryKey = filter.dataset.optionsSecondaryKey;
          const defaultOption = [
            ...optionsBox.querySelectorAll(".bf-select-option"),
          ].find((option) => option.dataset.value === "");
          const options = [
            { value: "", label: defaultOption?.dataset.label || "Tất cả" },
            ...items
              .map((item) => {
                const primary = item?.[labelKey];
                const secondary = secondaryKey ? item?.[secondaryKey] : "";
                return {
                  value: item?.[valueKey],
                  label: [primary, secondary].filter(Boolean).join(" — "),
                };
              })
              .filter((option) => option.value != null && option.label),
          ];
          optionsBox.replaceChildren(
            ...options.map((item) => {
              const option = document.createElement("button");
              option.type = "button";
              option.className = "bf-select-option";
              option.dataset.value = String(item.value);
              option.dataset.label = item.label;
              option.setAttribute("role", "option");
              option.setAttribute("aria-selected", "false");
              const label = document.createElement("span");
              label.className = "bf-select-option-label";
              label.textContent = item.label;
              const check = document.createElement("span");
              check.className = "bf-select-check";
              check.setAttribute("aria-hidden", "true");
              check.textContent = "✓";
              option.append(label, check);
              return option;
            }),
          );
          setSelectValue(select, "");
        } catch {
          filter.dataset.optionsUnavailable = "true";
        }
      }),
    );
  };

  bindInlineValidation(form);
  table.addEventListener("bookflow:table:action", async (event) => {
    if (event.detail?.action !== "create-record") return;
    await setFormMode("create");
    openModal(formModal, event.target);
  });
  const tenBanGhi = (record) =>
    [
      record.ten,
      record.tenSach,
      record.tenTacGia,
      record.tenTheLoai,
      record.tenNhaXuatBan,
      record.tenNhaCungCap,
      record.tenPhienBan,
      record.tenKho,
      record.hoTen,
      record.maDauSach,
      record.maTacGia,
      record.maTheLoai,
      record.maNhaXuatBan,
      record.maNhaCungCap,
      record.maPhienBan,
      record.maKho,
      record.maHoiVien,
    ].find((value) => typeof value === "string" && value.trim()) ||
    `#${record.id}`;
  const moXacNhanAction = (action, record, trigger) => {
    const isDelete = action === "delete";
    const status = statusForPage[page.dataset.pageKey];
    const isActive = record.trangThai === status?.active;
    const verb = isDelete ? "xóa" : isActive ? "tắt hiệu lực" : "kích hoạt";
    const button = actionModal.querySelector("[data-catalog-action-confirm]");
    pendingAction = { action, record, isActive };
    actionModal.querySelector("[data-catalog-action-title]").textContent =
      `Xác nhận ${verb} ${pageTitle.toLocaleLowerCase("vi")}`;
    actionModal.querySelector("[data-catalog-action-message]").textContent =
      isDelete
        ? `Bạn có chắc chắn muốn xóa ${pageTitle.toLocaleLowerCase("vi")} “${tenBanGhi(record)}” không? Thao tác có thể bị từ chối nếu dữ liệu đang được sử dụng.`
        : `Bạn có chắc chắn muốn ${verb} ${pageTitle.toLocaleLowerCase("vi")} “${tenBanGhi(record)}” không?`;
    actionModal.querySelector("[data-catalog-action-error]").hidden = true;
    actionModal.querySelector("[data-catalog-action-error]").textContent = "";
    button.textContent = isDelete
      ? "Xóa"
      : isActive
        ? "Tắt hiệu lực"
        : "Kích hoạt";
    button.classList.toggle("bf-btn-danger", isDelete || isActive);
    button.classList.toggle("bf-btn-primary", !isDelete && !isActive);
    actionModal
      .querySelector(".bf-modal-confirm")
      .classList.toggle("bf-modal-confirm-danger", isDelete || isActive);
    openModal(actionModal, trigger);
  };
  actionModal.addEventListener("bookflow:modal:close", () => {
    pendingAction = null;
  });
  actionModal
    .querySelector("[data-catalog-action-confirm]")
    .addEventListener("click", async () => {
      if (!pendingAction || busy) return;
      const current = pendingAction;
      const errorMessage = actionModal.querySelector(
        "[data-catalog-action-error]",
      );
      const actionButton = actionModal.querySelector(
        "[data-catalog-action-confirm]",
      );
      busy = true;
      setModalLoading(actionModal, true);
      try {
        if (current.action === "delete") {
          await ghiDuLieu(
            `${endpoint}/${encodeURIComponent(current.record.id)}`,
            "DELETE",
          );
          window.BookFlowFeedback?.toast({
            type: "success",
            message: `Đã xóa ${pageTitle.toLocaleLowerCase("vi")}.`,
          });
        } else {
          const status = statusForPage[page.dataset.pageKey];
          const suffix = statusRoute[page.dataset.pageKey] || "";
          await ghiDuLieu(
            `${endpoint}/${encodeURIComponent(current.record.id)}${suffix}`,
            "PATCH",
            {
              trangThai: current.isActive ? status.inactive : status.active,
            },
          );
          window.BookFlowFeedback?.toast({
            type: "success",
            message: `${current.isActive ? "Đã tắt hiệu lực" : "Đã kích hoạt"} ${pageTitle.toLocaleLowerCase("vi")}.`,
          });
        }
        setModalLoading(actionModal, false);
        closeModal(actionModal);
        await apiTable.load();
      } catch (error) {
        errorMessage.textContent =
          error.message || "Không thể hoàn tất thao tác. Vui lòng thử lại.";
        errorMessage.hidden = false;
        actionButton.focus();
      } finally {
        setModalLoading(actionModal, false);
        busy = false;
      }
    });
  table.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-catalog-action]");
    if (!button || busy) return;
    const record = records.find(
      (item) => String(item.id) === button.dataset.catalogId,
    );
    if (!record) return;
    if (["toggle", "delete"].includes(button.dataset.catalogAction)) {
      moXacNhanAction(button.dataset.catalogAction, record, button);
      return;
    }
    busy = true;
    try {
      const responseDetail = await request(
        `${endpoint}/${encodeURIComponent(record.id)}`,
      );
      const detail =
        page.dataset.pageKey === "authors"
          ? responseDetail?.tacGia || responseDetail?.author || responseDetail
          : responseDetail;
      if (button.dataset.catalogAction === "view") {
        renderDetails(detail);
        viewModal.querySelector(".bf-modal-title").textContent =
          `Chi tiết ${pageTitle.toLocaleLowerCase("vi")}`;
        openModal(viewModal, button);
      } else {
        await setFormMode("edit", detail);
        openModal(formModal, button);
      }
    } catch (error) {
      window.BookFlowFeedback?.toast({
        type: "error",
        message: error.message || "Không tải được chi tiết bản ghi.",
      });
    } finally {
      busy = false;
    }
  });
  const formControl = (name) =>
    [
      ...form.querySelectorAll(
        "input:not(.bf-select-search-input), textarea, select, [data-bf-select]",
      ),
    ].find((control) => (control.dataset.name || control.name) === name) ||
    null;
  const taoPayload = () => {
    const payload = {};
    for (const [name, raw] of new FormData(form).entries()) {
      if (
        raw instanceof File ||
        name.endsWith("Remove") ||
        name.endsWith("Removed[]") ||
        name === "hoatDong"
      )
        continue;
      const value = String(raw ?? "").trim();
      const control = formControl(name);
      if (!control) continue;
      if (
        control.dataset.frontendOnly === "true" ||
        control.closest('[data-frontend-only="true"]') ||
        (page.dataset.pageKey === "suppliers" &&
          ["maTinhThanh", "maPhuongXa", "diaChiChiTiet"].includes(name))
      )
        continue;
      if (
        form.dataset.mode === "edit" &&
        control?.closest("[data-readonly-on-edit]")
      )
        continue;
      const required = Boolean(
        control?.required || control?.dataset.required === "true",
      );
      if (!value) {
        if (required) payload[name] = null;
        else if (
          form.dataset.mode === "edit" &&
          !control?.matches("[data-bf-select]") &&
          !control?.matches(
            ".bf-number-input, .bf-money-input, [type=number]",
          ) &&
          name !== "thuTu"
        )
          payload[name] = null;
        continue;
      }
      if (
        control?.matches(".bf-number-input, .bf-money-input") ||
        control?.type === "number"
      ) {
        const normalized = value.replace(/\./g, "").replace(",", ".");
        payload[name] = Number.isFinite(Number(normalized))
          ? Number(normalized)
          : value;
      } else if (
        control?.matches(".bf-date-input") &&
        control.dataset.dateType === "year"
      ) {
        payload[name] = Number(value);
      } else if (control?.matches(".bf-date-input")) {
        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        const isoDate = match ? `${match[3]}-${match[2]}-${match[1]}` : value;
        payload[name] =
          page.dataset.pageKey === "memberships" && name === "ngayHetHan"
            ? `${isoDate}T23:59:59.000Z`
            : isoDate;
      } else if (control?.matches("[data-bf-select]") && name.endsWith("Id")) {
        payload[name] = Number(value);
      } else if (value === "true" || value === "false") {
        payload[name] = value === "true";
      } else {
        payload[name] = value;
      }
    }
    form
      .querySelectorAll("[data-derived-from] .bf-date-input")
      .forEach((control) => {
        if (control.name && control.value)
          payload[control.name] = Number(control.value);
      });
    form.querySelectorAll("[data-address-label-name]").forEach((select) => {
      if (page.dataset.pageKey === "suppliers") return;
      const selected = select.querySelector(".bf-select-option.is-selected");
      if (selected)
        payload[select.dataset.addressLabelName] =
          selected.dataset.label || null;
    });
    if (
      page.dataset.pageKey === "publishers" &&
      !String(payload.tenPhapLy || "").trim()
    )
      payload.tenPhapLy = String(payload.tenNhaXuatBan || "").trim() || null;
    return payload;
  };
  const ghiDuLieu = async (url, method, payload) => {
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      const error = new Error(
        result?.error?.message || "Không lưu được dữ liệu.",
      );
      error.details = result?.error?.details || [];
      throw error;
    }
    return normalizeApiData(result?.data ?? result);
  };
  const hienThiLoiGhi = (error, fallback) => {
    const hasFieldErrors = applyServerFieldErrors(form, error);
    if (formError) {
      formError.textContent = hasFieldErrors ? "" : error?.message || fallback;
      formError.hidden = hasFieldErrors;
    }
    return hasFieldErrors;
  };
  const uploadImageFiles = async (wrapper) => {
    const input = wrapper.querySelector(".bf-image-input");
    const files = [...(input?.files || [])];
    if (!files.length) return [];
    const data = new FormData();
    data.append("phamViSoHuu", "DON_VI");
    data.append("loaiTep", wrapper.dataset.uploadType || "KHAC");
    files.forEach((file) => data.append("files", file, file.name));
    const response = await fetch("/api/tep-tin/upload", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      body: data,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      const error = new Error(
        result?.error?.message || "Không upload được ảnh.",
      );
      error.details = result?.error?.details || [];
      throw error;
    }
    const uploaded = (result?.data?.ketQua || [])
      .filter((item) => item.thanhCong && item.tep?.id)
      .map((item) => Number(item.tep.id));
    const failed = (result?.data?.ketQua || []).find((item) => !item.thanhCong);
    if (failed || uploaded.length !== files.length)
      throw new Error(failed?.loi?.message || "Có ảnh chưa upload được.");
    return uploaded;
  };
  const uploadCatalogImages = async () => {
    const galleryIds = [];
    for (const wrapper of form.querySelectorAll("[data-bf-image]")) {
      const ids = await uploadImageFiles(wrapper);
      if (!ids.length) continue;
      const target = wrapper.dataset.imageTarget;
      if (target) {
        const valueInput = wrapper.querySelector(".bf-image-value");
        if (valueInput) valueInput.value = String(ids[0]);
        wrapper.querySelector(".bf-image-delete-state").value = "false";
      } else if (page.dataset.pageKey === "books") galleryIds.push(...ids);
    }
    return galleryIds;
  };
  const syncBookLinks = async (bookId) => {
    for (const relation of [
      {
        name: "tac-gia",
        field: "tacGiaId",
        idKey: "tacGiaId",
        make: (id, index) => ({
          tacGiaId: id,
          vaiTroDongGop: "TAC_GIA",
          thuTuHienThi: index + 1,
          laNguoiDongGopChinh: index === 0,
        }),
      },
      {
        name: "the-loai",
        field: "theLoaiId",
        idKey: "theLoaiId",
        make: (id, index) => ({
          theLoaiId: id,
          laTheLoaiChinh: index === 0,
          thuTuHienThi: index,
        }),
      },
    ]) {
      const select = [...form.querySelectorAll("[data-bf-select]")].find(
        (item) => item.dataset.name === relation.field,
      );
      const desired = getSelectedValues(select)
        .map(Number)
        .filter(Number.isFinite);
      const currentResponse = await request(
        `/api/sach/${encodeURIComponent(bookId)}/${relation.name}`,
      );
      const currentItems = rowsFrom(currentResponse);
      const currentIds = new Map(
        currentItems.map((item) => [Number(item[relation.idKey]), item]),
      );
      for (const [id, item] of currentIds)
        if (!desired.includes(id))
          await fetch(
            `/api/sach/${encodeURIComponent(bookId)}/${relation.name}/${encodeURIComponent(item.id)}`,
            {
              method: "DELETE",
              credentials: "same-origin",
              headers: { Accept: "application/json" },
            },
          ).then(async (response) => {
            const result = await response.json().catch(() => null);
            if (!response.ok || result?.success === false)
              throw new Error(
                result?.error?.message ||
                  "Không cập nhật được liên kết của sách.",
              );
          });
      for (const [index, id] of desired.entries())
        if (!currentIds.has(id))
          await ghiDuLieu(
            `/api/sach/${encodeURIComponent(bookId)}/${relation.name}`,
            "POST",
            relation.make(id, index),
          );
    }
  };
  const attachBookImages = async (bookId, imageIds) => {
    if (!imageIds.length) return;
    await ghiDuLieu(`/api/sach/${encodeURIComponent(bookId)}/anh`, "POST", {
      anh: imageIds.map((id, index) => ({
        tepDinhKemId: id,
        loaiAnh: "ANH_BEN_TRONG",
        thuTu: index,
        laAnhChinh: false,
        hienThiCongKhai: true,
      })),
    });
  };
  const removeBookImages = async (bookId) => {
    const removed = [
      ...form.querySelectorAll('.bf-image-removed input[name$="Removed[]"]'),
    ];
    for (const input of removed) {
      const response = await fetch(
        `/api/sach/${encodeURIComponent(bookId)}/anh/${encodeURIComponent(input.value)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false)
        throw new Error(
          result?.error?.message || "Không xóa được ảnh đã chọn khỏi sách.",
        );
    }
  };
  const saveSupplierAddress = async (supplierId) => {
    const detail = String(formControl("diaChiChiTiet")?.value || "").trim();
    const province = addressRoleSelect("supplier", "province");
    const ward = addressRoleSelect("supplier", "ward");
    const country = addressRoleSelect("supplier", "country");
    const countryCode = getSelectedValues(country)[0] || "";
    const provinceCode = getSelectedValues(province)[0] || "";
    const wardCode = getSelectedValues(ward)[0] || "";
    const provinceOption = province?.querySelector(
      ".bf-select-option.is-selected",
    );
    const wardOption = ward?.querySelector(".bf-select-option.is-selected");
    const body = {
      maDiaChi: "TRU_SO",
      tenDiaChi: "Trụ sở",
      loaiDiaChi: "TRU_SO",
      diaChiChiTiet: detail,
      quocGia: countryCode || "VN",
      maTinhThanh: provinceCode || null,
      tenTinhThanh: provinceOption?.dataset.label || null,
      maPhuongXa: wardCode || null,
      tenPhuongXa: wardOption?.dataset.label || null,
      laMacDinh: true,
    };
    if (!detail) return;
    const addressId = form.dataset.addressRecordId;
    const url = `/api/nha-cung-cap/${encodeURIComponent(supplierId)}/dia-chi${addressId ? `/${encodeURIComponent(addressId)}` : ""}`;
    await ghiDuLieu(url, addressId ? "PATCH" : "POST", body);
  };
  const saveActiveStatus = async (saved, editing, recordId) => {
    const control = form.querySelector("[data-catalog-active-toggle]");
    const status = statusForPage[page.dataset.pageKey];
    if (!control || !status) return;
    const wasActive = editing
      ? form.dataset.initialActive === "true"
      : Boolean(catalogDefaultActiveOnCreate[page.dataset.pageKey]);
    const targetStatus = control.checked ? status.active : status.inactive;
    // Existing records need no request when their checkbox is unchanged.
    // New records can still be created in a non-active database default state
    // (for example, books start in NHAP), so compare the persisted status too.
    if (
      (editing && control.checked === wasActive) ||
      (!editing && saved?.trangThai === targetStatus)
    )
      return;
    const id = saved?.id || recordId;
    if (!id) throw new Error("Không xác định được bản ghi để đổi trạng thái.");
    const suffix = statusRoute[page.dataset.pageKey] || "";
    await ghiDuLieu(`${endpoint}/${encodeURIComponent(id)}${suffix}`, "PATCH", {
      trangThai: targetStatus,
    });
  };
  form.addEventListener("change", (event) => {
    const select = event.target.closest?.("[data-bf-select]");
    if (select?.dataset.addressRole === "country") {
      const group = select.dataset.addressGroup;
      const province = addressRoleSelect(group, "province");
      const ward = addressRoleSelect(group, "ward");
      if (province) setSelectValue(province, "");
      if (ward) setSelectValue(ward, "");
      if (province || ward) refreshAddressGroup(group, false).catch(() => {});
    } else if (select?.dataset.addressRole === "province") {
      const ward = addressRoleSelect(select.dataset.addressGroup, "ward");
      if (ward) setSelectValue(ward, "");
      refreshAddressGroup(select.dataset.addressGroup, false).catch(() => {});
    }
    if (select?.id)
      form
        .querySelectorAll(
          `[data-options-depends-on="${CSS.escape(select.id)}"]`,
        )
        .forEach((child) => {
          setSelectValue(child, "");
          loadDependentOptions(child).catch(() =>
            setSelectDisabled(child, true),
          );
        });
  });
  form.addEventListener("input", (event) => {
    const input = event.target.closest?.('[data-phone-chars-only="true"]');
    if (!input) return;
    const caret = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, caret);
    let value = input.value.replace(/\D/g, "");
    if (input.value.trimStart().startsWith("+")) value = `+${value}`;
    input.value = value;
    const nextCaret = Math.min(
      value.length,
      before.replace(/\D/g, "").length + (before.includes("+") ? 1 : 0),
    );
    try {
      input.setSelectionRange(nextCaret, nextCaret);
    } catch {}
  });
  form.addEventListener("bookflow:catalog:form-mode", (event) => {
    const record = event.detail?.record;
    form
      .querySelectorAll("[data-bf-image][data-image-target]")
      .forEach((wrapper) => {
        const key = wrapper.dataset.imageTarget;
        const value = record?.[key];
        wrapper.dispatchEvent(
          new CustomEvent("bookflow:image:set-existing", {
            detail: {
              value: value ? String(value) : "",
              src: value
                ? `/api/tep-tin/${encodeURIComponent(value)}/noi-dung`
                : "",
            },
          }),
        );
      });
  });
  form.addEventListener("submit", async (event) => {
    if (laTrangTacGia) return;
    event.preventDefault();
    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }
    if (formNotice) formNotice.hidden = true;
    if (busy) return;
    const valid = validateForm(form);
    if (!coApiGhi) {
      if (!valid && formError) {
        formError.textContent =
          "Vui lòng kiểm tra các trường được đánh dấu bên dưới.";
        formError.hidden = false;
      } else if (valid && formNotice) {
        formNotice.textContent =
          "Dữ liệu đã hợp lệ ở phía giao diện. API tạo mới/cập nhật chưa được gọi.";
        formNotice.hidden = false;
      }
      return;
    }
    busy = true;
    const submit = formModal.querySelector("[data-bf-modal-submit]");
    if (submit) submit.disabled = true;
    const editing = form.dataset.mode === "edit";
    const recordId = form.dataset.recordId;
    const method = editing ? "PATCH" : "POST";
    const url = editing
      ? `${endpoint}/${encodeURIComponent(recordId)}`
      : endpoint;
    let payload = taoPayload();
    let savedRecord = null;
    try {
      await ghiDuLieu(url, method, { ...payload, kiemTra: true });
      if (!valid) {
        if (formError) {
          formError.textContent =
            "Vui lòng kiểm tra các trường được đánh dấu bên dưới.";
          formError.hidden = false;
        }
        return;
      }
      const galleryImageIds = await uploadCatalogImages();
      payload = taoPayload();
      if (
        galleryImageIds.length ||
        form.querySelector("[data-bf-image] .bf-image-input")?.files?.length
      )
        await ghiDuLieu(url, method, { ...payload, kiemTra: true });
      const saved = (savedRecord = await ghiDuLieu(url, method, payload));
      if (page.dataset.pageKey === "books") {
        const bookId = saved.id || recordId;
        await syncBookLinks(bookId);
        await attachBookImages(bookId, galleryImageIds);
        if (editing) await removeBookImages(bookId);
      }
      if (page.dataset.pageKey === "suppliers")
        await saveSupplierAddress(saved.id || recordId);
      await saveActiveStatus(saved, editing, recordId);
      closeModal(formModal);
      window.BookFlowFeedback?.toast({
        type: "success",
        message: editing
          ? `Đã cập nhật ${pageTitle.toLocaleLowerCase("vi")}.`
          : `Đã thêm ${pageTitle.toLocaleLowerCase("vi")}.`,
      });
      await apiTable.load();
    } catch (error) {
      if (savedRecord) {
        closeModal(formModal);
        await apiTable.load().catch(() => {});
        window.BookFlowFeedback?.toast({
          type: "error",
          message: `Đã lưu ${pageTitle.toLocaleLowerCase("vi")} nhưng không hoàn tất trạng thái hoặc dữ liệu phụ: ${error.message || "Lỗi không xác định"}`,
        });
        return;
      }
      hienThiLoiGhi(error, "Không lưu được dữ liệu.");
    } finally {
      busy = false;
      if (submit) submit.disabled = false;
    }
  });
  initDataTables(document);
  loadFilterOptions().finally(() => {
    apiTable.load({ filters: readFilters() });
  });
}
