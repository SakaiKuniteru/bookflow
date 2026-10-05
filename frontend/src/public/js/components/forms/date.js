const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function getType(input) {
    return ["date", "time", "datetime"].includes(input.dataset.dateType) ? input.dataset.dateType : "date";
}

function getTimeFormat(input) {
    return input.dataset.timeFormat === "hm" ? "hm" : "hms";
}

function pad(value) {
    return String(value).padStart(2, "0");
}

function localDate(year, month, day) {
    const date = new Date(0);
    date.setFullYear(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date;
}

function normalizeInitialValue(value) {
    const text = String(value ?? "").trim();
    const datetime = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (datetime) return `${datetime[3]}/${datetime[2]}/${datetime[1]} ${datetime[4]}:${datetime[5]}${datetime[6] ? `:${datetime[6]}` : ""}`;
    const date = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (date) return `${date[3]}/${date[2]}/${date[1]}`;
    return text;
}

function getParts(input) {
    const value = input.value.trim();
    const type = getType(input);
    const now = new Date();
    const dateText = type === "datetime" ? value.split(/\s+/)[0] : value;
    const timeText = type === "datetime" ? value.split(/\s+/)[1] : type === "time" ? value : "";
    const dateMatch = dateText?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{1,4})$/);
    const timeMatch = timeText?.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    const defaultTime = input.dataset.defaultTime?.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    return {
        date: dateMatch ? localDate(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1])) : localDate(now.getFullYear(), now.getMonth(), now.getDate()),
        hour: timeMatch ? Number(timeMatch[1]) : Number(defaultTime?.[1] ?? 0),
        minute: timeMatch ? Number(timeMatch[2]) : Number(defaultTime?.[2] ?? 0),
        second: timeMatch?.[3] ? Number(timeMatch[3]) : Number(defaultTime?.[3] ?? 0)
    };
}

function formatDate(date) {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).padStart(4, "0")}`;
}

function formatTime(parts, input) {
    const value = `${pad(parts.hour)}:${pad(parts.minute)}`;
    return getTimeFormat(input) === "hm" ? value : `${value}:${pad(parts.second)}`;
}

function formatInput(input) {
    const type = getType(input);
    const digits = input.value.replace(/\D/g, "");
    if (type === "time") {
        const parts = [digits.slice(0, 2), digits.slice(2, 4)];
        if (getTimeFormat(input) === "hms") parts.push(digits.slice(4, 6));
        input.value = parts.filter(Boolean).join(":");
        return;
    }
    const date = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
    if (type === "datetime") {
        const timeParts = [digits.slice(8, 10), digits.slice(10, 12)];
        if (getTimeFormat(input) === "hms") timeParts.push(digits.slice(12, 14));
        const time = timeParts.filter(Boolean).join(":");
        input.value = time ? `${date} ${time}` : date;
        return;
    }
    input.value = date;
}

function validateDate(value) {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return false;
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const date = localDate(year, month, day);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}

function validateTime(value, input) {
    const match = getTimeFormat(input) === "hm" ? value.match(/^(\d{2}):(\d{2})$/) : value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    return Boolean(match) && Number(match[1]) <= 23 && Number(match[2]) <= 59 && (getTimeFormat(input) === "hm" || Number(match[3]) <= 59);
}

function validate(input) {
    const type = getType(input);
    const value = input.value.trim();
    if (!value) {
        input.setCustomValidity("");
        input.classList.remove("is-invalid");
        const error = input.closest("[data-form-field]")?.querySelector(".bf-date-error");
        if (error) error.hidden = true;
        return true;
    }
    let valid = false;
    if (type === "date") valid = validateDate(value);
    if (type === "time") valid = validateTime(value, input);
    if (type === "datetime") {
        const parts = value.split(/\s+/);
        valid = parts.length === 2 && validateDate(parts[0]) && validateTime(parts[1], input);
    }
    const error = input.closest("[data-form-field]")?.querySelector(".bf-date-error");
    input.classList.toggle("is-invalid", !valid);
    input.setCustomValidity(valid ? "" : "Ngày hoặc thời gian không hợp lệ.");
    if (error) error.hidden = valid;
    return valid;
}

function commitInput(input) {
    const value = input.value.trim();
    if (!value) return validate(input);
    const type = getType(input);
    const dateText = type === "datetime" ? value.split(/\s+/)[0] : value;
    const timeText = type === "datetime" ? value.split(/\s+/)[1] || "" : type === "time" ? value : "";
    const dateMatch = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{1,4})$/);
    const timeMatch = timeText.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (dateMatch) {
        let year = dateMatch[3];
        if (year.length === 2) year = `20${year}`;
        else year = year.padStart(4, "0");
        const date = `${pad(dateMatch[1])}/${pad(dateMatch[2])}/${year}`;
        const defaultTime = input.dataset.defaultTime || `00:00${getTimeFormat(input) === "hms" ? ":00" : ""}`;
        input.value = type === "datetime" ? `${date} ${timeMatch ? `${pad(timeMatch[1])}:${pad(timeMatch[2])}${getTimeFormat(input) === "hms" ? `:${pad(timeMatch[3] || 0)}` : ""}` : defaultTime}` : date;
    } else if (type === "time" && timeMatch) {
        input.value = `${pad(timeMatch[1])}:${pad(timeMatch[2])}${getTimeFormat(input) === "hms" ? `:${pad(timeMatch[3] || 0)}` : ""}`;
    }
    return validate(input);
}

function renderCalendar(picker, input) {
    const state = picker._state;
    const date = state.date;
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = localDate(year, month, 1);
    const start = localDate(year, month, 1 - firstDay.getDay());
    const days = Array.from({ length: 42 }, (_, index) => {
        const day = localDate(start.getFullYear(), start.getMonth(), start.getDate() + index);
        const selected = day.toDateString() === date.toDateString();
        return `<button type="button" class="bf-date-day${day.getMonth() !== month ? " is-outside" : ""}${selected ? " is-selected" : ""}" data-day="${day.getFullYear()}-${day.getMonth()}-${day.getDate()}">${day.getDate()}</button>`;
    }).join("");
    const decadeStart = Math.floor(year / 10) * 10;
    const centuryStart = Math.floor(year / 100) * 100;
    const content = state.view === "day"
        ? `<div class="bf-date-weekdays">${WEEKDAYS.map(day => `<span>${day}</span>`).join("")}</div><div class="bf-date-days">${days}</div>`
        : state.view === "month"
            ? `<div class="bf-date-grid bf-date-month-grid">${MONTHS.map((name, index) => `<button type="button" class="bf-date-option${index === month ? " is-selected" : ""}" data-month="${index}">${name}</button>`).join("")}</div>`
            : state.view === "year"
                ? `<div class="bf-date-grid bf-date-year-grid">${Array.from({ length: 12 }, (_, index) => {
                    const item = decadeStart - 1 + index;
                    const outside = item < decadeStart || item > decadeStart + 9;
                    return `<button type="button" class="bf-date-option${outside ? " is-outside" : ""}${item === year ? " is-selected" : ""}" data-year="${item}">${item}</button>`;
                }).join("")}</div>`
                : `<div class="bf-date-grid bf-date-decade-grid">${Array.from({ length: 12 }, (_, index) => {
                    const first = centuryStart - 10 + index * 10;
                    const outside = first < centuryStart || first > centuryStart + 90;
                    const selected = year >= first && year <= first + 9;
                    return `<button type="button" class="bf-date-option${outside ? " is-outside" : ""}${selected ? " is-selected" : ""}" data-decade="${first}">${first}-${first + 9}</button>`;
                }).join("")}</div>`;
    const title = state.view === "day" ? `${MONTHS[month]} ${year}` : state.view === "month" ? year : state.view === "year" ? `${decadeStart}-${decadeStart + 9}` : `${centuryStart}-${centuryStart + 99}`;
    return `<div class="bf-date-calendar"><div class="bf-date-header"><button type="button" data-action="prev" data-step="small" aria-label="Lùi một bước">&lt;</button><button type="button" data-action="prev" data-step="large" aria-label="Lùi nhiều bước">&laquo;</button><button type="button" class="bf-date-title" data-action="title">${title}</button><button type="button" data-action="next" data-step="large" aria-label="Tiến nhiều bước">&raquo;</button><button type="button" data-action="next" data-step="small" aria-label="Tiến một bước">&gt;</button></div><div class="bf-date-calendar-content">${content}</div></div>`;
}

function renderTime(picker, input) {
    if (getType(input) === "date") return "";
    const state = picker._state;
    const columns = [["hour", 24], ["minute", 60], ...(getTimeFormat(input) === "hms" ? [["second", 60]] : [])];
    return `<div class="bf-date-time"><div class="bf-date-time-title">${formatDate(state.date)} ${formatTime(state, input)}</div><div class="bf-date-time-columns">${columns.map(([key, length]) => `<div class="bf-date-time-column" data-time-column="${key}">${Array.from({ length }, (_, index) => `<button type="button" class="bf-date-time-option${index === state[key] ? " is-selected" : ""}" data-time="${key}:${index}">${pad(index)}</button>`).join("")}</div>`).join("")}</div></div>`;
}

function renderPicker(picker, input) {
    const type = getType(input);
    const timeOnly = `<div class="bf-date-time bf-date-time-only"><div class="bf-date-time-title">${formatTime(picker._state, input)}</div><div class="bf-date-time-columns">${[["hour", 24], ["minute", 60], ...(getTimeFormat(input) === "hms" ? [["second", 60]] : [])].map(([key, length]) => `<div class="bf-date-time-column" data-time-column="${key}">${Array.from({ length }, (_, index) => `<button type="button" class="bf-date-time-option${index === picker._state[key] ? " is-selected" : ""}" data-time="${key}:${index}">${pad(index)}</button>`).join("")}</div>`).join("")}</div></div>`;
    const content = type === "time" ? timeOnly : `${renderCalendar(picker, input)}${type === "datetime" ? renderTime(picker, input) : ""}`;
    picker.innerHTML = `<div class="bf-date-picker-main">${content}</div><div class="bf-date-footer"><button type="button" class="bf-date-now" data-action="now">Bây giờ</button><button type="button" class="bf-date-ok" data-action="ok">OK</button></div>`;
    picker.querySelectorAll(".bf-date-time-option.is-selected").forEach(option => {
        const column = option.closest(".bf-date-time-column");
        column.scrollTop += option.getBoundingClientRect().top - column.getBoundingClientRect().top;
    });
}

function openPicker(input, picker) {
    if (input.disabled || input.readOnly) return;
    document.querySelectorAll(".bf-date-picker.is-open").forEach(item => {
        if (item !== picker) item.classList.remove("is-open");
    });
    picker._state = getParts(input);
    picker._state.view = "day";
    renderPicker(picker, input);
    picker.classList.add("is-open");
}

function selectNow(input, picker) {
    const now = new Date();
    picker._state.date = localDate(now.getFullYear(), now.getMonth(), now.getDate());
    if (getType(input) !== "date") {
        picker._state.hour = now.getHours();
        picker._state.minute = now.getMinutes();
        picker._state.second = now.getSeconds();
    }
    selectValue(input, picker);
}

function selectValue(input, picker) {
    const state = picker._state;
    const type = getType(input);
    if (type === "date") input.value = formatDate(state.date);
    if (type === "time") input.value = formatTime(state, input);
    if (type === "datetime") input.value = `${formatDate(state.date)} ${formatTime(state, input)}`;
    validate(input);
    picker.classList.remove("is-open");
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function handlePickerClick(event, input, picker) {
    const button = event.target.closest("button");
    if (!button) return;
    const state = picker._state;
    const action = button.dataset.action;
    if (action === "ok") return selectValue(input, picker);
    if (action === "now") return selectNow(input, picker);
    if (action === "title") {
        state.view = state.view === "day" ? "month" : state.view === "month" ? "year" : state.view === "year" ? "decade" : "day";
    } else if (action === "prev" || action === "next") {
        const direction = action === "prev" ? -1 : 1;
        const large = button.dataset.step === "large";
        const year = state.date.getFullYear();
        const month = state.date.getMonth();
        const day = state.date.getDate();
        if (state.view === "day") {
            const nextMonth = localDate(year, month + direction * (large ? 12 : 1), 1);
            const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
            state.date = localDate(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(day, lastDay));
        } else if (state.view === "month") {
            state.date = localDate(year + direction * (large ? 10 : 1), month, Math.min(day, 28));
        } else if (state.view === "year") {
            state.date = localDate(year + direction * (large ? 100 : 10), month, Math.min(day, 28));
        } else {
            state.date = localDate(year + direction * (large ? 1000 : 100), month, Math.min(day, 28));
        }
    } else if (button.dataset.day) {
        const [year, month, day] = button.dataset.day.split("-").map(Number);
        state.date = localDate(year, month, day);
    } else if (button.dataset.month !== undefined) {
        state.date.setMonth(Number(button.dataset.month));
        state.view = "day";
    } else if (button.dataset.year) {
        state.date.setFullYear(Number(button.dataset.year));
        state.view = "month";
    } else if (button.dataset.decade) {
        state.date.setFullYear(Number(button.dataset.decade) + 5);
        state.view = "year";
    } else if (button.dataset.time) {
        const [key, value] = button.dataset.time.split(":");
        state[key] = Number(value);
    }
    renderPicker(picker, input);
}

function initializeInput(input) {
    if (input.dataset.formInitialized === "true") return;
    input.dataset.formInitialized = "true";
    input.value = normalizeInitialValue(input.value);
    const wrapper = input.closest("[data-form-field]");
    const control = input.closest(".bf-date-control");
    const picker = wrapper?.querySelector(".bf-date-picker");
    const toggle = control?.querySelector(".bf-date-picker-toggle");
    if (!picker || !control) return;
    input.addEventListener("input", () => formatInput(input));
    input.addEventListener("blur", () => commitInput(input));
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            commitInput(input);
            picker.classList.remove("is-open");
            input.blur();
        }
        if (event.key === "Escape") picker.classList.remove("is-open");
    });
    input.addEventListener("focus", () => openPicker(input, picker));
    input.addEventListener("click", () => openPicker(input, picker));
    toggle?.addEventListener("click", () => {
        if (picker.classList.contains("is-open")) picker.classList.remove("is-open");
        else {
            input.focus();
            openPicker(input, picker);
        }
    });
    picker.addEventListener("mousedown", event => event.preventDefault());
    picker.addEventListener("click", event => handlePickerClick(event, input, picker));
    document.addEventListener("mousedown", event => {
        if (!wrapper.contains(event.target)) picker.classList.remove("is-open");
    });
}

export function initDateInputs(root = document) {
    root.querySelectorAll?.(".bf-date-input").forEach(initializeInput);
}