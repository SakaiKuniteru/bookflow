import { closeModal, openModal } from "/js/components/modals.js?v=20261010-2";
import { syncSelect } from "/js/components/forms/select.js";
import { bindInlineValidation, validateForm } from "/js/components/forms/validation.js";
import { initDataTables } from "/js/components/tables.js?v=20261010-3";
import { bindApiTable } from "/js/components/api-table.js";

const page = document.querySelector("[data-catalog-page]");

if (page) {
    const table = page.querySelector("[data-bf-table]");
    const tableBody = table?.querySelector("[data-bf-table-body]");
    const emptyState = table?.querySelector("[data-bf-table-empty]");
    const formModal = document.querySelector("#catalog-form-modal");
    const form = document.querySelector("[data-catalog-form]");
    const viewModal = document.querySelector("#catalog-view-modal");
    const viewDetails = viewModal?.querySelector("[data-catalog-view-details]");
    const formError = form?.querySelector("[data-catalog-form-error]");
    const formNotice = form?.querySelector("[data-catalog-form-notice]");
    const rowsKey = String(page.dataset.rowsKey || "").replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const endpoint = page.dataset.endpoint;
    const pageTitle = document.querySelector(".bf-admin-page-heading h1")?.textContent?.trim() || document.title.split("|")[0].trim();
    const defaultEmptyTitle = emptyState?.querySelector("strong")?.textContent || "Chưa có dữ liệu để hiển thị";
    const defaultEmptyDescription = emptyState?.querySelector("[data-table-empty-description]")?.textContent || "Dữ liệu sẽ xuất hiện tại đây.";
    let records = [];
    let busy = false;

    const toCamel = key => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const toSnake = key => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const normalizeApiData = value => {
        if (Array.isArray(value)) return value.map(normalizeApiData);
        if (value === null || typeof value !== "object" || value instanceof Date) return value;
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [toCamel(key), normalizeApiData(item)]));
    };
    const request = async url => {
        const response = await fetch(url, {
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
        return normalizeApiData(result?.data ?? result);
    };
    const statusLabels = {
        DANG_DUNG: "Đang dùng", TAM_AN: "Tạm ẩn", NGUNG_DUNG: "Ngừng dùng",
        TAM_NGUNG: "Tạm ngưng", NGUNG_HOP_TAC: "Ngừng hợp tác", DANG_HOP_TAC: "Đang hợp tác",
        NGUNG_CUNG_UNG: "Ngừng cung ứng", DANG_CUNG_UNG: "Đang cung ứng",
        TIEM_NANG: "Tiềm năng", DANH_SACH_DEN: "Danh sách đen", DANG_HOAT_DONG: "Đang hoạt động",
        CHUAN_BI: "Chuẩn bị", DANG_KIEM_KE: "Đang kiểm kê", NGUNG_HOAT_DONG: "Ngừng hoạt động", NHAP: "Bản nháp", CHO_DUYET: "Chờ duyệt",
        DANG_HIEN_THI: "Đang hiển thị", NGUNG_KINH_DOANH: "Ngừng kinh doanh",
        NGUNG_PHAT_HANH: "Ngừng phát hành", HOAT_DONG: "Hoạt động", TAM_KHOA: "Tạm khóa",
        HET_HAN: "Hết hạn", SACH: "Sách", TRUYEN_TRANH: "Truyện tranh", GIAO_TRINH: "Giáo trình",
        TAP_CHI: "Tạp chí", SACH_IN: "Sách in", EBOOK: "Ebook", SACH_NOI: "Sách nói",
        BIA_MEM: "Bìa mềm", BIA_CUNG: "Bìa cứng", BIA_GAP: "Bìa gập", TONG_HOP: "Tổng hợp",
        BAN_HANG: "Bán hàng", DU_TRU: "Dự trữ", TRUNG_CHUYEN: "Trung chuyển", NHAN_HANG: "Nhận hàng",
        TRA_HANG: "Trả hàng", CACH_LY: "Cách ly", KY_GUI: "Ký gửi", SO_HUU: "Sở hữu",
        THUE: "Thuê", THUE_NGOAI: "Thuê ngoài", DOI_TAC: "Đối tác", FIFO: "FIFO", FEFO: "FEFO",
        THU_CONG: "Thủ công", CA_NHAN: "Cá nhân", HO_KINH_DOANH: "Hộ kinh doanh",
        DOANH_NGHIEP: "Doanh nghiệp", NHA_XUAT_BAN: "Nhà xuất bản", NHA_PHAN_PHOI: "Nhà phân phối",
        TIEN_MAT: "Tiền mặt", CHUYEN_KHOAN: "Chuyển khoản", CONG_NO: "Công nợ"
    };
    const formatDate = value => {
        if (!value) return "";
        const text = String(value);
        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return text;
        return `${match[3]}/${match[2]}/${match[1]}`;
    };
    const formatValue = (value, key = "") => {
        if (value == null || value === "") return "—";
        if (typeof value === "boolean") return value ? "Có" : "Không";
        if (Array.isArray(value)) return value.map(item => formatValue(item)).join(", ");
        if (typeof value === "object") return JSON.stringify(value);
        const text = String(value);
        if (/^(ngay|thoiDiem|hieuLuc)/i.test(key) && /^\d{4}-\d{2}-\d{2}/.test(text)) return formatDate(text);
        return statusLabels[text] || text;
    };
    const rawValue = value => value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    const setEmpty = (title, description) => {
        if (!emptyState) return;
        const heading = emptyState.querySelector("strong");
        const detail = emptyState.querySelector("[data-table-empty-description]");
        if (heading) heading.textContent = title;
        if (detail) detail.textContent = description;
        emptyState.hidden = false;
    };
    const makeAction = (type, recordId) => {
        const configs = {
            view: { label: `Xem chi tiết ${pageTitle.toLocaleLowerCase("vi")}`, svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>' },
            edit: { label: `Chỉnh sửa ${pageTitle.toLocaleLowerCase("vi")}`, svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z"></path></svg>' }
        };
        const button = document.createElement("button");
        button.type = "button";
        button.className = `bf-branch-icon-action bf-branch-icon-${type}`;
        button.dataset.catalogAction = type;
        button.dataset.catalogId = String(recordId);
        button.setAttribute("aria-label", configs[type].label);
        button.title = configs[type].label;
        button.innerHTML = configs[type].svg;
        return button;
    };
    const columnHeaders = () => [...table.querySelectorAll("thead tr:first-child th")].map(header => ({
        key: header.dataset.columnKey,
        type: header.dataset.sortType || "text",
        label: header.querySelector(".bf-table-sort span")?.textContent?.trim() || header.textContent.trim()
    }));
    const sortedRows = rows => {
        const key = table.dataset.sort;
        const direction = table.dataset.order === "desc" ? -1 : 1;
        const header = columnHeaders().find(item => item.key === key);
        if (!header || !key || key === "actions" || key === "stt") return rows;
        return [...rows].sort((left, right) => {
            const a = left?.[key];
            const b = right?.[key];
            if (a == null || a === "") return b == null || b === "" ? 0 : 1;
            if (b == null || b === "") return -1;
            if (header.type === "number") return (Number(a) - Number(b)) * direction;
            if (header.type === "date") return (new Date(a).getTime() - new Date(b).getTime()) * direction;
            return String(a).localeCompare(String(b), "vi", { numeric: true, sensitivity: "base" }) * direction;
        });
    };
    const renderRow = (record, index, headers) => {
        const row = document.createElement("tr");
        row.dataset.tableRow = "true";
        row.dataset.catalogRecord = JSON.stringify(record);
        row.dataset.searchText = Object.values(record).map(rawValue).join(" ");
        row.dataset.filterValues = "{}";
        headers.forEach(({ key }) => {
            const cell = document.createElement("td");
            cell.dataset.columnKey = key;
            if (key === "actions") {
                cell.className = "bf-branch-row-actions";
                cell.append(makeAction("view", record.id), makeAction("edit", record.id));
            } else {
                const value = key === "stt" ? index : record[key];
                const display = key === "stt" ? String(index) : formatValue(value, key);
                cell.textContent = display;
                cell.dataset.searchValue = rawValue(value);
                cell.dataset.sortValue = rawValue(value);
            }
            row.appendChild(cell);
        });
        return row;
    };
    const renderRows = (items, offset = 0) => {
        const headers = columnHeaders();
        const ordered = sortedRows(items);
        tableBody.replaceChildren(...ordered.map((record, index) => renderRow(record, offset + index + 1, headers)));
        table.dataset.loading = "false";
        if (emptyState) {
            emptyState.hidden = ordered.length > 0;
            if (!ordered.length) setEmpty(defaultEmptyTitle, defaultEmptyDescription);
        }
    };
    const readFilters = () => {
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
    };
    const apiTable = bindApiTable(table, {
        endpoint,
        rowsKeys: [rowsKey],
        paginationKeys: ["phanTrang", "phan_trang"],
        queryNames: { page: "trang", pageSize: "kich_thuoc", search: "tu_khoa" },
        extraParams: state => state.filters || readFilters(),
        normalize: normalizeApiData,
        onRows(items, { offset }) {
            records = items;
            renderRows(items, offset);
        },
        onError(error) {
            records = [];
            tableBody.replaceChildren();
            table.dataset.loading = "false";
            setEmpty(`Không tải được ${pageTitle.toLocaleLowerCase("vi")}`, error.message || "Vui lòng kiểm tra quyền truy cập rồi thử lại.");
        }
    });

    const getFieldValue = field => {
        const name = field.dataset.name || field.name;
        if (!name) return undefined;
        const parts = name.split(".");
        const value = parts.reduce((current, part) => current?.[toCamel(part)], undefined);
        return value;
    };
    const setSelectValue = (select, value) => {
        if (!select) return;
        const normalized = value == null ? "" : String(value);
        select.querySelectorAll(".bf-select-option").forEach(option => {
            const selected = option.dataset.value === normalized;
            option.classList.toggle("is-selected", selected);
            option.setAttribute("aria-selected", String(selected));
        });
        syncSelect(select);
    };
    const resetForm = () => {
        form.reset();
        form.dataset.recordId = "";
        form.querySelectorAll(".bf-select[data-bf-select]").forEach(select => setSelectValue(select, ""));
        form.querySelectorAll("[data-bf-field-error]").forEach(error => error.remove());
        form.querySelectorAll(".is-invalid").forEach(input => input.classList.remove("is-invalid"));
        form.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"));
        if (formError) { formError.hidden = true; formError.textContent = ""; }
        if (formNotice) formNotice.hidden = true;
    };
    const setFormMode = (mode, record = null) => {
        resetForm();
        const editing = mode === "edit";
        form.dataset.mode = mode;
        form.dataset.recordId = editing ? String(record?.id ?? "") : "";
        formModal.querySelector(".bf-modal-title").textContent = editing ? `Chỉnh sửa ${pageTitle.toLocaleLowerCase("vi")}` : `Thêm mới ${pageTitle.toLocaleLowerCase("vi")}`;
        formModal.querySelector(".bf-modal-description").textContent = "Biểu mẫu đang ở chế độ giao diện; thao tác lưu chưa được nối API.";
        formModal.querySelector("[data-bf-modal-submit]").textContent = editing ? "Lưu thay đổi" : "Thêm mới";
        if (!record) return;
        const fields = [...form.querySelectorAll("input, textarea, select, [data-bf-select]")];
        fields.forEach(field => {
            const value = getFieldValue(field);
            if (value === undefined || value === null) return;
            if (field.matches("[data-bf-select]")) {
                setSelectValue(field, value);
            } else if (field.type === "checkbox") {
                field.checked = Boolean(value);
            } else {
                field.value = field.type === "date" ? String(value).slice(0, 10) : String(value);
            }
        });
    };
    const labelFor = key => {
        const normalized = toCamel(key.split(".").at(-1));
        const field = [...form.querySelectorAll("[data-form-field]")].find(container => {
            const control = container.querySelector("input, textarea, select, [data-bf-select]");
            return control && toCamel(control.dataset.name || control.name || "") === normalized;
        });
        return field?.querySelector(".bf-form-label")?.textContent?.replace("*", "").trim() || columnHeaders().find(header => header.key === normalized)?.label || normalized.replace(/([A-Z])/g, " $1").replace(/^./, letter => letter.toLocaleUpperCase("vi"));
    };
    const flattenDetails = (value, prefix = "", output = []) => {
        if (value === null || value === undefined || value === "") return output;
        if (Array.isArray(value)) {
            output.push([prefix, value.map(item => typeof item === "object" ? JSON.stringify(item) : formatValue(item)).join("; ") || "—"]);
            return output;
        }
        if (typeof value === "object") {
            Object.entries(value).forEach(([key, child]) => flattenDetails(child, prefix ? `${prefix}.${key}` : key, output));
            return output;
        }
        const lastKey = prefix.split(".").at(-1) || prefix;
        const label = labelFor(lastKey);
        const pathLabel = prefix.includes(".") ? `${prefix.split(".").slice(0, -1).map(part => labelFor(part)).join(" · ")} · ${label}` : label;
        output.push([pathLabel, formatValue(value, lastKey)]);
        return output;
    };
    const renderDetails = record => {
        const rows = flattenDetails(record);
        viewDetails.replaceChildren(...rows.map(([label, value]) => {
            const field = document.createElement("div");
            field.className = "bf-form-field";
            const labelNode = document.createElement("span");
            labelNode.className = "bf-form-label";
            labelNode.textContent = label;
            const valueNode = document.createElement("p");
            valueNode.className = "bf-form-help";
            valueNode.textContent = value;
            field.append(labelNode, valueNode);
            return field;
        }));
    };
    const loadFilterOptions = async () => {
        const optionFilters = [...table.querySelectorAll("[data-bf-table-filter][data-options-endpoint]")];
        await Promise.all(optionFilters.map(async filter => {
            const select = filter.querySelector("[data-bf-select]");
            const optionsBox = select?.querySelector(".bf-select-options");
            if (!select || !optionsBox) return;
            const endpoint = filter.dataset.optionsEndpoint;
            const rowsKey = filter.dataset.optionsRowsKey;
            const getItems = data => Array.isArray(data) ? data : data?.[rowsKey] || data?.danhSach || data?.danh_sach || [];
            const loadPage = async pageNumber => {
                const params = new URLSearchParams({ trang: String(pageNumber), kich_thuoc: "100" });
                return request(`${endpoint}?${params}`);
            };
            try {
                const firstPage = await loadPage(1);
                const pagination = firstPage?.phanTrang || firstPage?.phan_trang || {};
                const totalPages = Math.max(1, Number(pagination.tongTrang ?? pagination.tong_trang) || 1);
                const remainingPages = await Promise.all(
                    Array.from({ length: totalPages - 1 }, (_, index) => loadPage(index + 2))
                );
                const items = [firstPage, ...remainingPages].flatMap(getItems);
                const valueKey = filter.dataset.optionsValueKey || "id";
                const labelKey = filter.dataset.optionsLabelKey || "ten";
                const secondaryKey = filter.dataset.optionsSecondaryKey;
                const defaultOption = [...optionsBox.querySelectorAll(".bf-select-option")].find(option => option.dataset.value === "");
                const options = [{ value: "", label: defaultOption?.dataset.label || "Tất cả" }, ...items.map(item => {
                    const primary = item?.[labelKey];
                    const secondary = secondaryKey ? item?.[secondaryKey] : "";
                    return { value: item?.[valueKey], label: [primary, secondary].filter(Boolean).join(" — ") };
                }).filter(option => option.value != null && option.label)];
                optionsBox.replaceChildren(...options.map(item => {
                    const option = document.createElement("button");
                    option.type = "button";
                    option.className = "bf-select-option";
                    option.dataset.value = String(item.value);
                    option.dataset.label = item.label;
                    option.setAttribute("role", "option");
                    option.setAttribute("aria-selected", "false");
                    const label = document.createElement("span");
                    label.className = "bf-select-option-label";
                    label.textContent = item.label;
                    const check = document.createElement("span");
                    check.className = "bf-select-check";
                    check.setAttribute("aria-hidden", "true");
                    check.textContent = "✓";
                    option.append(label, check);
                    return option;
                }));
                setSelectValue(select, "");
            } catch {
                filter.dataset.optionsUnavailable = "true";
            }
        }));
    };

    bindInlineValidation(form);
    table.addEventListener("bookflow:table:action", event => {
        if (event.detail?.action !== "create-record") return;
        setFormMode("create");
        openModal(formModal, event.target);
    });
    table.addEventListener("click", async event => {
        const button = event.target.closest("[data-catalog-action]");
        if (!button || busy) return;
        const record = records.find(item => String(item.id) === button.dataset.catalogId);
        if (!record) return;
        busy = true;
        try {
            const detail = await request(`${endpoint}/${encodeURIComponent(record.id)}`);
            if (button.dataset.catalogAction === "view") {
                renderDetails(detail);
                viewModal.querySelector(".bf-modal-title").textContent = `Chi tiết ${pageTitle.toLocaleLowerCase("vi")}`;
                openModal(viewModal, button);
            } else {
                setFormMode("edit", detail);
                openModal(formModal, button);
            }
        } catch (error) {
            window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không tải được chi tiết bản ghi." });
        } finally {
            busy = false;
        }
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (formError) { formError.hidden = true; formError.textContent = ""; }
        if (formNotice) formNotice.hidden = true;
        const valid = validateForm(form);
        if (!valid) {
            if (formError) {
                formError.textContent = "Vui lòng kiểm tra các trường được đánh dấu bên dưới.";
                formError.hidden = false;
            }
            return;
        }
        if (formNotice) {
            formNotice.textContent = "Dữ liệu đã hợp lệ ở phía giao diện. API tạo mới/cập nhật chưa được gọi.";
            formNotice.hidden = false;
        }
    });

    initDataTables(document);
    loadFilterOptions().finally(() => {
        apiTable.load({ filters: readFilters() });
    });
}
