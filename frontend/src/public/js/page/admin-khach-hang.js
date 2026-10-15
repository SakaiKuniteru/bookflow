import {
  closeModal,
  openModal,
  setModalLoading,
} from "/js/components/modals.js?v=20261010-2";
import { syncSelect } from "/js/components/forms/select.js";
import {
  applyServerFieldErrors,
  bindInlineValidation,
  validateForm,
} from "/js/components/forms/validation.js?v=20261013-1";
import { initDataTables } from "/js/components/tables.js?v=20261010-3";
import { bindApiTable } from "/js/components/api-table.js?v=20261013-1";
const table = document.querySelector(".bf-customer-page [data-bf-table]");
if (table) {
  const tableBody = table.querySelector("[data-bf-table-body]");
  const emptyState = table.querySelector("[data-bf-table-empty]");
  const modal = document.querySelector("#customer-form-modal");
  const form = document.querySelector("[data-customer-form]");
  const viewModal = document.querySelector("#customer-view-modal");
  const resetPasswordModal = document.querySelector(
    "#customer-reset-password-modal",
  );
  const errorBox = form.querySelector("[data-customer-form-error]");
  const usernameInput = form.elements.namedItem("tenDangNhap");
  let customers = [];
  let customerPendingPasswordReset = null;
  let busy = false;
  const normalizeApiData = (value) => value;
  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(20000),
      ...options,
    });
    const result = await response.json();
    if (!response.ok || result?.success === false) {
      const error = new Error(
        result?.error?.message || "Yêu cầu không thành công.",
      );
      error.details = result?.error?.details || [];
      throw error;
    }
    return normalizeApiData(result.data);
  };
  const setEmpty = (title, description) => {
    if (!emptyState) return;
    const heading = emptyState.querySelector("strong");
    const detail = emptyState.querySelector("[data-table-empty-description]");
    if (heading) heading.textContent = title;
    if (detail) detail.textContent = description;
    emptyState.hidden = false;
  };
  const setSelectValue = (id, value) => {
    const select = form.querySelector(`#${id}`);
    if (!select) return;
    select.querySelectorAll(".bf-select-option").forEach((option) => {
      const selected = option.dataset.value === String(value ?? "");
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-selected", String(selected));
    });
    syncSelect(select);
  };
  const getSelectValue = (id) =>
    form.querySelector(`#${id} .bf-select-option.is-selected`)?.dataset.value ||
    "";
  const formatDate = (value) => {
    if (!value) return "";
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return year && month && day ? `${day}/${month}/${year}` : "";
  };
  const customerStatusLabel = (value) =>
    ({
      HOAT_DONG: "Hoạt động",
      TAM_KHOA: "Tạm khóa",
      NGUNG_HOAT_DONG: "Ngừng hoạt động",
    })[value] ||
    value ||
    "";
  const customerAction = (type, customerId) => {
    const config = {
      view: {
        label: "Xem khách hàng",
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
      },
      edit: {
        label: "Sửa khách hàng",
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z"></path></svg>',
      },
      "reset-password": {
        label: "Gửi mật khẩu mới",
        svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
      },
    };
    const button = document.createElement("button");
    button.type = "button";
    button.className = `bf-branch-icon-action bf-branch-icon-${type}`;
    button.dataset.customerAction = type;
    button.dataset.customerId = String(customerId);
    button.setAttribute("aria-label", config[type].label);
    button.title = config[type].label;
    button.innerHTML = config[type].svg;
    return button;
  };
  const renderCustomer = (customer, index) => {
    const values = [
      ["stt", index],
      ["maKhachHang", customer.maKhachHang],
      ["hoTen", customer.hoTen],
      ["tenDangNhap", customer.tenDangNhap],
      ["ngaySinh", formatDate(customer.ngaySinh)],
      ["diaChiChiTiet", customer.diaChiChiTiet],
      ["email", customer.email],
      ["soDienThoai", customer.soDienThoai],
      ["trangThai", customerStatusLabel(customer.trangThai)],
    ];
    const row = document.createElement("tr");
    row.dataset.tableRow = "true";
    row.dataset.customer = JSON.stringify(customer);
    row.dataset.searchText = Object.values(customer)
      .map((value) => String(value ?? ""))
      .join(" ");
    row.dataset.filterValues = "{}";
    values.forEach(([key, value]) => {
      const cell = document.createElement("td");
      cell.dataset.columnKey = key;
      cell.dataset.searchValue = String(value ?? "");
      cell.dataset.sortValue = String(value ?? "");
      cell.textContent = value ?? "";
      row.appendChild(cell);
    });
    const actions = document.createElement("td");
    actions.dataset.columnKey = "actions";
    actions.className = "bf-branch-row-actions";
    actions.append(
      customerAction("view", customer.id),
      customerAction("edit", customer.id),
    );
    if (customer.taiKhoanId)
      actions.append(customerAction("reset-password", customer.id));
    row.appendChild(actions);
    return row;
  };
  const renderCustomers = () => {
    const page = Number(table.dataset.page) || 1;
    const pageSize = Number(table.dataset.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    tableBody.replaceChildren(
      ...customers.map((customer, index) =>
        renderCustomer(customer, offset + index + 1),
      ),
    );
    table.dataset.loading = "false";
    if (emptyState) emptyState.hidden = customers.length > 0;
  };
  const apiTable = bindApiTable(table, {
    endpoint: "/api/khach-hang",
    rowsKeys: ["danhSach"],
    paginationKeys: ["phanTrang"],
    queryNames: {
      page: "trang",
      pageSize: "kichThuoc",
      search: "tuKhoa",
      sort: "sort",
      order: "order",
    },
    normalize: normalizeApiData,
    onRows(rows) {
      customers = rows;
      renderCustomers();
      if (emptyState) emptyState.hidden = rows.length > 0;
    },
    onError(error) {
      customers = [];
      renderCustomers();
      setEmpty(
        "Không tải được danh sách khách hàng",
        error.message || "Kiểm tra quyền quản lý khách hàng rồi thử lại.",
      );
    },
  });
  const loadCustomers = (state) => apiTable.load(state);
  const setFormMode = (mode, customer = null) => {
    form.reset();
    form
      .querySelectorAll("[data-bf-field-error]")
      .forEach((error) => error.remove());
    form
      .querySelectorAll(".bf-email-error, .bf-phone-error")
      .forEach((error) => {
        error.textContent = "";
        error.hidden = true;
      });
    form
      .querySelectorAll(".is-invalid")
      .forEach((field) => field.classList.remove("is-invalid"));
    form
      .querySelectorAll("[aria-invalid]")
      .forEach((field) => field.removeAttribute("aria-invalid"));
    errorBox.hidden = true;
    const editing = mode === "edit";
    form.dataset.mode = mode;
    form.dataset.customerId = editing ? String(customer.id) : "";
    modal.querySelector(".bf-modal-title").textContent = editing
      ? "Sửa thông tin khách hàng"
      : "Thêm mới khách hàng";
    modal.querySelector(".bf-modal-description").textContent = editing
      ? "Cập nhật thông tin khách hàng."
      : "Nhập thông tin khách hàng mới.";
    modal.querySelector("[data-bf-modal-submit]").textContent = editing
      ? "Lưu thay đổi"
      : "Thêm mới";
    setSelectValue("customer-gender", editing ? customer.gioiTinh : "");
    usernameInput.disabled = editing;
    usernameInput.required = !editing;
    if (editing)
      [
        "tenDangNhap",
        "hoTen",
        "email",
        "soDienThoai",
        "ngaySinh",
        "quocTich",
        "danToc",
        "moTa",
        "diaChiChiTiet",
        "quocGia",
        "tinhThanhPho",
        "phuongXa",
        "nguonKhachHang",
        "ghiChu",
      ].forEach((name) => {
        const field = form.elements.namedItem(name);
        if (field)
          field.value =
            name === "ngaySinh"
              ? formatDate(customer[name])
              : customer[name] || "";
      });
  };
  const renderCustomerDetails = (customer) => {
    const container = viewModal.querySelector("[data-customer-view-details]");
    const rows = [
      ["Mã khách hàng", customer.maKhachHang],
      ["Họ và tên", customer.hoTen],
      ["Tên đăng nhập", customer.tenDangNhap],
      ["Email", customer.email],
      ["Số điện thoại", customer.soDienThoai],
      ["Ngày sinh", formatDate(customer.ngaySinh)],
      ["Giới tính", customer.gioiTinh],
      ["Quốc tịch", customer.quocTich],
      ["Dân tộc", customer.danToc],
      ["Quốc gia", customer.quocGia],
      ["Tỉnh/thành phố", customer.tinhThanhPho],
      ["Phường/xã", customer.phuongXa],
      ["Địa chỉ chi tiết", customer.diaChiChiTiet],
      ["Nguồn khách hàng", customer.nguonKhachHang],
      ["Mô tả", customer.moTa],
      ["Trạng thái", customerStatusLabel(customer.trangThai)],
      ["Ghi chú", customer.ghiChu],
    ];
    container.replaceChildren(
      ...rows.map(([label, value]) => {
        const field = document.createElement("div");
        field.className = "bf-form-field";
        const labelNode = document.createElement("span");
        labelNode.className = "bf-form-label";
        labelNode.textContent = label;
        const valueNode = document.createElement("p");
        valueNode.className = "bf-form-help";
        valueNode.textContent = value == null ? "" : String(value);
        field.append(labelNode, valueNode);
        return field;
      }),
    );
  };
  bindInlineValidation(form);
  table.addEventListener("bookflow:table:action", async (event) => {
    if (event.detail?.action !== "create-customer") return;
    setFormMode("create");
    openModal(modal, event.target);
  });
  table.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-customer-action]");
    if (!button || busy) return;
    const customer = customers.find(
      (item) => String(item.id) === button.dataset.customerId,
    );
    if (!customer) return;
    if (button.dataset.customerAction === "reset-password") {
      customerPendingPasswordReset = customer;
      resetPasswordModal.querySelector(
        "[data-customer-reset-password-message]",
      ).textContent =
        `Gửi mật khẩu tạm mới tới ${customer.email || "email khách hàng"} của ${customer.hoTen}?`;
      openModal(resetPasswordModal, button);
      return;
    }
    busy = true;
    try {
      const detail = await request(`/api/khach-hang/${customer.id}`);
      if (button.dataset.customerAction === "view") {
        renderCustomerDetails(detail);
        openModal(viewModal, button);
      } else {
        setFormMode("edit", detail);
        openModal(modal, button);
      }
    } catch (error) {
      window.BookFlowFeedback?.toast({
        type: "error",
        message: error.message || "Không tải được thông tin khách hàng.",
      });
    } finally {
      busy = false;
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const formValid = validateForm(form);
    busy = true;
    errorBox.hidden = true;
    errorBox.textContent = "";
    const editing = form.dataset.mode === "edit";
    const value = (name) =>
      String(form.elements.namedItem(name)?.value || "").trim();
    const payload = {
      hoTen: value("hoTen"),
      email: value("email"),
      soDienThoai: value("soDienThoai") || null,
      ngaySinh: value("ngaySinh") || null,
      gioiTinh: getSelectValue("customer-gender") || null,
      quocTich: value("quocTich") || null,
      danToc: value("danToc") || null,
      moTa: value("moTa") || null,
      diaChiChiTiet: value("diaChiChiTiet") || null,
      quocGia: value("quocGia") || null,
      tinhThanhPho: value("tinhThanhPho") || null,
      phuongXa: value("phuongXa") || null,
      nguonKhachHang: value("nguonKhachHang") || null,
      ghiChu: value("ghiChu") || null,
    };
    if (!editing) {
      payload.tenDangNhap = value("tenDangNhap");
    }
    const submit = form.querySelector("[data-bf-modal-submit]");
    if (submit) submit.disabled = true;
    if (!formValid) {
      try {
        await request(
          editing
            ? `/api/khach-hang/${form.dataset.customerId}/kiem-tra`
            : "/api/khach-hang/kiem-tra-tao-moi",
          { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
        );
      } catch (error) {
        if (!applyServerFieldErrors(form, error)) {
          errorBox.textContent =
            error.message || "Không thể kiểm tra thông tin khách hàng.";
          errorBox.hidden = false;
        }
      } finally {
        busy = false;
        if (submit) submit.disabled = false;
      }
      return;
    }
    try {
      await request(
        editing
          ? `/api/khach-hang/${form.dataset.customerId}`
          : "/api/khach-hang",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      closeModal(modal);
      window.BookFlowFeedback?.toast({
        type: "success",
        message: editing
          ? "Đã cập nhật khách hàng."
          : "Đã thêm mới khách hàng.",
      });
      await loadCustomers({
        page: editing ? Number(table.dataset.page) || 1 : 1,
      });
    } catch (error) {
      if (!applyServerFieldErrors(form, error)) {
        errorBox.textContent = error.message || "Không lưu được khách hàng.";
        errorBox.hidden = false;
      }
    } finally {
      busy = false;
      if (submit) submit.disabled = false;
    }
  });
  resetPasswordModal.addEventListener(
    "bookflow:modal:confirm",
    async (event) => {
      if (
        event.detail.action !== "reset-password" ||
        !customerPendingPasswordReset ||
        busy
      )
        return;
      busy = true;
      try {
        await request(
          `/api/khach-hang/${customerPendingPasswordReset.id}/reset-mat-khau`,
          { method: "POST" },
        );
        customerPendingPasswordReset = null;
        setModalLoading(resetPasswordModal, false);
        closeModal(resetPasswordModal);
        window.BookFlowFeedback?.toast({
          type: "success",
          message: "Đã gửi mật khẩu tạm mới tới email khách hàng.",
        });
      } catch (error) {
        window.BookFlowFeedback?.toast({
          type: "error",
          message: error.message || "Không gửi được mật khẩu mới.",
        });
      } finally {
        busy = false;
        setModalLoading(resetPasswordModal, false);
      }
    },
  );
  initDataTables(document);
  loadCustomers();
}
