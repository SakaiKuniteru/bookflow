import { closeModal, openModal, setModalLoading } from "/js/components/modals.js?v=20261010-2";
import { setSelectDisabled, syncSelect } from "/js/components/forms/select.js";
import { applyServerFieldErrors, bindInlineValidation, validateForm } from "/js/components/forms/validation.js";
import { initDataTables } from "/js/components/tables.js?v=20261010-3";
import { bindApiTable } from "/js/components/api-table.js";
const table = document.querySelector(".bf-employee-page [data-bf-table]");
if (table) {
    const tableBody = table.querySelector("[data-bf-table-body]");
    const hienThiNhanVienDaNghi = new URLSearchParams(window.location.search).get("trangThai") === "DA_ROI";
    const emptyState = table.querySelector("[data-bf-table-empty]");
    const modal = document.querySelector("#employee-create-modal");
    const form = document.querySelector("[data-employee-form]");
    const viewModal = document.querySelector("#employee-view-modal");
    const deleteModal = document.querySelector("#employee-delete-modal");
    const deleteForm = document.querySelector("[data-employee-delete-form]");
    const rehireModal = document.querySelector("#employee-rehire-modal");
    const rehireForm = document.querySelector("#employee-rehire-form");
    const resetPasswordModal = document.querySelector("#employee-reset-password-modal");
    let employeePendingPasswordReset = null;
    let employeePendingDelete = null;
    let employeePendingRehire = null;
    let employees = [];
    let branches = [];
    let countries = [];
    let provinces = [];
    let wards = [];
    let ethnicities = [];
    let busy = false;
    const normalizeApiData = value => {
        if (Array.isArray(value)) return value.map(normalizeApiData);
        if (value === null || typeof value !== "object" || value instanceof Date) return value;
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), normalizeApiData(item)]));
    };
    const request = async (url, options = {}) => {
        const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) }, ...options });
        const result = await response.json();
        if (!response.ok || result?.success === false) {
            const error = new Error(result?.error?.message || "Yêu cầu không thành công.");
            error.details = result?.error?.details || [];
            error.code = result?.error?.code || "";
            throw error;
        }
        return normalizeApiData(result.data);
    };
    const createEmployeeAction = (type, employeeId) => {
        const config = {
            view: { label: "Xem nhân viên", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>' },
            edit: { label: "Sửa nhân viên", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z"></path></svg>' },
            delete: { label: "Xóa nhân viên", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg>' },
            rehire: { label: "Quay lại làm", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"></path><path d="M4 9h10a6 6 0 0 1 0 12h-2"></path></svg>' },
            "reset-password": { label: "Gửi mật khẩu mới", svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>' }
        };
        const button = document.createElement("button");
        button.type = "button";
        button.className = `bf-branch-icon-action bf-branch-icon-${type}`;
        button.dataset.employeeAction = type;
        button.dataset.employeeId = String(employeeId);
        button.setAttribute("aria-label", config[type].label);
        button.title = config[type].label;
        button.innerHTML = config[type].svg;
        return button;
    };
    const displayName = (items, code) => items.find(item => String(item.code) === String(code ?? ""))?.name || code || "";
    const genderName = value => ({ NAM: "Nam", NU: "Nữ", KHAC: "Khác", KHONG_TIET_LO: "Không tiết lộ" })[value] || value || "";
    const formatDate = value => {
        if (value == null || value === "") return "";
        const text = String(value ?? "");
        const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/) || text.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/);
        if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
        return `${parts.day}/${parts.month}/${parts.year}`;
    };
    const dateInput = value => value ? formatDate(value) : "";
    const renderEmployeeDetails = detail => {
        const container = viewModal.querySelector("[data-employee-view-details]");
        const account = detail.taiKhoan || {};
        const member = detail.thanhVien || {};
        const profile = detail.hoSo || {};
        const statusLabels = { CHO_MOI: "Chờ kích hoạt", CHO_XAC_MINH: "Chờ xác minh", DANG_LAM: "Đang làm", TAM_KHOA: "Đã khóa", DA_ROI: "Đã nghỉ" };
        const branchNames = (detail.chiNhanh || []).map(branch => branch.tenChiNhanh).filter(Boolean).join(", ");
        const roleNames = (detail.vaiTro || []).map(role => role.tenVaiTro).filter(Boolean).join(", ");
        const sections = [
            ["Thông tin tài khoản", [["Họ và tên", account.hoTen], ["Mã nhân viên", member.maNhanVien], ["Tên đăng nhập", account.tenDangNhap], ["Email", account.email], ["Số điện thoại", account.soDienThoai], ["Vai trò", roleNames], ["Chi nhánh", branchNames], ["Trạng thái", statusLabels[member.trangThai] || member.trangThai]]],
            ["Thông tin công việc", [["Chức danh", member.chucDanh], ["Email công việc", member.emailCongViec], ["Điện thoại công việc", member.soDienThoaiCongViec], ["Ngày vào làm", formatDate(member.ngayVaoLam)], ["Ngày nghỉ việc", formatDate(member.ngayNghiViec)], ["Số ngày làm việc", member.soNgayLamViec == null ? "" : `${member.soNgayLamViec} ngày`]]],
            ["Thông tin cá nhân", [["Ngày sinh", formatDate(account.ngaySinh)], ["Giới tính", genderName(account.gioiTinh)], ["Quốc tịch", displayName(countries, account.quocTich)], ["Dân tộc", displayName(ethnicities, account.danToc)], ["Quốc gia", displayName(countries, account.quocGia)], ["Tỉnh/thành", displayName(provinces, account.tinhThanhPho)], ["Xã/phường", displayName(wards, account.phuongXa)], ["Địa chỉ", account.diaChiChiTiet], ["Mô tả", account.moTa]]],
            ["CCCD/CMND", [["Số CCCD/CMND", profile.cccdSo], ["Ngày cấp", formatDate(profile.cccdNgayCap)], ["Nơi cấp", profile.cccdNoiCap]]],
            ["Người liên hệ khẩn cấp", [["Họ tên", profile.lienHeKhanCapHoTen], ["Quan hệ", profile.lienHeKhanCapQuanHe], ["Số điện thoại", profile.lienHeKhanCapSoDienThoai], ["Địa chỉ", profile.lienHeKhanCapDiaChi]]],
            ["Trình độ và chuyên môn", [["Trình độ học vấn", profile.trinhDoHocVan], ["Chuyên ngành", profile.chuyenNganh], ["Trường", profile.truong], ["Chứng chỉ", profile.chungChi], ["Ngoại ngữ", profile.ngoaiNgu], ["Kỹ năng", profile.kyNang]]]
        ];
        const renderSection = ([title, rows]) => {
            const heading = document.createElement("h3");
            heading.className = "bf-employee-section-title bf-form-grid-full";
            heading.textContent = title;
            return [heading, ...rows.map(([label, value]) => {
                const field = document.createElement("div");
                field.className = "bf-form-field";
                const labelNode = document.createElement("span");
                labelNode.className = "bf-form-label";
                labelNode.textContent = label;
                const valueNode = document.createElement("p");
                valueNode.className = "bf-form-help";
                valueNode.textContent = value == null ? "" : String(value);
                field.append(labelNode, valueNode);
                return field;
            })];
        };
        container.replaceChildren(...sections.flatMap(renderSection));
    };
    const setOptions = (selectId, rows, root = form) => {
        const select = root.querySelector(`#${selectId}`);
        const optionsBox = select?.querySelector(".bf-select-options");
        if (!select || !optionsBox) return;
        optionsBox.replaceChildren(...rows.map(row => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "bf-select-option";
            option.dataset.value = String(row.value);
            option.dataset.label = row.label;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            const label = document.createElement("span");
            label.className = "bf-select-option-label";
            label.textContent = row.label;
            const check = document.createElement("span");
            check.className = "bf-select-check";
            check.setAttribute("aria-hidden", "true");
            check.textContent = "✓";
            option.append(label, check);
            return option;
        }));
        syncSelect(select);
    };
    const getSelectValue = (selectId, root = form) => root.querySelector(`#${selectId} .bf-select-option.is-selected`)?.dataset.value || "";

    const setSelectValue = (selectId, value) => {
        const select = form.querySelector(`#${selectId}`);
        if (!select) return;
        select.querySelectorAll(".bf-select-option").forEach(option => {
            const selected = option.dataset.value === String(value ?? "");
            option.classList.toggle("is-selected", selected);
            option.setAttribute("aria-selected", String(selected));
        });
        syncSelect(select);
    };
    const loadOptions = async () => {
        const [branchResult, countryResult, provinceResult, wardResult, ethnicityResult] = await Promise.all([
            request("/api/chi-nhanh"),
            fetch("/data/dia-chi/countries.json").then(response => response.json()),
            fetch("/data/dia-chi/provinces.json").then(response => response.json()),
            fetch("/data/dia-chi/wards.json").then(response => response.json()),
            fetch("/data/dia-chi/dan-toc.json").then(response => response.json())
        ]);
        branches = branchResult.chiNhanh || [];
        setOptions("employee-rehire-branch", branches.map(branch => ({ value: branch.id, label: `${branch.maChiNhanh} — ${branch.tenChiNhanh}` })), rehireForm);
        countries = countryResult.data || [];
        provinces = provinceResult.data || [];
        wards = wardResult.data || [];
        ethnicities = ethnicityResult.data || [];
        setOptions("employee-branch", branches.map(branch => ({ value: branch.id, label: `${branch.maChiNhanh} — ${branch.tenChiNhanh}` })));
        setOptions("employee-nationality", countries.map(country => ({ value: country.code, label: country.name })));
        setOptions("employee-country", countries.map(country => ({ value: country.code, label: country.name })));
        setOptions("employee-ethnicity", ethnicities.map(ethnicity => ({ value: ethnicity.code, label: ethnicity.name })));
        setOptions("employee-province", provinces.filter(province => province.countryCode === "VN").map(province => ({ value: province.code, label: province.name })));
        setOptions("employee-ward", []);
        setSelectDisabled(form.querySelector("#employee-province"), true);
        setSelectDisabled(form.querySelector("#employee-ward"), true);
    };
    let optionsError = null;
    const optionsReady = loadOptions().then(() => true).catch(error => {
        optionsError = error;
        return false;
    });
    const isoDate = value => {
        if (!value) return null;
        const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : null;
    };
    const setEmployeeFormMode = (mode, employeeId = "") => {
        form.dataset.mode = mode;
        form.dataset.employeeId = employeeId;
        modal.querySelector(".bf-modal-title").textContent = mode === "edit" ? "Sửa thông tin nhân viên" : "Thêm mới nhân viên";
        modal.querySelector(".bf-modal-description").textContent = mode === "edit" ? "Cập nhật thông tin cá nhân của nhân viên." : "Nhập thông tin nhân viên mới.";
        const submit = modal.querySelector("[data-bf-modal-submit]");
        if (submit) submit.textContent = mode === "edit" ? "Lưu thay đổi" : "Thêm mới";
    };
    const setEmployeeEditLocks = locked => {
        ["tenDangNhap", "maNhanVien", "email", "chiNhanhId", "loaiTaiKhoan", "active"].forEach(name => {
            const field = form.elements.namedItem(name);
            if (field) field.disabled = locked;
        });
        const phone = form.querySelector("#employee-phone");
        if (phone) phone.disabled = locked;
        setSelectDisabled(form.querySelector("#employee-branch"), locked);
        setSelectDisabled(form.querySelector("#employee-account-type"), locked);
    };
    const resetEmployeeForm = () => {
        form.reset();
        form.querySelectorAll("[data-bf-field-error]").forEach(error => error.remove());
        form.querySelectorAll(".bf-email-error, .bf-phone-error").forEach(error => { error.hidden = true; });
        form.dataset.memberStatus = "";
        form.querySelectorAll(".is-invalid").forEach(field => field.classList.remove("is-invalid"));
        form.querySelectorAll("[aria-invalid]").forEach(field => field.removeAttribute("aria-invalid"));
        ["employee-branch", "employee-account-type", "employee-nationality", "employee-ethnicity", "employee-country", "employee-province", "employee-ward", "employee-gender"].forEach(id => setSelectValue(id, ""));
        setOptions("employee-ward", []);
        setSelectDisabled(form.querySelector("#employee-province"), true);
        setSelectDisabled(form.querySelector("#employee-ward"), true);
        setEmployeeEditLocks(false);
        setEmployeeFormMode("create");
        form.elements.namedItem("active").checked = true;
    };
    const fillEmployeeForm = (detail, employeeId) => {
        resetEmployeeForm();
        const account = detail.taiKhoan || {};
        const member = detail.thanhVien || {};
        const profile = detail.hoSo || {};
        const branch = (detail.chiNhanh || []).find(item => item.trangThai === "HIEU_LUC" && !item.ngayKetThuc);
        const role = (detail.vaiTro || []).find(item => item.maVaiTro === "QUAN_TRI" || item.maVaiTro === "NHAN_VIEN");
        form.elements.namedItem("hoTen").value = account.hoTen || "";
        form.elements.namedItem("tenDangNhap").value = account.tenDangNhap || "";
        form.elements.namedItem("maNhanVien").value = member.maNhanVien || "";
        form.elements.namedItem("email").value = account.email || "";
        form.querySelector("#employee-phone").value = account.soDienThoai || "";
        form.elements.namedItem("ngaySinh").value = dateInput(account.ngaySinh);
        form.elements.namedItem("chucDanh").value = member.chucDanh || "";
        form.elements.namedItem("emailCongViec").value = member.emailCongViec || "";
        form.elements.namedItem("soDienThoaiCongViec").value = member.soDienThoaiCongViec || "";
        form.elements.namedItem("ngayVaoLam").value = dateInput(member.ngayVaoLam);
        form.elements.namedItem("ngayNghiViec").value = dateInput(member.ngayNghiViec);
        form.elements.namedItem("cccdSo").value = profile.cccdSo || "";
        form.elements.namedItem("cccdNgayCap").value = dateInput(profile.cccdNgayCap);
        form.elements.namedItem("cccdNoiCap").value = profile.cccdNoiCap || "";
        form.elements.namedItem("lienHeKhanCapHoTen").value = profile.lienHeKhanCapHoTen || "";
        form.elements.namedItem("lienHeKhanCapQuanHe").value = profile.lienHeKhanCapQuanHe || "";
        form.elements.namedItem("lienHeKhanCapSoDienThoai").value = profile.lienHeKhanCapSoDienThoai || "";
        form.elements.namedItem("lienHeKhanCapDiaChi").value = profile.lienHeKhanCapDiaChi || "";
        form.elements.namedItem("trinhDoHocVan").value = profile.trinhDoHocVan || "";
        form.elements.namedItem("chuyenNganh").value = profile.chuyenNganh || "";
        form.elements.namedItem("truong").value = profile.truong || "";
        form.elements.namedItem("chungChi").value = profile.chungChi || "";
        form.elements.namedItem("ngoaiNgu").value = profile.ngoaiNgu || "";
        form.elements.namedItem("kyNang").value = profile.kyNang || "";
        form.querySelector("[data-employee-work-days]").value = member.soNgayLamViec == null ? "" : `${member.soNgayLamViec} ngày`;
        form.elements.namedItem("moTa").value = account.moTa || "";
        form.elements.namedItem("diaChi").value = account.diaChiChiTiet || "";
        setSelectValue("employee-branch", branch?.chiNhanhId || "");
        setSelectValue("employee-account-type", role?.maVaiTro || "");
        setSelectValue("employee-gender", account.gioiTinh || "");
        setSelectValue("employee-nationality", account.quocTich || "");
        setSelectValue("employee-ethnicity", account.danToc || "");
        setSelectValue("employee-country", account.quocGia || "");
        const isVietnam = account.quocGia === "VN";
        setSelectDisabled(form.querySelector("#employee-province"), !isVietnam);
        setSelectValue("employee-province", isVietnam ? account.tinhThanhPho || "" : "");
        const provinceCode = isVietnam ? account.tinhThanhPho || "" : "";
        setOptions("employee-ward", wards.filter(ward => ward.countryCode === "VN" && ward.provinceCode === provinceCode).map(ward => ({ value: ward.code, label: ward.name })));
        setSelectDisabled(form.querySelector("#employee-ward"), !provinceCode);
        setSelectValue("employee-ward", isVietnam ? account.phuongXa || "" : "");
        form.elements.namedItem("active").checked = !["TAM_KHOA", "DA_ROI"].includes(member.trangThai);
        form.dataset.memberStatus = member.trangThai || "";
        setEmployeeEditLocks(false);
        setEmployeeFormMode("edit", employeeId);
    };
    const renderEmployees = (offset = 0) => {
        tableBody.replaceChildren();
        employees.forEach((employee, index) => {
            const row = document.createElement("tr");
            row.dataset.tableRow = "true";
            const roles = employee.vaiTro || [];
            const accountRole = roles.some(role => role.maVaiTro === "QUAN_TRI") ? "Quản trị viên" : roles.some(role => role.maVaiTro === "NHAN_VIEN") ? "Nhân viên" : "";
            const branchName = (employee.chiNhanh || []).map(branch => branch.tenChiNhanh).filter(Boolean).join(", ");
            const statusLabels = { CHO_MOI: "Chờ kích hoạt", CHO_XAC_MINH: "Chờ xác minh", DANG_LAM: "Đang làm", TAM_KHOA: "Đã khóa", DA_ROI: "Đã nghỉ" };
            const status = statusLabels[employee.trangThai] || employee.trangThai || "";
            const ngayVaoLam = formatDate(employee.ngayVaoLam);
            const ngayNghi = formatDate(employee.ngayNghiViec);
            const soNgayLamViec = employee.soNgayLamViec == null ? "" : `${employee.soNgayLamViec} ngày`;
            const values = [["stt", offset + index + 1], ["maNhanVien", employee.maNhanVien], ["hoTen", employee.hoTen], ["tenDangNhap", employee.tenDangNhap], ["email", employee.email], ["soDienThoai", employee.soDienThoai], ["loaiTaiKhoan", accountRole], ["chucDanh", employee.chucDanh], ["chiNhanh", branchName], ["ngayVaoLam", ngayVaoLam], ["soNgayLamViec", soNgayLamViec], ...(hienThiNhanVienDaNghi ? [["ngayNghiViec", ngayNghi], ["lyDoNghiViec", employee.lyDoNghiViec || ""]] : []), ["trangThai", status], ["actions", null]];
            row.dataset.searchText = [employee.maNhanVien, employee.hoTen, employee.tenDangNhap, employee.email, employee.soDienThoai, employee.chucDanh, accountRole, branchName, ngayVaoLam, ngayNghi, employee.lyDoNghiViec, status].filter(Boolean).join(" ");
            row.dataset.filterValues = "{}";
            values.forEach(([key, value]) => {
                const cell = document.createElement("td");
                cell.dataset.columnKey = key;
                cell.dataset.searchValue = String(value ?? "");
                cell.dataset.sortValue = key === "ngayVaoLam" ? String(employee.ngayVaoLam ?? "") : key === "ngayNghiViec" ? String(employee.ngayNghiViec ?? "") : key === "soNgayLamViec" ? String(employee.soNgayLamViec ?? "") : String(value ?? "");
                if (key === "actions") {
                    const actions = document.createElement("div");
                    actions.className = "bf-branch-row-actions";
                    actions.append(createEmployeeAction("view", employee.id), createEmployeeAction("edit", employee.id));
                    if (hienThiNhanVienDaNghi) actions.append(createEmployeeAction("rehire", employee.id));
                    else if (employee.trangThai === "DANG_LAM") actions.append(createEmployeeAction("delete", employee.id), createEmployeeAction("reset-password", employee.id));
                    cell.appendChild(actions);
                } else {
                    cell.textContent = value ?? "";
                }
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });
        table.dataset.loading = "false";
        if (emptyState) emptyState.hidden = employees.length > 0;
    };
    const apiTable = bindApiTable(table, {
        endpoint: "/api/nhan-vien",
        rowsKeys: ["nhanVien", "nhan_vien"],
        paginationKeys: ["phanTrang", "phan_trang"],
        queryNames: { page: "trang", pageSize: "kichThuoc", search: "tuKhoa", sort: "sort", order: "order" },
        extraParams: () => ({
            ...(hienThiNhanVienDaNghi ? { trangThai: "DA_ROI" } : { anDaNghi: "true" })
        }),
        onRows(rows, { offset }) {
            employees = rows;
            renderEmployees(offset);
            if (emptyState) emptyState.hidden = rows.length > 0;
        },
        onError(error) {
            employees = [];
            renderEmployees();
            if (emptyState) {
                const heading = emptyState.querySelector("strong");
                const description = emptyState.querySelector("[data-table-empty-description]");
                if (heading) heading.textContent = "Không tải được danh sách nhân viên";
                if (description) description.textContent = error.message || "Kiểm tra quyền quản lý nhân viên rồi thử lại.";
                emptyState.hidden = false;
            }
        }
    });
    const loadEmployees = async state => {
        const tieuDe = document.querySelector(".bf-employee-page .bf-admin-page-heading h1");
        const moTa = document.querySelector(".bf-employee-page .bf-admin-page-heading p");
        const tieuDeRong = emptyState?.querySelector("strong");
        const moTaRong = emptyState?.querySelector("[data-table-empty-description]");
        if (tieuDe) tieuDe.textContent = hienThiNhanVienDaNghi ? "Nhân viên đã nghỉ" : "Nhân viên";
        if (moTa) moTa.textContent = hienThiNhanVienDaNghi ? "Danh sách nhân viên đã nghỉ việc trong đơn vị." : "Danh sách nhân viên trong đơn vị của bạn.";
        if (tieuDeRong) tieuDeRong.textContent = hienThiNhanVienDaNghi ? "Chưa có nhân viên đã nghỉ" : "Chưa có nhân viên để hiển thị";
        if (moTaRong) moTaRong.textContent = hienThiNhanVienDaNghi ? "Nhân viên đã nghỉ việc sẽ hiển thị tại đây." : "Thêm nhân viên vào đơn vị để hiển thị trong danh sách.";
        await apiTable.load(state);
    };
    table.addEventListener("click", async event => {
        const button = event.target.closest("[data-employee-action]");
        if (!button || busy) return;
        const employeeId = button.dataset.employeeId;
        const employee = employees.find(item => String(item.id) === employeeId);
        if (!employee) return;
        if (button.dataset.employeeAction === "delete") {
            employeePendingDelete = employee;
            deleteForm.reset();
            deleteModal.querySelector("[data-employee-delete-message]").textContent = `Xác nhận cho nhân viên "${employee.hoTen}" nghỉ việc.`;
            openModal(deleteModal, button);
            return;
        }
        if (button.dataset.employeeAction === "rehire") {
            employeePendingRehire = employee;
            rehireForm.reset();
            rehireModal.querySelector("[data-employee-rehire-message]").textContent = `Bạn đang khôi phục quyền làm việc cho "${employee.hoTen}".`;
            openModal(rehireModal, button);
            return;
        }
        if (button.dataset.employeeAction === "reset-password") {
            employeePendingPasswordReset = employee;
                        resetPasswordModal.querySelector("[data-employee-reset-password-message]").textContent = `Gửi mật khẩu tạm mới tới ${employee.email || "email nhân viên"} của ${employee.hoTen}?`;
            openModal(resetPasswordModal, button);
            return;
        }
        busy = true;
        const isEdit = button.dataset.employeeAction === "edit";
        try {
            if (isEdit) {
                openModal(modal, button);
                setModalLoading(modal, true);
                if (!await optionsReady) throw optionsError || new Error("Không tải được danh mục form.");
            }
            const detail = await request(`/api/nhan-vien/${employeeId}`);
            if (button.dataset.employeeAction === "view") {
                renderEmployeeDetails(detail);
                openModal(viewModal, button);
            } else if (isEdit) {
                fillEmployeeForm(detail, employeeId);
                setModalLoading(modal, false);
            }
        } catch (error) {
            if (isEdit) {
                setModalLoading(modal, false);
                closeModal(modal);
            }
            window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không tải được thông tin nhân viên." });
        } finally {
            busy = false;
        }
    });
    bindInlineValidation(form);
    table.addEventListener("bookflow:table:action", async event => {
        if (event.detail.action !== "create-employee") return;
        openModal(modal, event.target);
        setModalLoading(modal, true);
        let loadError = null;
        try {
            if (!await optionsReady) throw optionsError || new Error("Không tải được danh mục form.");
            resetEmployeeForm();
        } catch (error) {
            loadError = error;
        } finally {
            setModalLoading(modal, false);
        }
        if (loadError) {
            closeModal(modal);
            window.BookFlowFeedback?.toast({ type: "error", message: loadError.message || "Không tải được danh mục form." });
        }
    });
    form.addEventListener("change", event => {
        const selected = event.target.closest("[data-bf-select]");
        if (selected?.id === "employee-country") {
            const isVietnam = getSelectValue("employee-country") === "VN";
            setSelectValue("employee-province", "");
            setSelectValue("employee-ward", "");
            setOptions("employee-ward", []);
            setSelectDisabled(form.querySelector("#employee-province"), !isVietnam);
            setSelectDisabled(form.querySelector("#employee-ward"), true);
        }
        if (selected?.id === "employee-province") {
            const provinceCode = getSelectValue("employee-province");
            setSelectValue("employee-ward", "");
            setOptions("employee-ward", wards.filter(ward => ward.countryCode === "VN" && ward.provinceCode === provinceCode).map(ward => ({ value: ward.code, label: ward.name })));
            setSelectDisabled(form.querySelector("#employee-ward"), !provinceCode);
        }
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (busy) return;
        const formValid = validateForm(form);
        busy = true;
        const submit = modal.querySelector("[data-bf-modal-submit]");
        if (submit) submit.disabled = true;
        const isEdit = form.dataset.mode === "edit";
        const employeeProfilePayload = {
            ngayVaoLam: isoDate(form.elements.namedItem("ngayVaoLam").value),
            chucDanh: form.elements.namedItem("chucDanh").value.trim() || null,
            emailCongViec: form.elements.namedItem("emailCongViec").value.trim() || null,
            soDienThoaiCongViec: form.elements.namedItem("soDienThoaiCongViec").value.trim() || null,
            cccdSo: form.elements.namedItem("cccdSo").value.trim() || null,
            cccdNgayCap: isoDate(form.elements.namedItem("cccdNgayCap").value),
            cccdNoiCap: form.elements.namedItem("cccdNoiCap").value.trim() || null,
            lienHeKhanCapHoTen: form.elements.namedItem("lienHeKhanCapHoTen").value.trim() || null,
            lienHeKhanCapQuanHe: form.elements.namedItem("lienHeKhanCapQuanHe").value.trim() || null,
            lienHeKhanCapSoDienThoai: form.elements.namedItem("lienHeKhanCapSoDienThoai").value.trim() || null,
            lienHeKhanCapDiaChi: form.elements.namedItem("lienHeKhanCapDiaChi").value.trim() || null,
            trinhDoHocVan: form.elements.namedItem("trinhDoHocVan").value.trim() || null,
            chuyenNganh: form.elements.namedItem("chuyenNganh").value.trim() || null,
            truong: form.elements.namedItem("truong").value.trim() || null,
            chungChi: form.elements.namedItem("chungChi").value.trim() || null,
            ngoaiNgu: form.elements.namedItem("ngoaiNgu").value.trim() || null,
            kyNang: form.elements.namedItem("kyNang").value.trim() || null
        };
        const createPayload = {
            hoTen: form.elements.namedItem("hoTen").value.trim(),
            maNhanVien: form.elements.namedItem("maNhanVien").value.trim(),
            tenDangNhap: form.elements.namedItem("tenDangNhap").value.trim(),
            email: form.elements.namedItem("email").value.trim(),
            loaiTaiKhoan: getSelectValue("employee-account-type"),
            chiNhanhId: Number(getSelectValue("employee-branch")),
            ngaySinh: isoDate(form.elements.namedItem("ngaySinh").value),
            gioiTinh: getSelectValue("employee-gender") || null,
            quocTich: getSelectValue("employee-nationality") || null,
            danToc: getSelectValue("employee-ethnicity") || null,
            quocGia: getSelectValue("employee-country") || null,
            tinhThanh: getSelectValue("employee-province") || null,
            xaPhuong: getSelectValue("employee-ward") || null,
            moTa: form.elements.namedItem("moTa").value.trim() || null,
            diaChi: form.elements.namedItem("diaChi").value.trim() || null,
            active: form.elements.namedItem("active").checked,
            ...employeeProfilePayload
        };
        const updatePayload = {
            hoTen: form.elements.namedItem("hoTen").value.trim(),
            tenDangNhap: form.elements.namedItem("tenDangNhap").value.trim(),
            maNhanVien: form.elements.namedItem("maNhanVien").value.trim(),
            email: form.elements.namedItem("email").value.trim(),
            soDienThoai: form.elements.namedItem("soDienThoai").value.trim() || null,
            ngaySinh: isoDate(form.elements.namedItem("ngaySinh").value),
            gioiTinh: getSelectValue("employee-gender") || null,
            quocTich: getSelectValue("employee-nationality") || null,
            danToc: getSelectValue("employee-ethnicity") || null,
            quocGia: getSelectValue("employee-country") || null,
            tinhThanh: getSelectValue("employee-province") || null,
            xaPhuong: getSelectValue("employee-ward") || null,
            moTa: form.elements.namedItem("moTa").value.trim() || null,
            diaChi: form.elements.namedItem("diaChi").value.trim() || null,
            ...employeeProfilePayload
        };
        if (form.dataset.memberStatus !== "DA_ROI") Object.assign(updatePayload, { chiNhanhId: Number(getSelectValue("employee-branch")), loaiTaiKhoan: getSelectValue("employee-account-type"), active: form.elements.namedItem("active").checked });
        if (!formValid) {
            try {
                if (isEdit) await request(`/api/nhan-vien/${form.dataset.employeeId}`, { method: "PATCH", body: JSON.stringify({ ...updatePayload, kiemTra: true }) });
                else await request("/api/nhan-vien/kiem-tra-tao-moi", { method: "POST", body: JSON.stringify(createPayload) });
            } catch (error) {
                if (!applyServerFieldErrors(form, error)) window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không thể kiểm tra thông tin nhân viên." });
            } finally {
                busy = false;
                if (submit) submit.disabled = false;
            }
            return;
        }
        try {
            if (isEdit) await request(`/api/nhan-vien/${form.dataset.employeeId}`, { method: "PATCH", body: JSON.stringify(updatePayload) });
            else await request("/api/nhan-vien/moi", { method: "POST", body: JSON.stringify(createPayload) });
            closeModal(modal);
            window.BookFlowFeedback?.toast({ type: "success", message: isEdit ? "Đã cập nhật thông tin nhân viên." : "Đã tạo tài khoản nhân viên." });
            await loadEmployees();
        } catch (error) {
            if (!applyServerFieldErrors(form, error)) window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không lưu được thông tin nhân viên." });
        } finally {
            busy = false;
            if (submit) submit.disabled = false;
        }
    });
    bindInlineValidation(deleteForm);
    deleteForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!employeePendingDelete || busy || !validateForm(deleteForm)) return;
        busy = true;
        const submit = deleteModal.querySelector("[data-bf-modal-submit]");
        if (submit) submit.disabled = true;
        const employeeId = employeePendingDelete.id;
        const lyDo = deleteForm.elements.namedItem("lyDo").value.trim();
        try {
            await request(`/api/nhan-vien/${employeeId}/trang-thai`, { method: "PATCH", body: JSON.stringify({ trangThai: "DA_ROI", lyDo }) });
            closeModal(deleteModal);
            window.BookFlowFeedback?.toast({ type: "success", message: "Đã xóa nhân viên khỏi danh sách đang làm." });
            employeePendingDelete = null;
            await loadEmployees();
        } catch (error) {
            if (!applyServerFieldErrors(deleteForm, error)) window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không xóa được nhân viên." });
        } finally {
            busy = false;
            if (submit) submit.disabled = false;
        }
    });
    bindInlineValidation(rehireForm);
    rehireForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!employeePendingRehire || busy || !validateForm(rehireForm)) return;
        busy = true;
        const submit = rehireModal.querySelector("[data-bf-modal-submit]");
        if (submit) submit.disabled = true;
        try {
            await request(`/api/nhan-vien/${employeePendingRehire.id}/quay-lai-lam`, { method: "POST", body: JSON.stringify({ chiNhanhId: Number(getSelectValue("employee-rehire-branch", rehireForm)) }) });
            closeModal(rehireModal);
            employeePendingRehire = null;
            window.BookFlowFeedback?.toast({ type: "success", message: "Đã cho nhân viên quay lại làm và gửi mật khẩu tạm." });
            await loadEmployees();
        } catch (error) {
            window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không thể cho nhân viên quay lại làm." });
        } finally {
            busy = false;
            if (submit) submit.disabled = false;
        }
    });
    resetPasswordModal.addEventListener("bookflow:modal:confirm", async event => {
        if (event.detail.action !== "reset-password" || !employeePendingPasswordReset || busy) return;
        busy = true;
        try {
            await request(`/api/nhan-vien/${employeePendingPasswordReset.id}/reset-mat-khau`, { method: "POST" });
            closeModal(resetPasswordModal);
            employeePendingPasswordReset = null;
            window.BookFlowFeedback?.toast({ type: "success", message: "Đã gửi mật khẩu tạm mới tới email nhân viên." });
        } catch (error) {
            window.BookFlowFeedback?.toast({ type: "error", message: error.message || "Không gửi được mật khẩu mới." });
        } finally {
            busy = false;
            setModalLoading(resetPasswordModal, false);
        }
    });
    initDataTables(document);
    loadEmployees();
}
