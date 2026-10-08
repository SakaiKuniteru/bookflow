import { closeModal, openModal } from "/js/components/modals.js";
import { syncSelect } from "/js/components/forms/select.js";
import { applyServerFieldErrors, bindInlineValidation, validateForm } from "/js/components/forms/validation.js";
import { initDataTables } from "/js/components/tables.js";
const table = document.querySelector(".bf-customer-page [data-bf-table]");
if (table) {
    const tableBody = table.querySelector("[data-bf-table-body]");
    const emptyState = table.querySelector("[data-bf-table-empty]");
    const modal = document.querySelector("#customer-form-modal");
    const form = document.querySelector("[data-customer-form]");
    const viewModal = document.querySelector("#customer-view-modal");
    const organizationField = form.querySelector("[data-customer-organization-field]");
    const organizationInput = form.elements.namedItem("ten_to_chuc");
    const errorBox = form.querySelector("[data-customer-form-error]");
    let customers = [];
    let busy = false;
    const request = async (url, options = {}) => {
        const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) }, signal: AbortSignal.timeout(20000), ...options });
        const result = await response.json();
        if (!response.ok || result?.success === false) {
            const error = new Error(result?.error?.message || "Yêu cầu không thành công.");
            error.details = result?.error?.details || [];
            throw error;
        }
        return result.data;
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
        select.querySelectorAll(".bf-select-option").forEach(option => {
            const selected = option.dataset.value === String(value ?? "");
            option.classList.toggle("is-selected", selected);
            option.setAttribute("aria-selected", String(selected));
        });
        syncSelect(select);
    };
    const getSelectValue = id => form.querySelector(`#${id} .bf-select-option.is-selected`)?.dataset.value || "";
    const updateOrganizationField = () => {
        const isOrganization = getSelectValue("customer-type") === "TO_CHUC";
        organizationField.hidden = !isOrganization;
        organizationInput.required = isOrganization;
    };
    const customerTypeLabel = value => ({ CA_NHAN: "Cá nhân", TO_CHUC: "Tổ chức" })[value] || value || "";
    const customerStatusLabel = value => ({ HOAT_DONG: "Hoạt động", TAM_KHOA: "Tạm khóa", NGUNG_HOAT_DONG: "Ngừng hoạt động" })[value] || value || "";
    const customerAction = (type, customerId) => {
        const config = {
            view: { label: "Xem khách hàng", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>' },
            edit: { label: "Sửa khách hàng", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z"></path></svg>' }
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
        const customerName = customer.loai_khach_hang === "TO_CHUC" ? customer.ten_to_chuc || customer.ho_ten || "" : customer.ho_ten || "";
        const values = [["stt", index], ["maKhachHang", customer.ma_khach_hang], ["hoTen", customerName], ["loaiKhachHang", customerTypeLabel(customer.loai_khach_hang)], ["email", customer.email], ["soDienThoai", customer.so_dien_thoai], ["trangThai", customerStatusLabel(customer.trang_thai)]];
        const row = document.createElement("tr");
        row.dataset.tableRow = "true";
        row.dataset.customer = JSON.stringify(customer);
        row.dataset.searchText = Object.values(customer).map(value => String(value ?? "")).join(" ");
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
        actions.append(customerAction("view", customer.id), customerAction("edit", customer.id));
        row.appendChild(actions);
        return row;
    };
    const renderCustomers = () => {
        tableBody.replaceChildren(...customers.map((customer, index) => renderCustomer(customer, index + 1)));
        table.dataset.loading = "false";
        table.dataset.total = String(customers.length);
        table.dispatchEvent(new CustomEvent("bookflow:table:refresh"));
        if (emptyState) emptyState.hidden = customers.length > 0;
    };
    const loadCustomers = async () => {
        try {
            const firstPage = await request("/api/khach-hang?trang=1&kich_thuoc=100");
            customers = firstPage.danh_sach || [];
            const totalPages = firstPage.phan_trang?.tong_trang || 1;
            for (let page = 2; page <= totalPages; page += 1) {
                const result = await request(`/api/khach-hang?trang=${page}&kich_thuoc=100`);
                customers.push(...(result.danh_sach || []));
            }
            renderCustomers();
        } catch (error) {
            customers = [];
            renderCustomers();
            setEmpty("Không tải được danh sách khách hàng", error.message || "Kiểm tra quyền quản lý khách hàng rồi thử lại.");
        }
    };
    const setFormMode = (mode, customer = null) => {
        form.reset();
        form.querySelectorAll("[data-bf-field-error]").forEach(error => error.remove());
        form.querySelectorAll(".is-invalid").forEach(field => field.classList.remove("is-invalid"));
        form.querySelectorAll("[aria-invalid]").forEach(field => field.removeAttribute("aria-invalid"));
        errorBox.hidden = true;
        const editing = mode === "edit";
        form.dataset.mode = mode;
        form.dataset.customerId = editing ? String(customer.id) : "";
        const code = form.elements.namedItem("ma_khach_hang");
        code.readOnly = editing;
        modal.querySelector(".bf-modal-title").textContent = editing ? "Sửa thông tin khách hàng" : "Thêm mới khách hàng";
        modal.querySelector(".bf-modal-description").textContent = editing ? "Cập nhật thông tin khách hàng." : "Nhập thông tin khách hàng mới.";
        modal.querySelector("[data-bf-modal-submit]").textContent = editing ? "Lưu thay đổi" : "Thêm mới";
        setSelectValue("customer-type", editing ? customer.loai_khach_hang : "CA_NHAN");
        setSelectValue("customer-gender", editing ? customer.gioi_tinh : "");
        if (editing) ["ma_khach_hang", "ho_ten", "ten_to_chuc", "ma_so_thue", "email", "so_dien_thoai", "nguon_khach_hang", "ghi_chu"].forEach(name => { form.elements.namedItem(name).value = customer[name] || ""; });
        updateOrganizationField();
    };
    const renderCustomerDetails = customer => {
        const container = viewModal.querySelector("[data-customer-view-details]");
        const rows = [["Mã khách hàng", customer.ma_khach_hang], ["Họ và tên", customer.ho_ten], ["Loại khách hàng", customerTypeLabel(customer.loai_khach_hang)], ["Tên tổ chức", customer.ten_to_chuc], ["Mã số thuế", customer.ma_so_thue], ["Email", customer.email], ["Số điện thoại", customer.so_dien_thoai], ["Giới tính", customer.gioi_tinh], ["Nguồn khách hàng", customer.nguon_khach_hang], ["Trạng thái", customerStatusLabel(customer.trang_thai)], ["Ghi chú", customer.ghi_chu]];
        container.replaceChildren(...rows.map(([label, value]) => {
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
        }));
    };
    bindInlineValidation(form);
    table.addEventListener("bookflow:table:action", event => {
        if (event.detail?.action !== "create-customer") return;
        setFormMode("create");
        openModal(modal, event.target);
    });
    table.addEventListener("click", async event => {
        const button = event.target.closest("[data-customer-action]");
        if (!button || busy) return;
        const customer = customers.find(item => String(item.id) === button.dataset.customerId);
        if (!customer) return;
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
            window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không tải được thông tin khách hàng." });
        } finally {
            busy = false;
        }
    });
    form.addEventListener("change", event => {
        if (event.target.closest("[data-bf-select]")?.id === "customer-type") updateOrganizationField();
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (busy || !validateForm(form)) return;
        busy = true;
        errorBox.hidden = true;
        const editing = form.dataset.mode === "edit";
        const value = name => String(form.elements.namedItem(name)?.value || "").trim();
        const payload = { loai_khach_hang: getSelectValue("customer-type") || "CA_NHAN", ho_ten: value("ho_ten"), ten_to_chuc: value("ten_to_chuc") || null, ma_so_thue: value("ma_so_thue") || null, email: value("email") || null, so_dien_thoai: value("so_dien_thoai") || null, gioi_tinh: getSelectValue("customer-gender") || null, nguon_khach_hang: value("nguon_khach_hang") || null, ghi_chu: value("ghi_chu") || null };
        if (!editing) payload.ma_khach_hang = value("ma_khach_hang");
        const submit = form.querySelector("[data-bf-modal-submit]");
        if (submit) submit.disabled = true;
        try {
            await request(editing ? `/api/khach-hang/${form.dataset.customerId}` : "/api/khach-hang", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
            closeModal(modal);
            window.BookFlowFeedback?.toast({ type: "success", message: editing ? "Đã cập nhật khách hàng." : "Đã thêm mới khách hàng." });
            await loadCustomers();
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
    initDataTables(document);
    loadCustomers();
}
