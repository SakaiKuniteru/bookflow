import { matchesSearch } from "./forms/search.js";

function normalize(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
}

function getRows(table) {
    return [...table.querySelectorAll("[data-table-row]")];
}

function getState(table) {
    const pageSize = table.querySelector("[data-table-page-size]");
    const pageInput = table.querySelector("[data-table-page]");
    const total = Number(table.dataset.total) || 0;
    const size = Number(pageSize?.value || table.dataset.pageSize) || 20;
    const pages = Math.max(1, Math.ceil(total / size));
    return { pageInput, pageSize, page: Math.max(1, Number(pageInput?.value || table.dataset.page) || 1), size, pages, total };
}

function getFilterValues(table) {
    const values = {};
    table.querySelectorAll("[data-bf-table-filter]").forEach(filter => {
        filter.querySelectorAll("input, select, textarea").forEach(input => {
            if (!input.name || input.disabled) return;
            if (input.type === "checkbox") {
                if (input.checked) values[input.name] = input.value;
                return;
            }
            if (input.type === "hidden" && !input.closest(".bf-select-hidden-values")) return;
            if (input.value !== "") values[input.name] = input.value;
        });
    });
    return values;
}

function rowMatchesFilters(row, filters) {
    let rowFilters = {};
    try {
        rowFilters = JSON.parse(row.dataset.filterValues || "{}");
    } catch {}
    return Object.entries(filters).every(([key, value]) => {
        const rowValue = rowFilters[key];
        if (Array.isArray(rowValue)) return rowValue.map(String).includes(String(value));
        return normalize(rowValue) === normalize(value);
    });
}

function getColumnValue(row, key) {
    const cell = [...row.querySelectorAll("[data-column-key]")].find(item => item.dataset.columnKey === key);
    return cell?.dataset.sortValue || cell?.dataset.searchValue || cell?.textContent || "";
}

function sortRows(table, rows) {
    const key = table.dataset.sort;
    if (!key) return rows;
    const order = table.dataset.order === "desc" ? -1 : 1;
    const header = table.querySelector(`[data-column-key="${CSS.escape(key)}"]`);
    const type = header?.dataset.sortType || "text";
    return rows.sort((left, right) => {
        const a = getColumnValue(left, key);
        const b = getColumnValue(right, key);
        let result = 0;
        if (type === "number") result = (Number(a) || 0) - (Number(b) || 0);
        else if (type === "date") result = (Date.parse(a) || 0) - (Date.parse(b) || 0);
        else result = String(a).localeCompare(String(b), "vi", { numeric: true, sensitivity: "base" });
        return result * order;
    });
}

function updatePagination(table, filteredRows = null) {
    const state = getState(table);
    const client = table.dataset.mode === "client";
    const count = client ? filteredRows.length : state.total;
    const pages = Math.max(1, client ? Math.ceil(count / state.size) : state.pages);
    const page = Math.min(state.page, pages);
    const from = count ? (page - 1) * state.size + 1 : 0;
    const to = Math.min(page * state.size, count);
    table.querySelector("[data-current-page]")?.replaceChildren(String(page));
    table.querySelector("[data-total-pages]")?.replaceChildren(String(pages));
    table.querySelector("[data-page-from]")?.replaceChildren(String(from));
    table.querySelector("[data-page-to]")?.replaceChildren(String(to));
    table.querySelector("[data-total-records]")?.replaceChildren(String(count));
    table.querySelectorAll("[data-page-action]").forEach(button => {
        const action = button.dataset.pageAction;
        button.disabled = action === "first" || action === "prev" ? page <= 1 : page >= pages;
    });
    if (state.pageInput) state.pageInput.value = String(page);
    return { ...state, page, pages, count };
}

function applyClientTable(table) {
    const rows = getRows(table);
    const query = table.querySelector(".bf-search-input")?.value.trim() || "";
    const searchWrapper = table.querySelector("[data-bf-search]");
    const searchMode = searchWrapper?.dataset.mode || "relative";
    const threshold = Number(searchWrapper?.dataset.threshold) || 85;
    const filters = getFilterValues(table);
    const columnSearches = [...table.querySelectorAll("[data-column-search]")].filter(input => input.value.trim());
    const matching = rows.filter(row => {
        const text = row.dataset.searchText || row.textContent;
        if (query && !matchesSearch(query, text, searchMode, threshold)) return false;
        if (!rowMatchesFilters(row, filters)) return false;
        return columnSearches.every(input => matchesSearch(input.value, getColumnValue(row, input.dataset.columnSearch), "relative"));
    });
    const sorted = sortRows(table, matching);
    const state = getState(table);
    const pageCount = Math.max(1, Math.ceil(sorted.length / state.size));
    const page = Math.min(state.page, pageCount);
    const start = (page - 1) * state.size;
    const visible = new Set(sorted.slice(start, start + state.size));
    rows.forEach(row => row.hidden = !visible.has(row));
    sorted.forEach(row => table.querySelector("[data-bf-table-body]").appendChild(row));
    const empty = table.querySelector("[data-bf-table-empty]");
    if (empty) empty.hidden = sorted.length > 0;
    updatePagination(table, sorted);
}

function submitServerTable(table) {
    const pageInput = table.querySelector("[data-table-page]");
    if (pageInput) pageInput.value = String(getState(table).page);
    table.querySelector("[data-bf-table-form]")?.requestSubmit();
}

function initialize(table) {
    if (table.dataset.formInitialized === "true") return;
    const form = table.querySelector("[data-bf-table-form]");
    if (!form) return;
    table.dataset.formInitialized = "true";
    const client = table.dataset.mode === "client";
    const refresh = () => client ? applyClientTable(table) : submitServerTable(table);
    table.querySelectorAll("[data-table-sort-key]").forEach(button => {
        button.addEventListener("click", () => {
            const key = button.dataset.tableSortKey;
            const order = table.dataset.sort === key && table.dataset.order === "asc" ? "desc" : "asc";
            table.dataset.sort = key;
            table.dataset.order = order;
            const sortInput = table.querySelector("[data-table-sort]");
            const orderInput = table.querySelector("[data-table-order]");
            if (sortInput) sortInput.value = key;
            if (orderInput) orderInput.value = order;
            const pageInput = table.querySelector("[data-table-page]");
            if (pageInput) pageInput.value = "1";
            refresh();
        });
    });
    table.querySelectorAll("[data-page-action]").forEach(button => {
        button.addEventListener("click", () => {
            const state = getState(table);
            const action = button.dataset.pageAction;
            const nextPage = action === "first" ? 1 : action === "prev" ? state.page - 1 : action === "next" ? state.page + 1 : state.pages;
            if (state.pageInput) state.pageInput.value = String(Math.max(1, Math.min(state.pages, nextPage)));
            refresh();
        });
    });
    table.querySelector("[data-table-page-size]")?.addEventListener("change", () => {
        const pageInput = table.querySelector("[data-table-page]");
        if (pageInput) pageInput.value = "1";
        refresh();
    });
    table.querySelectorAll("[data-table-column-search]").forEach(input => {
        input.addEventListener("input", () => {
            if (client) applyClientTable(table);
        });
        input.addEventListener("change", () => {
            if (client) applyClientTable(table);
        });
    });
    table.querySelectorAll("[data-bf-table-filter] input, [data-bf-table-filter] select, [data-bf-table-filter] textarea").forEach(input => {
        input.addEventListener("input", () => {
            if (client) applyClientTable(table);
        });
        input.addEventListener("change", () => {
            if (client) applyClientTable(table);
        });
    });
    table.querySelector("[data-table-reset]")?.addEventListener("click", () => {
        setTimeout(() => {
            if (client) {
                const pageInput = table.querySelector("[data-table-page]");
                if (pageInput) pageInput.value = "1";
                applyClientTable(table);
            }
        }, 0);
    });
    table.querySelectorAll("[data-table-action]").forEach(button => {
        button.addEventListener("click", () => {
            table.dispatchEvent(new CustomEvent("bookflow:table:action", { bubbles: true, detail: { action: button.dataset.tableAction, table } }));
        });
    });
    form.addEventListener("submit", event => {
        if (client) {
            event.preventDefault();
            const pageInput = table.querySelector("[data-table-page]");
            if (pageInput) pageInput.value = "1";
            applyClientTable(table);
        }
    });
    if (client) applyClientTable(table);
    else updatePagination(table);
}

export function initDataTables(root = document) {
    root.querySelectorAll?.("[data-bf-table]").forEach(initialize);
}
