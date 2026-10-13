import { closeModal, openModal } from "/js/components/modals.js?v=20261010-2";
import { setSelectDisabled, syncSelect } from "/js/components/forms/select.js";
import { applyServerFieldErrors, bindInlineValidation, validateForm } from "/js/components/forms/validation.js";
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
    const laTrangTacGia = page.dataset.pageKey === "authors";
    const coApiGhi = ["books", "genres", "publishers", "warehouses", "memberships", "versions", "suppliers"].includes(page.dataset.pageKey);
    const rowsKey = String(page.dataset.rowsKey || "").replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const endpoint = page.dataset.endpoint;
    const pageTitle = document.querySelector(".bf-admin-page-heading h1")?.textContent?.trim() || document.title.split("|")[0].trim();
    const defaultEmptyTitle = emptyState?.querySelector("strong")?.textContent || "Chưa có dữ liệu để hiển thị";
    const defaultEmptyDescription = emptyState?.querySelector("[data-table-empty-description]")?.textContent || "Dữ liệu sẽ xuất hiện tại đây.";
    let records = [];
    let busy = false;

    const toCamel = key => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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
                cell.append(makeAction("view", record.id));
                cell.append(makeAction("edit", record.id));
            } else if (laTrangTacGia && key === "anhDaiDienTepId") {
                const value = record[key];
                if (value) {
                    const image = document.createElement("img");
                    image.className = "bf-author-avatar";
                    image.src = `/api/tep-tin/${encodeURIComponent(value)}/noi-dung`;
                    image.alt = `Ảnh tác giả ${record.tenHienThi || record.hoTen || ""}`;
                    image.loading = "lazy";
                    cell.appendChild(image);
                } else {
                    cell.textContent = "—";
                }
                cell.dataset.searchValue = rawValue(value);
                cell.dataset.sortValue = rawValue(value);
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

    const getFieldValue = (field, record) => {
        if (!field) return undefined;
        const name = field.dataset.name || field.name;
        if (!name) return undefined;
        const parts = name.split(".");
        const value = parts.reduce((current, part) => current?.[toCamel(part)] ?? current?.[part], record);
        return value;
    };
    const setSelectValue = (select, value) => {
        if (!select) return;
        const normalized = new Set((Array.isArray(value) ? value : [value]).filter(item => item != null).map(String));
        select.querySelectorAll(".bf-select-option").forEach(option => {
            const selected = normalized.has(option.dataset.value);
            option.classList.toggle("is-selected", selected);
            option.setAttribute("aria-selected", String(selected));
        });
        syncSelect(select);
    };
    const getSelectedValues = select => [...(select?.querySelectorAll(".bf-select-option.is-selected") || [])].map(option => String(option.dataset.value || ""));
    const replaceOptions = (select, items, preserve = true) => {
        if (!select) return;
        const previous = preserve ? getSelectedValues(select) : [];
        const optionsBox = select.querySelector(".bf-select-options");
        if (!optionsBox) return;
        optionsBox.replaceChildren(...items.map(item => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "bf-select-option";
            option.dataset.value = String(item.value ?? "");
            option.dataset.label = String(item.label ?? item.value ?? "");
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            const label = document.createElement("span");
            label.className = "bf-select-option-label";
            label.textContent = option.dataset.label;
            const check = document.createElement("span");
            check.className = "bf-select-check";
            check.setAttribute("aria-hidden", "true");
            check.textContent = "✓";
            option.append(label, check);
            return option;
        }));
        select.querySelectorAll(".bf-select-option").forEach(option => option.classList.toggle("is-selected", previous.includes(option.dataset.value)));
        syncSelect(select);
    };
    const rowsFrom = (data, rowsKey) => {
        if (Array.isArray(data)) return data;
        const candidate = rowsKey ? data?.[rowsKey] : null;
        if (Array.isArray(candidate)) return candidate;
        return Object.values(data || {}).find(Array.isArray) || [];
    };
    const fetchAllOptions = async (url, rowsKey) => {
        const first = await request(`${url}${url.includes("?") ? "&" : "?"}trang=1&kich_thuoc=100`);
        const pagination = first?.phanTrang || first?.phan_trang || {};
        const pages = Math.max(1, Math.min(100, Number(pagination.tongTrang ?? pagination.tong_trang) || 1));
        const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) => request(`${url}${url.includes("?") ? "&" : "?"}trang=${index + 2}&kich_thuoc=100`)));
        return [first, ...rest].flatMap(data => rowsFrom(data, rowsKey));
    };
    let countriesDataPromise;
    let locationDataPromise;
    const getCountriesData = () => countriesDataPromise ||= fetch("/data/dia-chi/countries.json", { credentials: "same-origin" }).then(response => {
        if (!response.ok) throw new Error("Không tải được quốc gia.");
        return response.json();
    }).then(countries => countries.data || []);
    const getLocationData = () => locationDataPromise ||= Promise.all([
        getCountriesData(),
        fetch("/data/dia-chi/provinces.json", { credentials: "same-origin" }).then(response => { if (!response.ok) throw new Error("Không tải được tỉnh/thành."); return response.json(); }),
        fetch("/data/dia-chi/wards.json", { credentials: "same-origin" }).then(response => { if (!response.ok) throw new Error("Không tải được xã/phường."); return response.json(); })
    ]).then(([countries, provinces, wards]) => ({ countries, provinces: provinces.data || [], wards: wards.data || [] }));
    const addressGroupSelects = group => [...form.querySelectorAll(`[data-address-group="${CSS.escape(group)}"]`)];
    const addressRoleSelect = (group, role) => addressGroupSelects(group).find(select => select.dataset.addressRole === role);
    const refreshAddressGroup = async (group, preserve = true) => {
        const data = await getLocationData();
        const country = addressRoleSelect(group, "country");
        const province = addressRoleSelect(group, "province");
        const ward = addressRoleSelect(group, "ward");
        const countryCode = getSelectedValues(country)[0] || "";
        const provinceCode = getSelectedValues(province)[0] || "";
        const provinces = data.provinces.filter(item => item.countryCode === countryCode);
        const wards = data.wards.filter(item => item.provinceCode === provinceCode && item.countryCode === countryCode);
        if (province) {
            replaceOptions(province, provinces.map(item => ({ value: item.code, label: item.name })), preserve);
            setSelectDisabled(province, !countryCode || provinces.length === 0);
        }
        if (ward) {
            replaceOptions(ward, wards.map(item => ({ value: item.code, label: item.name })), preserve);
            setSelectDisabled(ward, !provinceCode || wards.length === 0);
        }
    };
    const loadDependentOptions = async select => {
        const template = select?.dataset.optionsEndpoint;
        if (!template) return;
        const dependency = select.dataset.optionsDependsOn;
        const parent = dependency ? document.getElementById(dependency) : null;
        const parentValue = parent ? getSelectedValues(parent)[0] || "" : "";
        if (template.includes("{") && !parentValue) {
            replaceOptions(select, [], false);
            setSelectDisabled(select, true);
            return;
        }
        const url = template.replace(/\{[^}]+\}/g, encodeURIComponent(parentValue));
        setSelectDisabled(select, false);
        const items = await fetchAllOptions(url, select.dataset.optionsRowsKey);
        const valueKey = select.dataset.optionsValueKey || "id";
        const labelKey = select.dataset.optionsLabelKey || "ten";
        const secondaryKey = select.dataset.optionsSecondaryKey;
        replaceOptions(select, items.map(item => ({
            value: item?.[valueKey],
            label: [item?.[labelKey] || item?.hoTen || item?.tenNhaCungCap || item?.tenNhaPhatHanh, secondaryKey ? item?.[secondaryKey] : ""].filter(Boolean).join(" — ")
        })).filter(item => item.value != null && item.label));
    };
    const loadCatalogFormOptions = async () => {
        if (!form) return;
        const selects = [...form.querySelectorAll("[data-bf-select]")];
        const countrySelects = selects.filter(select => select.dataset.addressRole === "country");
        if (countrySelects.length) {
            const countries = await getCountriesData();
            countrySelects.forEach(select => {
                replaceOptions(select, countries.map(item => ({ value: item.code, label: item.name })));
                setSelectDisabled(select, false);
            });
        }
        await Promise.all(selects.filter(select => select.dataset.optionsEndpoint && !select.dataset.optionsEndpoint.includes("{")).map(select => loadDependentOptions(select).catch(() => setSelectDisabled(select, true))));
        for (const group of new Set(selects.map(select => select.dataset.addressGroup).filter(Boolean))) {
            if (addressRoleSelect(group, "country") && (addressRoleSelect(group, "province") || addressRoleSelect(group, "ward"))) {
                setSelectDisabled(addressRoleSelect(group, "province"), true);
                setSelectDisabled(addressRoleSelect(group, "ward"), true);
                await refreshAddressGroup(group, false);
            }
        }
        await Promise.all(selects.filter(select => select.dataset.optionsEndpoint?.includes("{")).map(select => loadDependentOptions(select).catch(() => setSelectDisabled(select, true))));
    };
    const formOptionsReady = loadCatalogFormOptions().catch(error => {
        if (formError) {
            formError.textContent = error.message || "Không tải được dữ liệu để chọn.";
            formError.hidden = false;
        }
    });
    const resetForm = () => {
        form.reset();
        form.dataset.recordId = "";
        form.querySelectorAll("[data-readonly-on-edit] input, [data-readonly-on-edit] textarea, [data-readonly-on-edit] select, [data-readonly-on-edit] [data-bf-select]").forEach(field => {
            if (field.matches("[data-bf-select]")) setSelectDisabled(field, false);
            else field.disabled = false;
        });
        form.querySelectorAll(".bf-select[data-bf-select]").forEach(select => setSelectValue(select, ""));
        for (const group of new Set([...form.querySelectorAll("[data-address-group]")].map(select => select.dataset.addressGroup))) {
            setSelectDisabled(addressRoleSelect(group, "country"), false);
            setSelectDisabled(addressRoleSelect(group, "province"), true);
            setSelectDisabled(addressRoleSelect(group, "ward"), true);
        }
        form.querySelectorAll("[data-bf-field-error]").forEach(error => error.remove());
        form.querySelectorAll(".is-invalid").forEach(input => input.classList.remove("is-invalid"));
        form.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"));
        if (formError) { formError.hidden = true; formError.textContent = ""; }
        if (formNotice) formNotice.hidden = true;
        form.dispatchEvent(new CustomEvent("bookflow:catalog:form-reset"));
    };
    const setFormMode = async (mode, record = null) => {
        await formOptionsReady;
        resetForm();
        const editing = mode === "edit";
        form.dataset.mode = mode;
        form.dataset.recordId = editing ? String(record?.id ?? "") : "";
        formModal.querySelector(".bf-modal-title").textContent = editing ? `Chỉnh sửa ${pageTitle.toLocaleLowerCase("vi")}` : `Thêm mới ${pageTitle.toLocaleLowerCase("vi")}`;
        formModal.querySelector(".bf-modal-description").textContent = laTrangTacGia
            ? "Nhập thông tin tác giả. Ảnh đại diện hỗ trợ JPEG, PNG hoặc WebP."
            : editing && page.dataset.pageKey === "memberships"
                ? "Có thể cập nhật mã và ngày hết hạn. Khách hàng và hạng được giữ theo lịch sử hội viên."
                : `Nhập thông tin ${pageTitle.toLocaleLowerCase("vi")}.`;
        formModal.querySelector("[data-bf-modal-submit]").textContent = editing ? "Lưu thay đổi" : "Thêm mới";
        if (formError) { formError.hidden = true; formError.textContent = ""; }
        if (!editing) {
            const defaults = page.dataset.pageKey === "books"
                ? { loai_tac_pham: "SACH", la_tac_pham_dich: "false", la_tac_pham_doc_lap: "true" }
                : page.dataset.pageKey === "warehouses"
                    ? { loai_kho: "TONG_HOP", hinh_thuc_so_huu: "SO_HUU", phuong_phap_xuat_kho: "FIFO" }
                    : {};
            for (const [name, value] of Object.entries(defaults)) {
                const select = [...form.querySelectorAll("[data-bf-select]")].find(item => item.dataset.name === name);
                if (select) setSelectValue(select, value);
            }
            if (page.dataset.pageKey === "warehouses") {
                const country = addressRoleSelect("warehouse", "country");
                if (country?.querySelector('.bf-select-option[data-value="VN"]')) setSelectValue(country, "VN");
                await refreshAddressGroup("warehouse", false);
            }
        }
        if (!record) {
            for (const group of new Set([...form.querySelectorAll("[data-address-group]")].map(select => select.dataset.addressGroup))) {
                if (addressRoleSelect(group, "province") || addressRoleSelect(group, "ward")) await refreshAddressGroup(group, false);
            }
            for (const select of form.querySelectorAll("[data-options-endpoint*='{']")) await loadDependentOptions(select).catch(() => {});
            form.dispatchEvent(new CustomEvent("bookflow:catalog:form-mode", { detail: { mode, record: null } }));
            return;
        }
        const supplierAddress = page.dataset.pageKey === "suppliers"
            ? (record.diaChiNhaCungCap || record.diaChi || []).find(item => item.laMacDinh) || (record.diaChiNhaCungCap || record.diaChi || [])[0]
            : null;
        form.dataset.addressRecordId = supplierAddress?.id ? String(supplierAddress.id) : "";
        const fields = [...form.querySelectorAll("input, textarea, select, [data-bf-select]")];
        const addressNameValues = page.dataset.pageKey === "suppliers" ? {
            ma_tinh_thanh: supplierAddress?.maTinhThanh,
            dia_chi_chi_tiet: supplierAddress?.diaChiChiTiet,
            quoc_gia: record.quocGia || supplierAddress?.quocGia,
            ma_phuong_xa: supplierAddress?.maPhuongXa
        } : {};
        const applyFieldValue = (field, value) => {
            if (value === undefined || value === null) return;
            if (field.matches("[data-bf-select]")) {
                let selectedValue = value;
                if (field.dataset.addressRole === "country") {
                    const normalized = String(value).trim().toLocaleLowerCase("vi");
                    const match = field.querySelectorAll(".bf-select-option");
                    const country = [...match].find(option => option.dataset.value === String(value) || option.dataset.label.trim().toLocaleLowerCase("vi") === normalized);
                    if (country) selectedValue = country.dataset.value;
                }
                setSelectValue(field, selectedValue);
            } else if (field.type === "checkbox") {
                field.checked = Boolean(value);
            } else {
                if (field.matches(".bf-date-input")) {
                    const text = String(value);
                    if (field.dataset.dateType === "year") field.value = text.slice(0, 4);
                    else {
                        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
                        field.value = match ? `${match[3]}/${match[2]}/${match[1]}` : text;
                    }
                } else field.value = field.type === "date" ? String(value).slice(0, 10) : String(value);
            }
        };
        const countrySelects = [...form.querySelectorAll('[data-address-role="country"]')];
        fields.forEach(field => {
            const name = field.dataset.name || field.name;
            let value = addressNameValues[name];
            if (value === undefined) value = getFieldValue(field, record);
            if (field.matches('[data-address-role="province"], [data-address-role="ward"]')) return;
            applyFieldValue(field, value);
        });
        for (const country of countrySelects) {
            const group = country.dataset.addressGroup;
            const province = addressRoleSelect(group, "province");
            const ward = addressRoleSelect(group, "ward");
            if (!province && !ward) continue;
            await refreshAddressGroup(group, false);
            const provinceValue = addressNameValues[province?.dataset.name] ?? getFieldValue(province, record);
            if (provinceValue != null) setSelectValue(province, provinceValue);
            await refreshAddressGroup(group, false);
            const wardValue = addressNameValues[ward?.dataset.name] ?? getFieldValue(ward, record);
            if (wardValue != null) setSelectValue(ward, wardValue);
        }
        for (const select of form.querySelectorAll("[data-options-endpoint*='{']")) await loadDependentOptions(select).catch(() => {});
        if (page.dataset.pageKey === "books") {
            for (const relation of [
                { path: "tac-gia", field: "tac_gia_id", key: "tacGiaId" },
                { path: "the-loai", field: "the_loai_id", key: "theLoaiId" }
            ]) {
                const select = [...form.querySelectorAll("[data-bf-select]")].find(item => item.dataset.name === relation.field);
                const linked = rowsFrom(await request(`/api/sach/${encodeURIComponent(record.id)}/${relation.path}`));
                setSelectValue(select, linked.map(item => item[relation.key]));
            }
        }
        if (editing) form.querySelectorAll("[data-readonly-on-edit] input, [data-readonly-on-edit] textarea, [data-readonly-on-edit] select, [data-readonly-on-edit] [data-bf-select]").forEach(field => {
            if (field.matches("[data-bf-select]")) setSelectDisabled(field, true);
            else field.disabled = true;
        });
        form.dispatchEvent(new CustomEvent("bookflow:catalog:form-mode", { detail: { mode, record } }));
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
        const details = laTrangTacGia ? { ...record } : record;
        if (laTrangTacGia) delete details.anhDaiDienTepId;
        const rows = flattenDetails(details);
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
        viewDetails.dispatchEvent(new CustomEvent("bookflow:catalog:details-rendered", { detail: record }));
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
    table.addEventListener("bookflow:table:action", async event => {
        if (event.detail?.action !== "create-record") return;
        await setFormMode("create");
        openModal(formModal, event.target);
    });
    table.addEventListener("click", async event => {
        const button = event.target.closest("[data-catalog-action]");
        if (!button || busy) return;
        const record = records.find(item => String(item.id) === button.dataset.catalogId);
        if (!record) return;
        busy = true;
        try {
                const responseDetail = await request(`${endpoint}/${encodeURIComponent(record.id)}`);
                const detail = page.dataset.pageKey === "authors"
                    ? responseDetail?.tacGia || responseDetail?.author || responseDetail
                    : responseDetail;
            if (button.dataset.catalogAction === "view") {
                renderDetails(detail);
                viewModal.querySelector(".bf-modal-title").textContent = `Chi tiết ${pageTitle.toLocaleLowerCase("vi")}`;
                openModal(viewModal, button);
            } else {
                await setFormMode("edit", detail);
                openModal(formModal, button);
            }
        } catch (error) {
            window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không tải được chi tiết bản ghi." });
        } finally {
            busy = false;
        }
    });
    const formControl = name => [...form.querySelectorAll("input:not(.bf-select-search-input), textarea, select, [data-bf-select]")].find(control => (control.dataset.name || control.name) === name) || null;
    const taoPayload = () => {
        const payload = {};
        for (const [name, raw] of new FormData(form).entries()) {
            if (raw instanceof File || name.endsWith("Remove")) continue;
            const value = String(raw ?? "").trim();
            const control = formControl(name);
            if (!control) continue;
            if (control?.dataset.frontendOnly === "true") continue;
            if (form.dataset.mode === "edit" && control?.closest("[data-readonly-on-edit]")) continue;
            const required = Boolean(control?.required || control?.dataset.required === "true");
            if (!value) {
                if (required) payload[name] = null;
                else if (!control?.matches("[data-bf-select]")) payload[name] = null;
                continue;
            }
            if (control?.matches(".bf-number-input, .bf-money-input") || control?.type === "number") {
                const normalized = value.replace(/\./g, "").replace(",", ".");
                payload[name] = Number.isFinite(Number(normalized)) ? Number(normalized) : value;
            } else if (control?.matches(".bf-date-input") && control.dataset.dateType === "year") {
                payload[name] = Number(value);
            } else if (control?.matches(".bf-date-input")) {
                const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                const isoDate = match ? `${match[3]}-${match[2]}-${match[1]}` : value;
                payload[name] = page.dataset.pageKey === "memberships" && name === "ngay_het_han" ? `${isoDate}T23:59:59.000Z` : isoDate;
            } else if (control?.matches("[data-bf-select]") && name.endsWith("_id")) {
                payload[name] = Number(value);
            } else if (value === "true" || value === "false") {
                payload[name] = value === "true";
            } else {
                payload[name] = value;
            }
        }
        form.querySelectorAll("[data-derived-from] .bf-date-input").forEach(control => {
            if (control.name && control.value) payload[control.name] = Number(control.value);
        });
        form.querySelectorAll("[data-address-label-name]").forEach(select => {
            const selected = select.querySelector(".bf-select-option.is-selected");
            if (selected) payload[select.dataset.addressLabelName] = selected.dataset.label || null;
        });
        if (page.dataset.pageKey === "publishers" && !String(payload.ten_phap_ly || "").trim()) payload.ten_phap_ly = String(payload.ten_nha_xuat_ban || "").trim() || null;
        return payload;
    };
    const ghiDuLieu = async (url, method, payload) => {
        const response = await fetch(url, {
            method,
            credentials: "same-origin",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20000)
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) {
            const error = new Error(result?.error?.message || "Không lưu được dữ liệu.");
            error.details = result?.error?.details || [];
            throw error;
        }
        return normalizeApiData(result?.data ?? result);
    };
    const hienThiLoiGhi = (error, fallback) => {
        const hasFieldErrors = applyServerFieldErrors(form, error);
        if (formError) {
            formError.textContent = hasFieldErrors ? "" : error?.message || fallback;
            formError.hidden = hasFieldErrors;
        }
        return hasFieldErrors;
    };
    const uploadImageFiles = async wrapper => {
        const input = wrapper.querySelector(".bf-image-input");
        const files = [...(input?.files || [])];
        if (!files.length) return [];
        const data = new FormData();
        data.append("pham_vi_so_huu", "DON_VI");
        data.append("loai_tep", wrapper.dataset.uploadType || "KHAC");
        files.forEach(file => data.append("files", file, file.name));
        const response = await fetch("/api/tep-tin/upload", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" }, body: data });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) {
            const error = new Error(result?.error?.message || "Không upload được ảnh.");
            error.details = result?.error?.details || [];
            throw error;
        }
        const uploaded = (result?.data?.ketQua || []).filter(item => item.thanhCong && item.tep?.id).map(item => Number(item.tep.id));
        const failed = (result?.data?.ketQua || []).find(item => !item.thanhCong);
        if (failed || uploaded.length !== files.length) throw new Error(failed?.loi?.message || "Có ảnh chưa upload được.");
        return uploaded;
    };
    const uploadCatalogImages = async () => {
        const galleryIds = [];
        for (const wrapper of form.querySelectorAll("[data-bf-image]")) {
            const ids = await uploadImageFiles(wrapper);
            if (!ids.length) continue;
            const target = wrapper.dataset.imageTarget;
            if (target) {
                const valueInput = wrapper.querySelector(".bf-image-value");
                if (valueInput) valueInput.value = String(ids[0]);
                wrapper.querySelector(".bf-image-delete-state").value = "false";
            } else if (page.dataset.pageKey === "books") galleryIds.push(...ids);
        }
        return galleryIds;
    };
    const syncBookLinks = async bookId => {
        for (const relation of [
            { name: "tac-gia", field: "tac_gia_id", idKey: "tacGiaId", make: (id, index) => ({ tac_gia_id: id, vai_tro_dong_gop: "TAC_GIA", thu_tu_hien_thi: index + 1, la_nguoi_dong_gop_chinh: index === 0 }) },
            { name: "the-loai", field: "the_loai_id", idKey: "theLoaiId", make: (id, index) => ({ the_loai_id: id, la_the_loai_chinh: index === 0, thu_tu_hien_thi: index }) }
        ]) {
            const select = [...form.querySelectorAll("[data-bf-select]")].find(item => item.dataset.name === relation.field);
            const desired = getSelectedValues(select).map(Number).filter(Number.isFinite);
            const currentResponse = await request(`/api/sach/${encodeURIComponent(bookId)}/${relation.name}`);
            const currentItems = rowsFrom(currentResponse);
            const currentIds = new Map(currentItems.map(item => [Number(item[relation.idKey]), item]));
            for (const [id, item] of currentIds) if (!desired.includes(id)) await fetch(`/api/sach/${encodeURIComponent(bookId)}/${relation.name}/${encodeURIComponent(item.id)}`, { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } }).then(async response => {
                const result = await response.json().catch(() => null);
                if (!response.ok || result?.success === false) throw new Error(result?.error?.message || "Không cập nhật được liên kết của sách.");
            });
            for (const [index, id] of desired.entries()) if (!currentIds.has(id)) await ghiDuLieu(`/api/sach/${encodeURIComponent(bookId)}/${relation.name}`, "POST", relation.make(id, index));
        }
    };
    const attachBookImages = async (bookId, imageIds) => {
        if (!imageIds.length) return;
        await ghiDuLieu(`/api/sach/${encodeURIComponent(bookId)}/anh`, "POST", {
            anh: imageIds.map((id, index) => ({ tep_dinh_kem_id: id, loai_anh: "ANH_BEN_TRONG", thu_tu: index, la_anh_chinh: false, hien_thi_cong_khai: true }))
        });
    };
    const saveSupplierAddress = async supplierId => {
        const detail = String(formControl("dia_chi_chi_tiet")?.value || "").trim();
        const province = addressRoleSelect("supplier", "province");
        const ward = addressRoleSelect("supplier", "ward");
        const country = addressRoleSelect("supplier", "country");
        const countryCode = getSelectedValues(country)[0] || "";
        const provinceCode = getSelectedValues(province)[0] || "";
        const wardCode = getSelectedValues(ward)[0] || "";
        const provinceOption = province?.querySelector(".bf-select-option.is-selected");
        const wardOption = ward?.querySelector(".bf-select-option.is-selected");
        const body = {
            ma_dia_chi: "TRU_SO",
            ten_dia_chi: "Trụ sở",
            loai_dia_chi: "TRU_SO",
            dia_chi_chi_tiet: detail,
            quoc_gia: countryCode || "VN",
            ma_tinh_thanh: provinceCode || null,
            ten_tinh_thanh: provinceOption?.dataset.label || null,
            ma_phuong_xa: wardCode || null,
            ten_phuong_xa: wardOption?.dataset.label || null,
            la_mac_dinh: true
        };
        if (!detail && !countryCode && !provinceCode && !wardCode) return;
        const addressId = form.dataset.addressRecordId;
        const url = `/api/nha-cung-cap/${encodeURIComponent(supplierId)}/dia-chi${addressId ? `/${encodeURIComponent(addressId)}` : ""}`;
        await ghiDuLieu(url, addressId ? "PATCH" : "POST", body);
    };
    form.addEventListener("change", event => {
        const select = event.target.closest?.("[data-bf-select]");
        if (select?.dataset.addressRole === "country") {
            const group = select.dataset.addressGroup;
            const province = addressRoleSelect(group, "province");
            const ward = addressRoleSelect(group, "ward");
            if (province) setSelectValue(province, "");
            if (ward) setSelectValue(ward, "");
            if (province || ward) refreshAddressGroup(group, false).catch(() => {});
        } else if (select?.dataset.addressRole === "province") {
            const ward = addressRoleSelect(select.dataset.addressGroup, "ward");
            if (ward) setSelectValue(ward, "");
            refreshAddressGroup(select.dataset.addressGroup, false).catch(() => {});
        }
        if (select?.id) form.querySelectorAll(`[data-options-depends-on="${CSS.escape(select.id)}"]`).forEach(child => {
            setSelectValue(child, "");
            loadDependentOptions(child).catch(() => setSelectDisabled(child, true));
        });
    });
    form.addEventListener("input", event => {
        const input = event.target.closest?.('[data-phone-chars-only="true"]');
        if (!input) return;
        const caret = input.selectionStart ?? input.value.length;
        const before = input.value.slice(0, caret);
        let value = input.value.replace(/\D/g, "");
        if (input.value.trimStart().startsWith("+")) value = `+${value}`;
        input.value = value;
        const nextCaret = Math.min(value.length, before.replace(/\D/g, "").length + (before.includes("+") ? 1 : 0));
        try { input.setSelectionRange(nextCaret, nextCaret); } catch {}
    });
    form.addEventListener("bookflow:catalog:form-mode", event => {
        const record = event.detail?.record;
        form.querySelectorAll("[data-bf-image][data-image-target]").forEach(wrapper => {
            const key = toCamel(wrapper.dataset.imageTarget);
            const value = record?.[key];
            wrapper.dispatchEvent(new CustomEvent("bookflow:image:set-existing", {
                detail: { value: value ? String(value) : "", src: value ? `/api/tep-tin/${encodeURIComponent(value)}/noi-dung` : "" }
            }));
        });
    });
    form.addEventListener("submit", async event => {
        if (laTrangTacGia) return;
        event.preventDefault();
        if (formError) { formError.hidden = true; formError.textContent = ""; }
        if (formNotice) formNotice.hidden = true;
        if (busy) return;
        const valid = validateForm(form);
        if (!coApiGhi) {
            if (!valid && formError) {
                formError.textContent = "Vui lòng kiểm tra các trường được đánh dấu bên dưới.";
                formError.hidden = false;
            } else if (valid && formNotice) {
                formNotice.textContent = "Dữ liệu đã hợp lệ ở phía giao diện. API tạo mới/cập nhật chưa được gọi.";
                formNotice.hidden = false;
            }
            return;
        }
        busy = true;
        const submit = formModal.querySelector("[data-bf-modal-submit]");
        if (submit) submit.disabled = true;
        const editing = form.dataset.mode === "edit";
        const recordId = form.dataset.recordId;
        const method = editing ? "PATCH" : "POST";
        const url = editing ? `${endpoint}/${encodeURIComponent(recordId)}` : endpoint;
        let payload = taoPayload();
        try {
            await ghiDuLieu(url, method, { ...payload, kiem_tra: true });
            if (!valid) {
                if (formError) {
                    formError.textContent = "Vui lòng kiểm tra các trường được đánh dấu bên dưới.";
                    formError.hidden = false;
                }
                return;
            }
            const galleryImageIds = await uploadCatalogImages();
            payload = taoPayload();
            if (galleryImageIds.length || form.querySelector("[data-bf-image] .bf-image-input")?.files?.length) await ghiDuLieu(url, method, { ...payload, kiem_tra: true });
            const saved = await ghiDuLieu(url, method, payload);
            if (page.dataset.pageKey === "books") {
                const bookId = saved.id || recordId;
                await syncBookLinks(bookId);
                await attachBookImages(bookId, galleryImageIds);
            }
            if (page.dataset.pageKey === "suppliers") await saveSupplierAddress(saved.id || recordId);
            closeModal(formModal);
            window.BookFlowFeedback?.toast({ type: "success", message: editing ? `Đã cập nhật ${pageTitle.toLocaleLowerCase("vi")}.` : `Đã thêm ${pageTitle.toLocaleLowerCase("vi")}.` });
            await apiTable.load();
        } catch (error) {
            hienThiLoiGhi(error, "Không lưu được dữ liệu.");
        } finally {
            busy = false;
            if (submit) submit.disabled = false;
        }
    });
    initDataTables(document);
    loadFilterOptions().finally(() => {
        apiTable.load({ filters: readFilters() });
    });
}
