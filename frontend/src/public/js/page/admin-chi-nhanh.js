import { closeModal, openModal } from "/js/components/modals.js";
import { hideLoading, showLoading } from "/js/components/feedback.js";
import { setSelectDisabled, syncSelect } from "/js/components/forms/select.js";
import { bindInlineValidation, validateForm } from "/js/components/forms/validation.js";
const table = document.querySelector(".bf-branch-page [data-bf-table]");
if (table) {
    const body = table.querySelector("[data-bf-table-body]");
    const modal = document.querySelector("#branch-create-modal");
    const deleteModal = document.createElement("div");
    deleteModal.className = "bf-modal";
    deleteModal.dataset.bfModal = "";
    deleteModal.dataset.modalSize = "sm";
    deleteModal.dataset.closeOnBackdrop = "true";
    deleteModal.dataset.loading = "false";
    deleteModal.setAttribute("role", "dialog");
    deleteModal.setAttribute("aria-modal", "true");
    deleteModal.setAttribute("aria-hidden", "true");
    deleteModal.setAttribute("aria-labelledby", "branch-delete-title");
    deleteModal.hidden = true;
    deleteModal.innerHTML = `<button type="button" class="bf-modal-backdrop" data-bf-modal-backdrop aria-label="Đóng cửa sổ"></button><section class="bf-modal-dialog"><header class="bf-modal-header"><div class="bf-modal-heading"><h2 id="branch-delete-title" class="bf-modal-title">Xác nhận xóa chi nhánh</h2><p class="bf-modal-description">Thao tác này sẽ ẩn chi nhánh khỏi danh sách và giữ lại dữ liệu lịch sử.</p></div><button type="button" class="bf-modal-close" data-bf-modal-close aria-label="Đóng">×</button></header><div class="bf-modal-body"><div class="bf-modal-confirm bf-modal-confirm-danger"><p class="bf-modal-confirm-message" data-branch-delete-message></p></div></div><footer class="bf-modal-footer"><button type="button" class="bf-btn bf-btn-secondary bf-btn-md" data-bf-modal-close>Hủy</button><div class="bf-modal-footer-actions"><button type="button" class="bf-btn bf-btn-danger bf-btn-md" data-branch-delete-confirm>Xóa chi nhánh</button></div></footer></section></div>`;
    document.body.appendChild(deleteModal);
    let branchPendingDelete = null;
    const form = document.querySelector("[data-branch-create-form]");
    bindInlineValidation(form);
    const formError = document.querySelector("[data-branch-create-error]");
    const empty = table.querySelector("[data-bf-table-empty]");
    let busy = false;
    const fail = message => { throw new Error(message); };
    const setEmpty = (title, description) => {
        if (!empty) return;
        const heading = empty.querySelector("strong");
        const detail = empty.querySelector("[data-table-empty-description]");
        if (heading) heading.textContent = title;
        if (detail) detail.textContent = description;
        empty.hidden = false;
    };
    const setSelectValue = (id, value) => {
        const select = form.querySelector(`#${id}`);
        if (!select) return;
        select.querySelectorAll(".bf-select-option").forEach(option => {
            const selected = option.dataset.value === String(value ?? "");
            option.classList.toggle("is-selected", selected);
            option.setAttribute("aria-selected", String(selected));
        });
        syncSelect(select);
    };
    const provinceData = [];
    let wardData = [];
    const selectById = id => form.querySelector(`#${id}`);
    const selectedValue = id => selectById(id)?.querySelector(".bf-select-option.is-selected")?.dataset.value || "";
    const selectedLabel = id => selectById(id)?.querySelector(".bf-select-option.is-selected")?.dataset.label || "";
    const setSelectOptions = (id, rows) => {
        const select = selectById(id);
        const optionsBox = select?.querySelector(".bf-select-options");
        if (!select || !optionsBox) return;
        const options = rows.map(row => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "bf-select-option";
            option.dataset.value = row.code;
            option.dataset.label = row.name;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            const label = document.createElement("span");
            label.className = "bf-select-option-label";
            label.textContent = row.name;
            const check = document.createElement("span");
            check.className = "bf-select-check";
            check.setAttribute("aria-hidden", "true");
            check.textContent = "✓";
            option.append(label, check);
            return option;
        });
        optionsBox.replaceChildren(...options);
        syncSelect(select);
    };
    const locationDataReady = Promise.all([
        fetch("/data/dia-chi/countries.json").then(response => { if (!response.ok) throw new Error("Không tải được danh sách quốc gia."); return response.json(); }),
        fetch("/data/dia-chi/provinces.json").then(response => { if (!response.ok) throw new Error("Không tải được danh sách tỉnh/thành."); return response.json(); }),
        fetch("/data/dia-chi/wards.json").then(response => { if (!response.ok) throw new Error("Không tải được danh sách xã/phường."); return response.json(); })
    ]).then(([countryJson, provinceJson, wardJson]) => {
        const vietnam = countryJson.data.find(country => country.code === "VN");
        if (!vietnam) throw new Error("Không tìm thấy quốc gia Việt Nam trong dữ liệu.");
        provinceData.push(...provinceJson.data.filter(province => province.countryCode === vietnam.code));
        wardData = wardJson.data.filter(ward => ward.countryCode === vietnam.code);
        setSelectOptions("branch-country", [vietnam]);
        setSelectValue("branch-country", vietnam.code);
        setSelectOptions("branch-province", provinceData);
        setSelectOptions("branch-ward", []);
        setSelectDisabled(selectById("branch-country"), true);
        setSelectDisabled(selectById("branch-province"), false);
        setSelectDisabled(selectById("branch-ward"), true);
        return true;
    }).catch(error => {
        if (formError) { formError.textContent = error.message || "Không tải được dữ liệu địa chỉ."; formError.hidden = false; }
        return false;
    });
    form.addEventListener("change", event => {
        if (event.target.closest("#branch-province") !== selectById("branch-province")) return;
        const provinceCode = selectedValue("branch-province");
        setSelectOptions("branch-ward", wardData.filter(ward => ward.provinceCode === provinceCode));
        setSelectValue("branch-ward", "");
        setSelectDisabled(selectById("branch-ward"), !provinceCode);
    });
    const setField = (name, value) => {
        const field = form.elements.namedItem(name);
        if (!field) return;
        if (field.type === "checkbox") field.checked = Boolean(value);
        else field.value = value ?? "";
    };
    const setMode = (editing, branch = null) => {
        form.reset();
        form.querySelectorAll("input,select,textarea").forEach(field => field.disabled = false);
        form.querySelectorAll("[data-bf-select]").forEach(select => setSelectDisabled(select, select.id === "branch-country"));
        const submitButton = form.querySelector("[data-bf-modal-submit]");
        if (submitButton) submitButton.hidden = false;
        form.dataset.mode = editing ? "edit" : "create";
        form.dataset.branchId = editing ? String(branch.id) : "";
        form.querySelectorAll("[data-edit-only]").forEach(element => element.hidden = !editing);
        const code = form.elements.namedItem("maChiNhanh");
        code.readOnly = editing;
        const title = modal.querySelector(".bf-modal-title");
        const description = modal.querySelector(".bf-modal-description");
        const submit = form.querySelector("[data-bf-modal-submit]");
        if (title) title.textContent = editing ? "Sửa chi nhánh" : "Thêm chi nhánh";
        if (description) description.textContent = editing ? "Cập nhật đầy đủ thông tin chi nhánh." : "Nhập thông tin chi nhánh mới.";
        if (submit) submit.textContent = editing ? "Lưu thay đổi" : "Thêm chi nhánh";
        setSelectValue("branch-type", editing ? branch.loaiChiNhanh : "");
        setSelectValue("branch-country", "VN");
        if (!editing) {
            setSelectValue("branch-province", "");
            setSelectOptions("branch-ward", []);
            setSelectValue("branch-ward", "");
            setSelectDisabled(selectById("branch-province"), false);
            setSelectDisabled(selectById("branch-ward"), true);
            setField("choNhanTaiQuay", true);
            setField("choBanTrucTuyen", true);
            return;
        }
        ["maChiNhanh", "tenChiNhanh", "diaChiChiTiet", "viDo", "kinhDo", "soDienThoai", "email", "quanLyThanhVienId"].forEach(name => setField(name, branch[name]));
        const provinceCode = String(branch.maTinhThanh || "");
        setSelectValue("branch-province", provinceCode);
        setSelectOptions("branch-ward", wardData.filter(ward => ward.provinceCode === provinceCode));
        setSelectValue("branch-ward", String(branch.maPhuongXa || ""));
        setSelectDisabled(selectById("branch-province"), false);
        setSelectDisabled(selectById("branch-ward"), !provinceCode);
        setField("choNhanTaiQuay", branch.choNhanTaiQuay);
        setField("choBanTrucTuyen", branch.choBanTrucTuyen);
        setField("active", branch.trangThai === "DANG_DUNG");
    };
    const renderBranch = (branch, stt) => {
        const type = ({ NHA_SACH: "Nhà sách", THU_VIEN: "Thư viện", KET_HOP: "Kết hợp" })[branch.loaiChiNhanh] || branch.loaiChiNhanh || "—";
        const address = [branch.diaChiChiTiet, branch.tenPhuongXa, branch.tenTinhThanh].filter(Boolean).join(", ");
        const values = [
            ["stt", stt],
            ["maChiNhanh", branch.maChiNhanh],
            ["tenChiNhanh", branch.tenChiNhanh],
            ["loaiChiNhanh", type],
            ["diaChiChiTiet", address],
            ["maTinhThanh", branch.maTinhThanh]
        ];
        const row = document.createElement("tr");
        row.dataset.tableRow = "true";
        row.dataset.branch = JSON.stringify(branch);
        row.dataset.searchText = Object.values(branch).map(value => String(value ?? "")).join(" ");
        row.dataset.filterValues = "{}";
        values.forEach(([key, raw]) => {
            const cell = document.createElement("td");
            cell.dataset.columnKey = key;
            cell.dataset.searchValue = String(raw ?? "—");
            cell.dataset.sortValue = String(raw ?? "");
            if (key === "loaiChiNhanh") {
                const badge = document.createElement("span");
                badge.className = `bf-branch-type bf-branch-type-${branch.loaiChiNhanh || "default"}`;
                badge.textContent = raw;
                cell.appendChild(badge);
            } else {
                cell.textContent = raw ?? "—";
            }
            row.appendChild(cell);
        });
        const actions = document.createElement("td");
        actions.dataset.columnKey = "actions";
        actions.className = "bf-branch-row-actions";
        actions.innerHTML = `<button type="button" class="bf-branch-icon-action bf-branch-icon-view" data-branch-action="view" aria-label="Xem chi nhánh" title="Xem"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button type="button" class="bf-branch-icon-action bf-branch-icon-edit" data-branch-action="edit" aria-label="Sửa chi nhánh" title="Sửa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z"></path></svg></button><button type="button" class="bf-branch-icon-action bf-branch-icon-delete" data-branch-action="delete" aria-label="Xóa chi nhánh" title="Xóa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg></button>`;
        row.appendChild(actions);
        return row;
    };
    const request = async (url, options = {}) => {
        const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) }, signal: AbortSignal.timeout(20000), ...options });
        const result = await response.json();
        if (!response.ok || result?.success === false) fail(result?.error?.message || "Yêu cầu không thành công.");
        return result;
    };
    const loadBranches = async () => {
        if (!body) return;
        try {
            const result = await request("/api/chi-nhanh");
            const branches = Array.isArray(result?.data?.chiNhanh) ? result.data.chiNhanh : [];
            body.replaceChildren(...branches.map((branch, index) => renderBranch(branch, index + 1)));
            table.dataset.total = String(branches.length);
            table.dataset.loading = "false";
            if (empty) empty.hidden = branches.length > 0;
            if (!branches.length) setEmpty("Chưa có chi nhánh để hiển thị", "Kiểm tra đơn vị đang chọn hoặc quyền xem chi nhánh của tài khoản.");
        } catch (error) {
            body.replaceChildren();
            table.dataset.loading = "false";
            setEmpty("Không tải được danh sách chi nhánh", error.message || "Vui lòng tải lại trang.");
        }
        table.dispatchEvent(new CustomEvent("bookflow:table:refresh"));
    };
    deleteModal.querySelector("[data-branch-delete-confirm]").addEventListener("click", async () => {
        if (!branchPendingDelete || busy) return;
        const branch = branchPendingDelete;
        busy = true;
        closeModal(deleteModal);
        showLoading(document.body, { fullscreen: true, text: "Đang xóa chi nhánh..." });
        try {
            await request(`/api/chi-nhanh/${branch.id}`, { method: "DELETE" });
            window.BookFlowFeedback?.toast({ type: "success", message: "Đã xóa chi nhánh." });
            await loadBranches();
        } catch (error) {
            window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không xóa được chi nhánh." });
        } finally {
            branchPendingDelete = null;
            busy = false;
            hideLoading(document.body);
        }
    });
    table.addEventListener("bookflow:table:action", async event => {
        if (event.detail?.action !== "create-branch") return;
        if (!await locationDataReady) return;
        setMode(false);
        openModal(modal, event.target);
    });
    table.addEventListener("click", async event => {
        const button = event.target.closest("[data-branch-action]");
        if (!button || busy) return;
        if (button.dataset.branchAction !== "delete" && !await locationDataReady) return;
        const row = button.closest("[data-table-row]");
        const branch = JSON.parse(row.dataset.branch);
        if (button.dataset.branchAction === "view") {
            setMode(true, branch);
            form.querySelectorAll("input,select,textarea").forEach(field => field.disabled = true);
            form.querySelectorAll("[data-bf-select]").forEach(select => setSelectDisabled(select, true));
            const submitButton = form.querySelector("[data-bf-modal-submit]");
            if (submitButton) submitButton.hidden = true;
            const title = modal.querySelector(".bf-modal-title");
            if (title) title.textContent = "Chi tiết chi nhánh";
            openModal(modal, button);
            return;
        }
        if (button.dataset.branchAction === "edit") {
            setMode(true, branch);
            openModal(modal, button);
            return;
        }
        branchPendingDelete = branch;
        deleteModal.querySelector("[data-branch-delete-message]").textContent = `Bạn có chắc chắn muốn xóa chi nhánh "${branch.tenChiNhanh}" không?`;
        openModal(deleteModal, button);
    });
    form?.addEventListener("submit", async event => {
        event.preventDefault();
        if (busy || !validateForm(form)) return;
        busy = true;
        if (formError) formError.hidden = true;
        const values = Object.fromEntries(new FormData(form).entries());
        const optional = name => String(values[name] ?? "").trim() || null;
        const numberOrNull = name => optional(name) === null ? null : Number(values[name]);
        const editing = form.dataset.mode === "edit";
        const branchId = form.dataset.branchId;
        const payload = {
            tenChiNhanh: String(values.tenChiNhanh ?? "").trim(),
            loaiChiNhanh: values.loaiChiNhanh,
            diaChiChiTiet: optional("diaChiChiTiet"),
            maTinhThanh: optional("maTinhThanh"),
            tenTinhThanh: selectedLabel("branch-province") || null,
            maPhuongXa: optional("maPhuongXa"),
            tenPhuongXa: selectedLabel("branch-ward") || null,
            quocGia: "VN",
            viDo: numberOrNull("viDo"),
            kinhDo: numberOrNull("kinhDo"),
            soDienThoai: optional("soDienThoai"),
            email: optional("email"),
            choNhanTaiQuay: Boolean(form.elements.namedItem("choNhanTaiQuay").checked),
            choBanTrucTuyen: Boolean(form.elements.namedItem("choBanTrucTuyen").checked)
        };
        if (!editing) payload.maChiNhanh = String(values.maChiNhanh ?? "").trim();
        if (editing) {
            payload.quanLyThanhVienId = numberOrNull("quanLyThanhVienId");
            payload.trangThai = form.elements.namedItem("active").checked ? "DANG_DUNG" : "TAM_KHOA";
        }
        const submit = form.querySelector("[data-bf-modal-submit]");
        if (submit) submit.disabled = true;
        showLoading(document.body, { fullscreen: true, text: editing ? "Đang lưu chi nhánh..." : "Đang thêm chi nhánh..." });
        try {
            await request(editing ? `/api/chi-nhanh/${branchId}` : "/api/chi-nhanh", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
            hideLoading(document.body);
            closeModal(modal);
            window.BookFlowFeedback?.toast({ type: "success", message: editing ? "Đã cập nhật chi nhánh." : "Đã thêm chi nhánh." });
            await loadBranches();
        } catch (error) {
            if (formError) {
                formError.textContent = error.message || "Không lưu được chi nhánh.";
                formError.hidden = false;
            }
        } finally {
            busy = false;
            hideLoading(document.body);
            if (submit) submit.disabled = false;
        }
    });
    loadBranches();
}