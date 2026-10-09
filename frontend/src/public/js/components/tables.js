import { matchesSearch } from "./forms/search.js";
import { syncSelect } from "./forms/select.js";
import { closeModal } from "./modals.js?v=20261010-2";

function normalize(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
}

function getRows(table) {
    return [...table.querySelectorAll("[data-table-row]")];
}
function applyColumnAlignment(table) {
    const actionColumn = table.querySelector("colgroup col[data-column-key='actions']");
    if (actionColumn) actionColumn.parentElement.appendChild(actionColumn);
    table.querySelectorAll("tr").forEach(row => { const actionCell = row.querySelector("[data-column-key='actions']"); if (actionCell) row.appendChild(actionCell); });
    const alignments = new Map([...table.querySelectorAll("thead [data-column-key]")].map(header => [header.dataset.columnKey, header.dataset.columnAlign || ""]));
    getRows(table).forEach(row => row.querySelectorAll("[data-column-key]").forEach(cell => {
        const key = cell.dataset.columnKey;
        const requested = alignments.get(key);
        const align = ["left", "center", "right"].includes(requested) ? requested : key === "stt" || key === "actions" ? "center" : "left";
        cell.classList.remove("bf-table-align-left", "bf-table-align-center", "bf-table-align-right");
        cell.classList.add(`bf-table-align-${align}`);
    }));
}
function getState(table) {
    const pageSize = table.querySelector("[data-table-page-size]");
    const pageInput = table.querySelector("[data-table-page]");
    const total = Number(table.dataset.total) || 0;
    const size = Number(pageSize?.value || table.dataset.pageSize) || 20;
    const pages = Math.max(1, Math.ceil(total / size));
    return { pageInput, pageSize, page: Math.max(1, Number(pageInput?.value || table.dataset.page) || 1), size, pages, total };
}

function getFilterInputValue(input) {
    if (input.matches(".bf-number-input, .bf-money-input")) {
        return input.value.replace(/\./g, "").replace(",", ".");
    }
    if (input.dataset.dateType === "date") {
        const match = input.value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return input.value;
}

function getFilterValues(table, readDraft = false) {
    if (!readDraft && table.__bfAppliedFilterValues) return { ...table.__bfAppliedFilterValues };
    const values = {};
    table.querySelectorAll("[data-bf-table-filter]").forEach(filter => {
        filter.querySelectorAll("input, select, textarea").forEach(input => {
            if (!input.name || input.disabled) return;
            if (input.type === "checkbox") {
                if (input.checked) values[input.name] = input.value;
                return;
            }
            if (input.type === "hidden" && !input.closest(".bf-select-hidden-values")) return;
            const value = getFilterInputValue(input);
            if (value === "") return;
            if (input.name.endsWith("[]")) {
                values[input.name] ||= [];
                values[input.name].push(value);
            } else {
                values[input.name] = value;
            }
        });
    });
    return values;
}

function setFilterValues(table, values = {}) {
    table.querySelectorAll("[data-bf-table-filter]").forEach(filter => {
        const select = filter.querySelector("[data-bf-select]");
        if (select) {
            const name = select.dataset.name;
            const selectedValues = values[`${name}[]`] ?? values[name] ?? [];
            const selected = new Set((Array.isArray(selectedValues) ? selectedValues : [selectedValues]).map(String));
            select.querySelectorAll(".bf-select-option").forEach(option => {
                option.classList.toggle("is-selected", selected.has(String(option.dataset.value)));
            });
            syncSelect(select);
        }
        filter.querySelectorAll("input:not([type='hidden']), textarea, select").forEach(input => {
            if (!input.name) return;
            const value = values[input.name];
            if (input.type === "checkbox") input.checked = value != null && String(value) === input.value;
            else if (input.type === "radio") input.checked = String(value) === input.value;
            else if (!input.closest("[data-bf-select]")) {
                const date = input.dataset.dateType === "date" && String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
                input.value = value == null ? "" : date ? `${date[3]}/${date[2]}/${date[1]}` : String(value);
            }
        });
    });
}

function updateFilterCount(table) {
    const count = Object.values(table.__bfAppliedFilterValues || {}).filter(value => Array.isArray(value) ? value.length > 0 : value !== "" && value != null).length;
    table.querySelectorAll("[data-table-filter-count]").forEach(node => {
        node.textContent = String(count);
        node.hidden = count === 0;
    });
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
    applyColumnAlignment(table);
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
    sorted.forEach((row, index) => {
        const cell = row.querySelector('[data-column-key="stt"]');
        if (!cell) return;
        const value = String(start + index + 1);
        cell.textContent = value;
        cell.dataset.searchValue = value;
        cell.dataset.sortValue = value;
    });
    const visible = new Set(sorted.slice(start, start + state.size));
    rows.forEach(row => row.hidden = !visible.has(row));
    sorted.forEach(row => table.querySelector("[data-bf-table-body]").appendChild(row));
    const empty = table.querySelector("[data-bf-table-empty]");
    if (empty) empty.hidden = sorted.length > 0 || table.dataset.loading === "true";
    updatePagination(table, sorted);
}

function submitServerTable(table) {
    const pageInput = table.querySelector("[data-table-page]");
    if (pageInput) pageInput.value = String(getState(table).page);
    table.querySelector("[data-bf-table-form]")?.requestSubmit();
}

function requestApiTable(table) {
    const state = getState(table);
    const search = table.querySelector(".bf-search-input");
    const searchWrapper = table.querySelector("[data-bf-search]");
    table.dispatchEvent(new CustomEvent("bookflow:table:request", {
        bubbles: true,
        detail: {
            page: state.page,
            pageSize: state.size,
            sort: table.dataset.sort,
            order: table.dataset.order,
            search: search?.value.trim() || "",
            searchMode: searchWrapper?.dataset.mode || "relative",
            searchThreshold: Number(searchWrapper?.dataset.threshold) || 85,
            filters: getFilterValues(table)
        }
    }));
}

function initialize(table) {
    if (table.dataset.formInitialized === "true") return;
    const form = table.querySelector("[data-bf-table-form]");
    if (!form) return;
    table.dataset.formInitialized = "true";
    applyColumnAlignment(table);
    const client = table.dataset.mode === "client";
    const api = table.dataset.mode === "api";
    const filterForm = table.querySelector("[data-bf-table-filter-form]");
    const filterModal = filterForm?.closest("[data-bf-modal]");
    const filterTrigger = table.querySelector("[data-table-filter-trigger]");
    if (filterForm) table.__bfAppliedFilterValues = getFilterValues(table, true);
    updateFilterCount(table);
    const positionFilterPopover = () => {
        if (!filterModal || !filterTrigger) return;
        const trigger = filterTrigger.getBoundingClientRect();
        const maxHeight = Math.min(520, window.innerHeight * .74);
        const dialog = filterModal.querySelector(".bf-modal-dialog");
        const measuredHeight = filterModal.classList.contains("is-open") ? dialog?.getBoundingClientRect().height : 0;
        const panelHeight = Math.min(maxHeight, measuredHeight || maxHeight);
        const maxRight = Math.max(12, window.innerWidth - 280 - 12);
        const right = Math.max(12, Math.min(window.innerWidth - trigger.right, maxRight));
        let top = trigger.bottom + 8;
        if (top + panelHeight > window.innerHeight - 8) {
            const above = trigger.top - panelHeight - 8;
            top = above >= 8 ? above : Math.max(8, window.innerHeight - panelHeight - 8);
        }
        filterModal.style.setProperty("--bf-filter-popover-top", `${top}px`);
        filterModal.style.setProperty("--bf-filter-popover-right", `${right}px`);
    };
    filterTrigger?.addEventListener("click", event => {
        if (filterModal?.classList.contains("is-open")) {
            event.preventDefault();
            event.stopPropagation();
            closeModal(filterModal);
            return;
        }
        positionFilterPopover();
        requestAnimationFrame(positionFilterPopover);
    });
    if (filterModal) {
        document.addEventListener("click", event => {
            if (!filterModal.classList.contains("is-open")) return;
            if (filterModal.querySelector(".bf-modal-dialog")?.contains(event.target) || filterTrigger?.contains(event.target)) return;
            closeModal(filterModal);
        });
        window.addEventListener("resize", () => {
            if (filterModal.classList.contains("is-open")) positionFilterPopover();
        });
        window.addEventListener("scroll", () => {
            if (filterModal.classList.contains("is-open")) positionFilterPopover();
        }, true);
    }
    let searchTimer = null;
    const refresh = () => {
        clearTimeout(searchTimer);
        if (client) applyClientTable(table);
        else if (api) requestApiTable(table);
        else submitServerTable(table);
    };
    const scheduleApiRefresh = () => {
        if (!api) return;
        clearTimeout(searchTimer);
        const pageInput = table.querySelector("[data-table-page]");
        if (pageInput) pageInput.value = "1";
        searchTimer = setTimeout(() => requestApiTable(table), 300);
    };
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
            else scheduleApiRefresh();
        });
        input.addEventListener("change", () => {
            if (client) applyClientTable(table);
            else scheduleApiRefresh();
        });
    });
    table.querySelectorAll("[data-bf-table-filter] input, [data-bf-table-filter] select, [data-bf-table-filter] textarea").forEach(input => {
        input.addEventListener("input", () => {
            if (input.closest("[data-bf-table-filter-form]")) return;
            if (client) applyClientTable(table);
            else scheduleApiRefresh();
        });
        input.addEventListener("change", () => {
            if (input.closest("[data-bf-table-filter-form]")) return;
            if (client) applyClientTable(table);
            else scheduleApiRefresh();
        });
    });
    filterForm?.addEventListener("submit", event => {
        event.preventDefault();
        table.__bfAppliedFilterValues = getFilterValues(table, true);
        const pageInput = table.querySelector("[data-table-page]");
        if (pageInput) pageInput.value = "1";
        table.dataset.page = "1";
        updateFilterCount(table);
        if (client) applyClientTable(table);
        else if (api) requestApiTable(table);
        else submitServerTable(table);
        closeModal(filterModal);
    });
    filterForm?.addEventListener("reset", () => {
        setTimeout(() => {
            filterForm.querySelectorAll("[data-bf-select]").forEach(select => {
                select.querySelectorAll(".bf-select-option.is-selected").forEach(option => option.classList.remove("is-selected"));
                syncSelect(select);
            });
            updateFilterCount(table);
        }, 0);
    });
    if (filterModal) {
        table.addEventListener("bookflow:modal:open", event => {
            if (event.target === filterModal) setFilterValues(table, table.__bfAppliedFilterValues);
        });
        table.addEventListener("bookflow:modal:close", event => {
            if (event.target === filterModal) setFilterValues(table, table.__bfAppliedFilterValues);
        });
    }
    table.querySelector(".bf-search-input")?.addEventListener("input", scheduleApiRefresh);
    table.querySelector("[data-table-reset]")?.addEventListener("click", () => {
        setTimeout(() => {
            if (client) {
                const pageInput = table.querySelector("[data-table-page]");
                if (pageInput) pageInput.value = "1";
                applyClientTable(table);
            } else scheduleApiRefresh();
        }, 0);
    });
    table.querySelectorAll("[data-table-action]").forEach(button => {
        button.addEventListener("click", () => {
            table.dispatchEvent(new CustomEvent("bookflow:table:action", { bubbles: true, detail: { action: button.dataset.tableAction, table } }));
        });
    });
    form.addEventListener("submit", event => {
        if (client || api) {
            event.preventDefault();
            clearTimeout(searchTimer);
            const pageInput = table.querySelector("[data-table-page]");
            if (pageInput) pageInput.value = "1";
            if (client) applyClientTable(table);
            else requestApiTable(table);
        }
    });
    table.addEventListener("bookflow:table:refresh", () => {
        if (client) applyClientTable(table);
        else {
            applyColumnAlignment(table);
            updatePagination(table);
        }
    });
    if (client) applyClientTable(table);
    else updatePagination(table);
}

export function initDataTables(root = document) {
    root.querySelectorAll?.("[data-bf-table]").forEach(initialize);
}
