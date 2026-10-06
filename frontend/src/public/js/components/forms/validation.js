function valueOf(field) {
    if (field.matches("[data-bf-select]")) return [...field.querySelectorAll(".bf-select-option.is-selected")].map(option => option.dataset.value || "").join(",");
    if (field.type === "checkbox") return field.checked ? field.value : "";
    return String(field.value || "").trim();
}
function fieldError(field, message) {
    const container = field.closest("[data-form-field]");
    if (!container) return;
    let error = container.querySelector("[data-bf-field-error]");
    if (!error) {
        error = document.createElement("div");
        error.className = "bf-form-error";
        error.dataset.bfFieldError = "";
        error.setAttribute("role", "alert");
        container.appendChild(error);
    }
    field.classList.toggle("is-invalid", Boolean(message));
    field.setAttribute("aria-invalid", String(Boolean(message)));
    if (field.matches("[data-bf-select]")) field.querySelector(".bf-select-control")?.setAttribute("aria-invalid", String(Boolean(message)));
    error.textContent = message || "";
    error.hidden = !message;
}
function messageFor(field) {
    const value = valueOf(field);
    const label = field.closest("[data-form-field]")?.querySelector(".bf-form-label")?.textContent.replace("*", "").trim() || "Trường này";
    const required = field.required || field.dataset.required === "true";
    if (required && !value) return `Vui lòng nhập ${label.toLocaleLowerCase("vi")}.`;
    if (!value) return "";
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