function valueOf(field) {
    if (field.matches("[data-bf-select]")) return [...field.querySelectorAll(".bf-select-option.is-selected")].map(option => option.dataset.value || "").join(",");
    if (field.type === "checkbox") return field.checked ? field.value : "";
    return String(field.value || "").trim();
}
function fieldError(field, message) {
    const container = field.closest("[data-form-field]");
    if (!container) return;
    const specificError = field.matches(".bf-email-input") ? container.querySelector(".bf-email-error") : field.matches(".bf-phone-input") ? container.querySelector(".bf-phone-error") : null;
    const error = specificError || container.querySelector("[data-bf-field-error]") || document.createElement("div");
    if (specificError) container.querySelectorAll("[data-bf-field-error]").forEach(item => item.remove());
    if (!specificError && !error.isConnected) {
        error.className = "bf-form-error";
        error.dataset.bfFieldError = "";
        error.setAttribute("role", "alert");
        const anchor = field.matches("[data-bf-select]") ? field : field.closest(".bf-input-icon-wrap, .bf-phone-control") || field;
        anchor.insertAdjacentElement("afterend", error);
    }
    field.classList.toggle("is-invalid", Boolean(message));
    field.setAttribute("aria-invalid", String(Boolean(message)));
    if (field.matches("[data-bf-select]")) field.querySelector(".bf-select-control")?.setAttribute("aria-invalid", String(Boolean(message)));
    error.textContent = message || "";
    error.hidden = !message;
    return error;
}
function fieldByName(form, name) {
    const camelName = name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const snakeName = name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const names = [...new Set([name, camelName, snakeName])];
    for (const candidate of names) {
        const customSelect = [...form.querySelectorAll("[data-bf-select]")].find(item => item.dataset.name === candidate || item.id === candidate);
        if (customSelect) return customSelect;
        let field = form.elements.namedItem(candidate);
        if (field && typeof field.length === "number" && !field.nodeType) field = field[0];
        if (field?.matches('input[type="hidden"].bf-phone-value')) field = field.closest("[data-form-field]")?.querySelector(".bf-phone-input");
        if (field) return field;
        const dataField = [...form.querySelectorAll("[data-name]")].find(item => item.dataset.name === candidate);
        if (dataField) return dataField;
    }
    return null;
}
function fieldByErrorMessage(form, message) {
    const aliases = [[/email|e-mail/i, ["email"]], [/tên đăng nhập|username/i, ["ten_dang_nhap", "username"]], [/họ và tên|họ tên/i, ["ho_ten", "hoTen"]], [/số điện thoại|điện thoại/i, ["so_dien_thoai", "soDienThoai"]], [/ngày sinh/i, ["ngay_sinh", "ngaySinh"]], [/giới tính/i, ["gioi_tinh", "gioiTinh"]], [/tài khoản/i, ["tai_khoan_id", "taiKhoanId"]], [/nguồn khách hàng/i, ["nguon_khach_hang", "nguonKhachHang"]], [/dân tộc/i, ["dan_toc", "danToc"]], [/quốc tịch/i, ["quoc_tich", "quocTich"]], [/quốc gia/i, ["quoc_gia", "quocGia"]], [/tỉnh(?:\/thành phố| thành phố)/i, ["tinh_thanh_pho", "tinhThanhPho"]], [/phường(?:\/xã| xã)/i, ["phuong_xa", "phuongXa"]], [/địa chỉ/i, ["dia_chi_chi_tiet", "diaChiChiTiet"]], [/mô tả/i, ["mo_ta", "moTa"]], [/ghi chú/i, ["ghi_chu", "ghiChu"]]];
    for (const [pattern, names] of aliases) {
        if (!pattern.test(message)) continue;
        for (const name of names) {
            const field = fieldByName(form, name);
            if (field) return field;
        }
    }
    return null;
}
export function applyServerFieldErrors(form, error) {
    const details = Array.isArray(error?.details) && error.details.length ? error.details : Array.isArray(error?.error?.details) ? error.error.details : [];
    const grouped = new Map();
    details.forEach(detail => {
        const field = fieldByName(form, detail.field || "") || fieldByErrorMessage(form, `${detail.field || ""} ${detail.message || ""}`);
        if (!field || !detail.message) return;
        const messages = grouped.get(field) || [];
        messages.push(detail.message);
        grouped.set(field, messages);
    });
    const summary = String(error?.message || error?.error?.message || "");
    summary.split(/\.\s+|\r?\n/).map(message => message.trim()).filter(Boolean).forEach(message => {
        const field = fieldByErrorMessage(form, message);
        if (field) grouped.set(field, [...(grouped.get(field) || []), message]);
    });
    let applied = 0;
    grouped.forEach((serverMessages, field) => {
        const container = field.closest("[data-form-field]");
        if (!container) return;
        const existing = field.matches(".bf-email-input") ? container.querySelector(".bf-email-error") : field.matches(".bf-phone-input") ? container.querySelector(".bf-phone-error") : container.querySelector("[data-bf-field-error]");
        const messages = [existing && !existing.hidden ? existing.textContent.trim() : "", ...serverMessages].filter(Boolean);
        const uniqueMessages = [...new Map(messages.map(message => [message.toLocaleLowerCase("vi").replace(/[.!?]+$/, ""), message])).values()];
        fieldError(field, uniqueMessages.join(" "));
        applied += 1;
    });
    return applied > 0;
}
function messageFor(field) {
    const value = valueOf(field);
    const label = field.closest("[data-form-field]")?.querySelector(".bf-form-label")?.textContent.replace("*", "").trim() || "Trường này";
    const required = field.required || field.dataset.required === "true";
    if (required && !value) return `Vui lòng nhập ${label.toLocaleLowerCase("vi")}.`;
    if (!value) return "";
    if (field.matches(".bf-phone-input")) {
        const digits = value.replace(/\D/g, "");
        if (!((digits.length === 10 && digits.startsWith("0")) || (digits.length === 11 && digits.startsWith("84")))) return "Số điện thoại Việt Nam phải gồm mã 0 và 9 chữ số.";
    }
    if (field.type === "email" && !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value)) return "Email không đúng định dạng.";
    if (field.type === "number" && !Number.isFinite(Number(value))) return `${label} phải là số hợp lệ.`;
    if (field.maxLength > 0 && value.length > field.maxLength) return `${label} không được vượt quá ${field.maxLength} ký tự.`;
    if (field.minLength > 0 && value.length < field.minLength) return `${label} phải có ít nhất ${field.minLength} ký tự.`;
    return "";
}
export function validateForm(form) {
    let firstInvalid = null;
    const fields = [...form.querySelectorAll('input:not([type="hidden"]):not(.bf-select-search-input), textarea, select, [data-bf-select]')].filter(field => !field.disabled);
    fields.forEach(field => {
        const message = messageFor(field);
        fieldError(field, message);
        if (message && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
        (firstInvalid.matches("[data-bf-select]") ? firstInvalid.querySelector(".bf-select-control") : firstInvalid)?.focus();
        return false;
    }
    return true;
}
export function bindInlineValidation(form) {
    if (!form) return;
    form.noValidate = true;
    form.addEventListener("input", event => {
        const field = event.target.closest('input:not([type="hidden"]):not(.bf-select-search-input), textarea, select');
        if (field) fieldError(field, messageFor(field));
    });
    form.addEventListener("change", event => {
        const field = event.target.closest("[data-bf-select], input[type='checkbox'], select");
        if (field) fieldError(field, messageFor(field));
    });
}
