function getValue(source, keys, fallback) {
    for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null) return value;
    }
    return fallback;
}

function makeParams(table, state, queryNames, extraParams) {
    const params = new URLSearchParams();
    const searchInput = table.querySelector(".bf-search-input");
    const values = {
        page: state.page,
        pageSize: state.pageSize,
        search: state.search ?? searchInput?.value.trim() ?? "",
        sort: state.sort || table.dataset.sort || "",
        order: state.order || table.dataset.order || "asc"
    };
    Object.entries(queryNames).forEach(([key, name]) => {
        const value = values[key];
        if (name && value !== "" && value !== undefined && value !== null) params.set(name, String(value));
    });
    Object.entries(extraParams?.(state) || {}).forEach(([name, value]) => {
        if (!name || value === "" || value === undefined || value === null) return;
        if (Array.isArray(value)) {
            value.filter(item => item !== "" && item !== undefined && item !== null).forEach(item => {
                params.append(name.endsWith("[]") ? name : `${name}[]`, String(item));
            });
        } else {
            params.set(name, String(value));
        }
    });
    return params;
}

export function bindApiTable(table, {
    endpoint,
    rowsKeys,
    paginationKeys = ["phanTrang", "phan_trang", "pagination"],
    queryNames = { page: "trang", pageSize: "kichThuoc", search: "tuKhoa", sort: "sort", order: "order" },
    extraParams,
    normalize = value => value,
    onRows,
    onError
}) {
    let sequence = 0;

    const load = async (state = {}) => {
        const requestId = ++sequence;
        const pageInput = table.querySelector("[data-table-page]");
        const pageSizeInput = table.querySelector("[data-table-page-size]");
        const page = Math.max(1, Number(state.page) || Number(pageInput?.value) || Number(table.dataset.page) || 1);
        const pageSize = Math.max(1, Number(state.pageSize) || Number(pageSizeInput?.value) || Number(table.dataset.pageSize) || 20);
        const params = makeParams(table, { ...state, page, pageSize }, queryNames, extraParams);

        try {
            const response = await fetch(`${endpoint}?${params}`, {
                credentials: "same-origin",
                headers: { Accept: "application/json" },
                signal: AbortSignal.timeout(20000)
            });
            const result = await response.json();
            if (!response.ok || result?.success === false) {
                const error = new Error(result?.error?.message || "Không tải được dữ liệu.");
                error.details = result?.error?.details || [];
                throw error;
            }
            if (requestId !== sequence) return;

            const data = normalize(result?.data ?? result);
            const rows = getValue(data, rowsKeys, []);
            const pagination = getValue(data, paginationKeys, {});
            if (!Array.isArray(rows)) throw new Error("API không trả về danh sách dữ liệu hợp lệ.");

            const total = Number(getValue(pagination, ["tongSo", "tong_so", "total", "tong"], rows.length)) || 0;
            const pageSizeResult = Number(getValue(pagination, ["kichThuoc", "kich_thuoc", "pageSize"], pageSize)) || pageSize;
            const pages = Math.max(1, Number(getValue(pagination, ["tongTrang", "tong_trang", "totalPages"], Math.ceil(total / pageSizeResult))) || 1);
            const pageResult = Math.min(pages, Math.max(1, Number(getValue(pagination, ["trang", "page"], page)) || page));
            if (pageResult !== page) {
                return load({ ...state, page: pageResult, pageSize: pageSizeResult });
            }

            table.dataset.page = String(pageResult);
            table.dataset.pageSize = String(pageSizeResult);
            table.dataset.total = String(total);
            table.dataset.pages = String(pages);
            table.dataset.loading = "false";
            if (pageInput) pageInput.value = String(pageResult);
            if (pageSizeInput) pageSizeInput.value = String(pageSizeResult);
            onRows?.(rows, { data, pagination, page: pageResult, pageSize: pageSizeResult, total, pages, offset: (pageResult - 1) * pageSizeResult });
            table.dispatchEvent(new CustomEvent("bookflow:table:refresh"));
        } catch (error) {
            if (requestId !== sequence) return;
            table.dataset.loading = "false";
            table.dataset.page = "1";
            table.dataset.total = "0";
            table.dataset.pages = "1";
            if (pageInput) pageInput.value = "1";
            onError?.(error);
            table.dispatchEvent(new CustomEvent("bookflow:table:refresh"));
        }
    };

    table.addEventListener("bookflow:table:request", event => load(event.detail || {}));
    return { load };
}
