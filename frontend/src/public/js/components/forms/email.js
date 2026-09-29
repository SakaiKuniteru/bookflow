const EMAIL_PATTERN = /^([A-Z0-9.!#$%&'*+/=?^_`{|}~-]+)@((?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63})$/i;

function validate(input) {
    const wrapper = input.closest("[data-form-field]");
    const error = wrapper?.querySelector(".bf-email-error");
    const value = input.value;
    const match = value.match(EMAIL_PATTERN);
    const localPart = match?.[1] || "";
    const valid = !value || Boolean(match && localPart.length <= 64 && !localPart.startsWith(".") && !localPart.endsWith(".") && !localPart.includes("..") && value.length <= 254);
    input.classList.toggle("is-invalid", !valid);
    input.setCustomValidity(valid ? "" : "Email không hợp lệ.");
    if (error) error.hidden = valid;
    return valid;
}

function initializeInput(input) {
    if (input.dataset.formInitialized === "true") return;
    input.dataset.formInitialized = "true";
    input.addEventListener("input", () => validate(input));
    input.addEventListener("blur", () => validate(input));
}

export function initEmailInputs(root = document) {
    root.querySelectorAll?.(".bf-email-input").forEach(initializeInput);
}