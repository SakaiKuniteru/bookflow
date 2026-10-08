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
    let field = form.elements.namedItem(name) || form.elements.namedItem(camelName);
    if (field && typeof field.length === "number" && !field.nodeType) field = field[0];
    if (!field) field = form.querySelector(`[data-name="${CSS.escape(camelName)}"]`);
    if (field?.matches('input[type="hidden"].bf-phone-value')) field = field.closest("[data-form-field]")?.querySelector(".bf-phone-input");
    return field;
}
export function applyServerFieldErrors(form, error) {
    const details = error?.details || error?.error?.details || [];
    const grouped = new Map();
    details.forEach(detail => {
        const field = fieldByName(form, detail.field || "");
        if (!field || !detail.message) return;
        const messages = grouped.get(field) || [];
        messages.push(detail.message);
        grouped.set(field, messages);
    });
    grouped.forEach((serverMessages, field) => {
        const container = field.closest("[data-form-field]");
        if (!container) return;
        const existing = field.matches(".bf-email-input") ? container.querySelector(".bf-email-error") : field.matches(".bf-phone-input") ? container.querySelector(".bf-phone-error") : container.querySelector("[data-bf-field-error]");
        const messages = [existing && !existing.hidden ? existing.textContent.trim() : "", ...serverMessages].filter(Boolean);
        fieldError(field, [...new Set(messages)].join(" "));
    });
    return grouped.size > 0;
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
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email không đúng định dạng.";
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
