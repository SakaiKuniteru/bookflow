function normalizeInitialValue(value) {
    const text = String(value ?? "").trim();
    const datetime = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (datetime) return `${datetime[3]}/${datetime[2]}/${datetime[1]} ${datetime[4]}:${datetime[5]}:${datetime[6]}`;
    const date = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (date) return `${date[3]}/${date[2]}/${date[1]}`;
    return text;
}

function getType(input) {
    return ["date", "time", "datetime"].includes(input.dataset.dateType) ? input.dataset.dateType : "date";
}

function formatValue(input) {
    const type = getType(input);
    const digits = input.value.replace(/\D/g, "");
    if (type === "time") {
        input.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(Boolean).join(":");
        return;
    }
    if (type === "datetime") {
        const date = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
        const time = [digits.slice(8, 10), digits.slice(10, 12), digits.slice(12, 14)].filter(Boolean).join(":");
        input.value = time ? `${date} ${time}` : date;
        return;
    }
    input.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
}

function validate(input) {
    const type = getType(input);
    const value = input.value.trim();
    if (!value) {
        input.setCustomValidity("");
        return true;
    }
    let valid = false;
    if (type === "date") valid = validateDate(value);
    if (type === "time") valid = validateTime(value);
    if (type === "datetime") {
        const parts = value.split(" ");
        valid = parts.length === 2 && validateDate(parts[0]) && validateTime(parts[1]);
    }
    const error = input.closest("[data-form-field]")?.querySelector(".bf-date-error");
    input.classList.toggle("is-invalid", !valid);
    input.setCustomValidity(valid ? "" : "Ngày hoặc thời gian không hợp lệ.");
    if (error) error.hidden = valid;
    return valid;
}

function validateDate(value) {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return false;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (month < 1 || month > 12 || day < 1) return false;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function validateTime(value) {
    const match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return false;
    return Number(match[1]) <= 23 && Number(match[2]) <= 59 && Number(match[3]) <= 59;
}

function initializeInput(input) {
    if (input.dataset.formInitialized === "true") return;
    input.dataset.formInitialized = "true";
    input.value = normalizeInitialValue(input.value);
    input.addEventListener("input", () => formatValue(input));
    input.addEventListener("blur", () => validate(input));
    formatValue(input);
}

export function initDateInputs(root = document) {
    root.querySelectorAll?.(".bf-date-input").forEach(initializeInput);
}