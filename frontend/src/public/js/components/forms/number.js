function normalizeNumberType(type) {
    const aliases = { positive: "positive-decimal", negative: "negative-decimal" };
    const normalized = aliases[type] || type;
    const allowed = ["decimal", "integer", "positive-decimal", "negative-decimal", "positive-integer", "negative-integer"];
    return allowed.includes(normalized) ? normalized : "decimal";
}

function getConfig(input) {
    const money = input.classList.contains("bf-money-input");
    const type = normalizeNumberType(money ? input.dataset.moneyType : input.dataset.numberType);
    const decimalsValue = money ? input.dataset.moneyDecimals : input.dataset.numberDecimals;
    const minValue = input.dataset.min;
    const maxValue = input.dataset.max;
    return {
        type,
        integer: type.includes("integer"),
        positive: type.includes("positive"),
        negative: type.includes("negative"),
        decimals: decimalsValue === "" || decimalsValue == null ? null : Math.max(0, Number(decimalsValue)),
        min: minValue === "" || minValue == null || !Number.isFinite(Number(minValue)) ? null : Number(minValue),
        max: maxValue === "" || maxValue == null || !Number.isFinite(Number(maxValue)) ? null : Number(maxValue)
    };
}

function formatNumber(value, type = "decimal", decimals = null) {
    type = normalizeNumberType(type);
    let source = String(value ?? "").trim();
    const negative = source.startsWith("-") || type.includes("negative");
    const commaIndex = source.indexOf(",");
    if (commaIndex >= 0) {
        source = source.slice(0, commaIndex).replace(/\./g, "") + "," + source.slice(commaIndex + 1).replace(/[^\d]/g, "");
    } else {
        source = source.replace(/[^\d]/g, "");
    }
    const parts = source.split(",");
    let integer = (parts[0] || "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    let fraction = parts.length > 1 ? parts.slice(1).join("").replace(/\D/g, "") : "";
    const isInteger = type.includes("integer");
    if (isInteger) fraction = "";
    if (decimals !== null && decimals !== "" && Number.isFinite(Number(decimals))) fraction = fraction.slice(0, Math.max(0, Number(decimals)));
    if (!integer && (source.startsWith(",") || source.startsWith("-,"))) integer = "0";
    if (!integer && !fraction) return source.startsWith("-") && !type.includes("positive") ? "-" : "";
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const sign = negative && !type.includes("positive") && (integer || fraction) ? "-" : "";
    return `${sign}${integer}${!isInteger && parts.length > 1 ? `,${fraction}` : ""}`;
}

function getNumber(value) {
    const normalized = String(value ?? "").replace(/\./g, "").replace(",", ".");
    if (!normalized || normalized === "-" || normalized === "-0,") return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
}

function formatInitialValue(value, config) {
    let initial = String(value ?? "").trim();
    if (/^-?\d+\.\d+$/.test(initial)) initial = initial.replace(".", ",");
    return formatNumber(initial, config.type, config.decimals);
}

function getCaretTokenCount(value, position) {
    return (value.slice(0, position).match(/[0-9,-]/g) || []).length;
}

function getCaretFromTokenCount(value, tokenCount) {
    if (!tokenCount) return 0;
    let count = 0;
    for (let index = 0; index < value.length; index++) {
        if (/[0-9,-]/.test(value[index])) count++;
        if (count >= tokenCount) return index + 1;
    }
    return value.length;
}

function formatInput(input) {
    const config = getConfig(input);
    const oldValue = input.value;
    const start = input.selectionStart ?? oldValue.length;
    const end = input.selectionEnd ?? start;
    const startTokens = getCaretTokenCount(oldValue, start);
    const endTokens = getCaretTokenCount(oldValue, end);
    input.value = formatNumber(oldValue, config.type, config.decimals);
    try {
        input.setSelectionRange(getCaretFromTokenCount(input.value, startTokens), getCaretFromTokenCount(input.value, endTokens));
    } catch {}
}

function clampInput(input) {
    const config = getConfig(input);
    const value = getNumber(input.value);
    if (value === null) return;
    let next = value;
    if (config.min !== null && next < config.min) next = config.min;
    if (config.max !== null && next > config.max) next = config.max;
    input.value = formatNumber(String(next).replace(".", ","), config.type, config.decimals);
}

function updateCurrencyPadding(input) {
    const currency = input.closest(".bf-money-control")?.querySelector(".bf-money-currency");
    if (!currency) return;
    const width = Math.ceil(currency.getBoundingClientRect().width) + 24;
    input.style.paddingRight = `${Math.max(52, width)}px`;
}

function initializeInput(input) {
    if (input.dataset.formInitialized === "true") return;
    input.dataset.formInitialized = "true";
    const config = getConfig(input);
    if (input.value !== "") input.value = formatInitialValue(input.value, config);
    updateCurrencyPadding(input);
    input.addEventListener("input", () => formatInput(input));
    input.addEventListener("paste", () => setTimeout(() => formatInput(input), 0));
    input.addEventListener("blur", () => {
        if (input.value === "-" || input.value === ",") input.value = "";
        if (input.value.endsWith(",")) input.value = input.value.slice(0, -1);
        formatInput(input);
        clampInput(input);
    });
    input.addEventListener("change", () => {
        formatInput(input);
        clampInput(input);
    });
    window.addEventListener("resize", () => updateCurrencyPadding(input));
}

export function initNumberInputs(root = document) {
    root.querySelectorAll?.(".bf-number-input, .bf-money-input").forEach(initializeInput);
}

export { formatNumber };