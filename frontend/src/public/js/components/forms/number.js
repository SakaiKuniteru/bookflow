function normalizeNumberType(type) {
    const allowed = ["decimal", "integer", "positive-decimal", "negative-decimal", "positive-integer", "negative-integer"];
    return allowed.includes(type) ? type : "decimal";
}

function formatNumber(value, type = "decimal", decimals = null) {
    type = normalizeNumberType(type);
    let source = String(value ?? "").trim();
    let negative = source.startsWith("-");
    source = source.replace(/\./g, "").replace(/[^\d,-]/g, "");
    source = source.replace(/(?!^)-/g, "");
    const commaIndex = source.indexOf(",");
    let integer = commaIndex >= 0 ? source.slice(0, commaIndex) : source;
    let decimal = commaIndex >= 0 ? source.slice(commaIndex + 1).replace(/\D/g, "") : "";
    const isInteger = type.includes("integer");
    const isPositive = type.includes("positive");
    const isNegative = type.includes("negative");
    if (isInteger) decimal = "";
    if (isPositive) negative = false;
    if (isNegative) negative = true;
    integer = integer.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (!integer) integer = commaIndex >= 0 ? "0" : "";
    if (decimals !== null && decimals !== "") decimal = decimal.slice(0, Number(decimals));
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    let result = `${negative && (integer || decimal) ? "-" : ""}${integer}`;
    if (!isInteger && commaIndex >= 0) result += `,${decimal}`;
    return result;
}

function getFormattedCaret(value, rawCaret, type, decimals) {
    const rawPrefix = value.slice(0, rawCaret).replace(/\./g, "");
    return formatNumber(rawPrefix, type, decimals).length;
}

function getInputConfig(input) {
    const isMoney = input.classList.contains("bf-money-input");
    return {
        type: normalizeNumberType(isMoney ? (input.dataset.moneyType || "decimal") : input.dataset.numberType),
        decimals: isMoney ? input.dataset.moneyDecimals : input.dataset.numberDecimals,
        min: input.dataset.min !== undefined ? Number(input.dataset.min) : null,
        max: input.dataset.max !== undefined ? Number(input.dataset.max) : null
    };
}

function clampNumberValue(input) {
    const config = getInputConfig(input);
    const numeric = Number(String(input.value).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(numeric)) return;
    if (config.min !== null && numeric < config.min) input.value = formatNumber(String(config.min).replace(".", ","), config.type, config.decimals);
    if (config.max !== null && numeric > config.max) input.value = formatNumber(String(config.max).replace(".", ","), config.type, config.decimals);
}

function formatInput(input) {
    const config = getInputConfig(input);
    const caret = input.selectionStart ?? input.value.length;
    const valueBeforeCaret = input.value;
    const rawCaret = valueBeforeCaret.slice(0, caret).replace(/\./g, "").length;
    input.value = formatNumber(valueBeforeCaret, config.type, config.decimals);
    const newCaret = getFormattedCaret(input.value, rawCaret, config.type, config.decimals);
    try {
        input.setSelectionRange(newCaret, newCaret);
    } catch {}
}

function handleBackspace(event, input) {
    if (event.key !== "Backspace") return false;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    if (start !== end || start <= 0) return false;
    if (input.value[start - 1] !== ".") return false;
    event.preventDefault();
    input.setSelectionRange(start - 2, start);
    document.execCommand("delete");
    formatInput(input);
    return true;
}

function handleDelete(event, input) {
    if (event.key !== "Delete") return false;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    if (start !== end || start >= input.value.length) return false;
    if (input.value[start] !== ".") return false;
    event.preventDefault();
    input.setSelectionRange(start, start + 2);
    document.execCommand("delete");
    formatInput(input);
    return true;
}

function initializeInput(input) {
    if (input.dataset.formInitialized === "true") return;
    input.dataset.formInitialized = "true";
    input.addEventListener("keydown", event => {
        if (handleBackspace(event, input)) return;
        handleDelete(event, input);
    });
    input.addEventListener("input", () => formatInput(input));
    input.addEventListener("paste", () => setTimeout(() => formatInput(input), 0));
    input.addEventListener("blur", () => {
        if (input.value === "-") input.value = "";
        if (input.value === ",") input.value = "0,";
        formatInput(input);
        clampNumberValue(input);
    });
    formatInput(input);
}

export function initNumberInputs(root = document) {
    root.querySelectorAll?.(".bf-number-input, .bf-money-input").forEach(initializeInput);
}

export { formatNumber };