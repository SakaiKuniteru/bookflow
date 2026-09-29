function normalizeFormat(format) {
    const aliases = {
        plain: "local",
        spaced: "space",
        dotted: "dot",
        hyphen: "dash",
        intl: "international",
        "intl-space": "international-space",
        "intl-dash": "international-dash",
        "intl-parentheses": "international-parentheses"
    };
    const value = aliases[format] || format;
    const formats = ["local", "space", "dot", "dash", "international", "international-space", "international-dash", "international-parentheses"];
    return formats.includes(value) ? value : "local";
}

function getPhoneParts(value) {
    const text = String(value ?? "").trim();
    let digits = text.replace(/\D/g, "");
    const international = text.startsWith("+") || (digits.startsWith("84") && digits.length > 10);
    if (international && digits.startsWith("84")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = digits.slice(1);
    return { international, subscriber: digits.slice(0, 9) };
}

function groupDigits(value, separator) {
    const first = value.slice(0, 3);
    const second = value.slice(3, 6);
    const third = value.slice(6, 9);
    return [first, second, third].filter(Boolean).join(separator);
}

function formatPhone(value, format) {
    const { subscriber } = getPhoneParts(value);
    if (!subscriber && !String(value ?? "").trim().startsWith("+")) return "";
    if (format === "local") return subscriber ? `0${subscriber}` : "0";
    if (format === "space") return subscriber ? `0${subscriber.slice(0, 3)}${subscriber.length > 3 ? ` ${subscriber.slice(3, 6)}` : ""}${subscriber.length > 6 ? ` ${subscriber.slice(6, 9)}` : ""}` : "0";
    if (format === "dot" || format === "dash") {
        const separator = format === "dot" ? "." : "-";
        const local = `0${subscriber}`;
        return [local.slice(0, 4), local.slice(4, 7), local.slice(7, 10)].filter(Boolean).join(separator);
    }
    const separator = format === "international-dash" ? "-" : " ";
    const grouped = groupDigits(subscriber, separator);
    if (format === "international-parentheses") return `(+84)${grouped ? ` ${grouped}` : ""}`;
    return `+84${grouped ? `${separator}${grouped}` : ""}`;
}

function getCanonicalPhone(value) {
    const { subscriber } = getPhoneParts(value);
    return subscriber.length === 9 ? `0${subscriber}` : "";
}

function getDigitCaretPosition(value, digitCount) {
    if (!digitCount) return value.startsWith("+") ? value.length >= 3 ? 3 : value.length : 0;
    let count = 0;
    for (let index = 0; index < value.length; index++) {
        if (/\d/.test(value[index])) count++;
        if (count >= digitCount) return index + 1;
    }
    return value.length;
}

function updatePhone(input, hidden, format, validate = true) {
    const oldValue = input.value;
    const caret = input.selectionStart ?? oldValue.length;
    const digitsBeforeCaret = (oldValue.slice(0, caret).match(/\d/g) || []).length;
    input.value = formatPhone(oldValue, format);
    hidden.value = getCanonicalPhone(input.value);
    const canonical = hidden.value;
    const isValid = !input.value || Boolean(canonical);
    input.setCustomValidity(isValid ? "" : "Số điện thoại Việt Nam phải gồm mã 0 và 9 chữ số.");
    input.classList.toggle("is-invalid", !isValid);
    const error = input.closest("[data-form-field]")?.querySelector(".bf-phone-error");
    if (error) error.hidden = isValid;
    if (validate) {
        try {
            const nextCaret = getDigitCaretPosition(input.value, digitsBeforeCaret);
            input.setSelectionRange(nextCaret, nextCaret);
        } catch {}
    }
}

function initialize(input) {
    if (input.dataset.formInitialized === "true") return;
    const wrapper = input.closest("[data-bf-phone]");
    const hidden = wrapper?.querySelector(".bf-phone-value");
    if (!wrapper || !hidden) return;
    input.dataset.formInitialized = "true";
    const format = normalizeFormat(wrapper.dataset.phoneFormat);
    input.value = input.value ? formatPhone(input.value, format) : "";
    hidden.value = getCanonicalPhone(input.value);
    input.addEventListener("input", () => updatePhone(input, hidden, format));
    input.addEventListener("paste", () => setTimeout(() => updatePhone(input, hidden, format), 0));
    input.addEventListener("blur", () => updatePhone(input, hidden, format, false));
    input.addEventListener("change", () => updatePhone(input, hidden, format, false));
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") updatePhone(input, hidden, format, false);
    });
    input.form?.addEventListener("submit", () => updatePhone(input, hidden, format, false));
    updatePhone(input, hidden, format, false);
}

export function initPhoneInputs(root = document) {
    root.querySelectorAll?.(".bf-phone-input").forEach(initialize);
}