function valueOf(field) {
    if (field.matches("[data-bf-select]")) return [...field.querySelectorAll(".bf-select-option.is-selected")].map(option => option.dataset.value || "").join(",");
    if (field.type === "checkbox") return field.checked ? field.value : "";
    return String(field.value || "").trim();
}
function fieldError(field, message) {
    const container = field.closest("[data-form-field]");
    if (!container) return;
    const specificError = field.matches(".bf-email-input") ? container.querySelector(".bf-email-error") : field.matches(".bf-phone-input") ? container.querySelector(".bf-phone-error") : field.matches(".bf-image-input") ? container.querySelector("[data-bf-image-error]") : field.matches(".bf-date-input") ? container.querySelector(".bf-date-error") : null;
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
    const customSelect = [...form.querySelectorAll("[data-bf-select]")].find(item => item.dataset.name === name || item.id === name);
    if (customSelect) return customSelect;
    let field = form.elements.namedItem(name);
    if (field && typeof field.length === "number" && !field.nodeType) field = field[0];
    if (field?.matches('input[type="hidden"].bf-phone-value')) field = field.closest("[data-form-field]")?.querySelector(".bf-phone-input");
    if (field) return field;
    const dataField = [...form.querySelectorAll("[data-name]")].find(item => item.dataset.name === name);
    if (dataField) return dataField;
    return null;
}
function fieldByErrorMessage(form, message) {
    const aliases = [[/email|e-mail/i, ["email"]], [/tên đăng nhập|username/i, ["tenDangNhap", "username"]], [/họ và tên|họ tên/i, ["hoTen"]], [/số điện thoại|điện thoại/i, ["soDienThoai"]], [/ngày sinh/i, ["ngaySinh"]], [/giới tính/i, ["gioiTinh"]], [/tài khoản/i, ["taiKhoanId"]], [/nguồn khách hàng/i, ["nguonKhachHang"]], [/dân tộc/i, ["danToc"]], [/quốc tịch/i, ["quocTich"]], [/quốc gia/i, ["quocGia"]], [/tỉnh(?:\/thành phố| thành phố)/i, ["tinhThanhPho"]], [/phường(?:\/xã| xã)/i, ["phuongXa"]], [/địa chỉ/i, ["diaChiChiTiet"]], [/mô tả/i, ["moTa"]], [/ghi chú/i, ["ghiChu"]]];
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
    if (field.matches(".bf-image-input")) {
        const imageError = field.closest("[data-form-field]")?.querySelector("[data-bf-image-error]");
        if (imageError && !imageError.hidden) return imageError.textContent || "Ảnh không hợp lệ.";
    }
    if (required && !value) return `Vui lòng nhập ${label.toLocaleLowerCase("vi")}.`;
    if (!value) return "";
    if (field.matches(".bf-phone-input")) {
        const digits = value.replace(/\D/g, "");
        if (!((digits.length === 10 && digits.startsWith("0")) || (digits.length === 11 && digits.startsWith("84")))) return "Số điện thoại Việt Nam phải gồm mã 0 và 9 chữ số.";
    }
    if (field.dataset.phoneCharsOnly === "true" && !/^\+?\d+$/.test(value)) return "Chỉ nhập chữ số và dấu + ở đầu số điện thoại.";
    if (field.matches(".bf-date-input") && !field.validity.valid) return field.closest("[data-form-field]")?.querySelector(".bf-date-error")?.textContent || "Ngày hoặc năm không hợp lệ.";
    if (field.type === "tel" && field.closest(".bf-vietnam-phone") && !/^(?:0\d{9}|84\d{9})$/.test(value.replace(/[\s().+-]/g, ""))) return "Số điện thoại phải gồm mã 0 hoặc 84 và 9 chữ số.";
    if (field.type === "email" && !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(value)) return "Email không đúng định dạng.";
    if (field.type === "url") {
        let url;
        try { url = new URL(value); } catch { return `${label} phải là URL hợp lệ.`; }
        if (!["http:", "https:"].includes(url.protocol)) return `${label} chỉ hỗ trợ HTTP hoặc HTTPS.`;
    }
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
