import { closeModal } from "/js/components/modals.js?v=20261010-2";
import { applyServerFieldErrors, validateForm } from "/js/components/forms/validation.js";

const page = document.querySelector('[data-catalog-page][data-page-key="authors"]');
if (page) {
    const form = document.querySelector("[data-catalog-form]");
    const formModal = document.querySelector("#catalog-form-modal");
    const viewDetails = document.querySelector("[data-catalog-view-details]");
    const table = page.querySelector("[data-bf-table]");
    const endpoint = page.dataset.endpoint;
    const formError = form?.querySelector("[data-catalog-form-error]");
    const formNotice = form?.querySelector("[data-catalog-form-notice]");
    const imageWrapper = form?.querySelector('[data-bf-image][data-image-target="anh_dai_dien_tep_id"]');
    const imageInput = imageWrapper?.querySelector(".bf-image-input");
    const imageId = imageWrapper?.querySelector(".bf-image-value");
    const authorName = form?.elements.namedItem("ho_ten");
    const displayName = form?.elements.namedItem("ten_hien_thi");
    let saving = false;
    const validateImage = () => true;
    const showFormError = (message, error = null) => {
        const mapped = error ? applyServerFieldErrors(form, error) : false;
        if (!formError) return;
        formError.textContent = mapped ? "Có lỗi ở một hoặc nhiều trường. Hãy kiểm tra các thông báo bên dưới." : message;
        formError.hidden = false;
    };
    const requestWrite = async (url, method, body) => {
        const response = await fetch(url, { method, credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) {
            const error = new Error(result?.error?.message || "Không lưu được tác giả.");
            error.details = result?.error?.details || [];
            error.payload = result;
            error.httpStatus = response.status;
            throw error;
        }
        return result?.data ?? result;
    };
    const uploadImage = async file => {
        const data = new FormData();
        data.append("pham_vi_so_huu", "DON_VI");
        data.append("loai_tep", "ANH_TAC_GIA");
        data.append("files", file, file.name);
        const response = await fetch("/api/tep-tin/upload", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" }, body: data });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) {
            const error = new Error(result?.error?.message || "Không upload được ảnh tác giả.");
            error.details = result?.error?.details || [];
            error.payload = result;
            error.httpStatus = response.status;
            error.authorImage = true;
            throw error;
        }
        const uploaded = (result?.data?.ketQua || []).find(item => item.thanhCong);
        if (!uploaded?.tep?.id) {
            const error = new Error(uploaded?.loi?.message || "Không upload được ảnh tác giả.");
            error.authorImage = true;
            throw error;
        }
        return Number(uploaded.tep.id);
    };
    const buildPayload = editing => {
        const payload = {};
        for (const [name, rawValue] of new FormData(form).entries()) {
            if (rawValue instanceof File || name.endsWith("Remove") || name === "author-photo") continue;
            const control = [...form.querySelectorAll("input, textarea, [data-bf-select]")].find(item => (item.dataset.name || item.name) === name);
            if (control?.dataset.frontendOnly === "true") continue;
            const value = String(rawValue).trim();
            let normalized = value || null;
            if (["ngay_sinh", "ngay_mat"].includes(name) && value) {
                const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (match) normalized = `${match[3]}-${match[2]}-${match[1]}`;
            }
            if (["nam_sinh", "nam_mat", "anh_dai_dien_tep_id"].includes(name) && value) normalized = Number(value);
            payload[name] = normalized;
        }
        const name = String(authorName?.value || "").trim();
        if (!String(displayName?.value || "").trim()) {
            if (displayName) displayName.value = name;
            payload.ten_hien_thi = name || null;
        }
        for (const select of form.querySelectorAll("[data-address-label-name]")) {
            const selected = select.querySelector(".bf-select-option.is-selected");
            if (selected) payload[select.dataset.addressLabelName] = selected.dataset.label || null;
        }
        form.querySelectorAll('[data-derived-from] .bf-date-input')?.forEach(input => {
            if (input.name) payload[input.name] = input.value ? Number(input.value) : null;
        });
        return payload;
    };
    const saveAuthor = async () => {
        if (saving) return;
        const editing = form.dataset.mode === "edit";
        const recordId = form.dataset.recordId;
        const submitButton = formModal.querySelector("[data-bf-modal-submit]");
        let uploadedImageId = null;
        saving = true;
        if (submitButton) submitButton.disabled = true;
        try {
            const file = imageInput?.files?.[0];
            if (file) {
                uploadedImageId = await uploadImage(file);
                imageId.value = String(uploadedImageId);
            }
            const url = editing ? `${endpoint}/${encodeURIComponent(recordId)}` : endpoint;
            await requestWrite(url, editing ? "PATCH" : "POST", buildPayload(editing));
            window.BookFlowFeedback?.toast({ type: "success", message: editing ? "Đã cập nhật tác giả." : "Đã thêm tác giả." });
            closeModal(formModal);
            table.dispatchEvent(new CustomEvent("bookflow:table:request", { detail: {} }));
        } catch (error) {
            if (uploadedImageId && error.httpStatus >= 400 && error.httpStatus < 500) {
                try { await fetch(`/api/tep-tin/${encodeURIComponent(uploadedImageId)}`, { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } }); } catch {}
            }
            showFormError(error.message || "Không lưu được tác giả.", error);
        } finally {
            saving = false;
            if (submitButton) submitButton.disabled = false;
        }
    };
    form.addEventListener("bookflow:catalog:form-mode", event => {
        const id = event.detail?.record?.anhDaiDienTepId;
        imageWrapper?.dispatchEvent(new CustomEvent("bookflow:image:set-existing", { detail: { value: id ? String(id) : "", src: id ? `/api/tep-tin/${encodeURIComponent(id)}/noi-dung` : "" } }));
    });
    viewDetails.addEventListener("bookflow:catalog:details-rendered", event => {
        const record = event.detail;
        if (!record?.anhDaiDienTepId) return;
        const field = document.createElement("div");
        field.className = "bf-form-field bf-author-detail-image";
        const label = document.createElement("span");
        label.className = "bf-form-label";
        label.textContent = "Ảnh đại diện";
        const image = document.createElement("img");
        image.className = "bf-author-avatar bf-author-detail-avatar";
        image.src = `/api/tep-tin/${encodeURIComponent(record.anhDaiDienTepId)}/noi-dung`;
        image.alt = `Ảnh tác giả ${record.tenHienThi || record.hoTen || ""}`;
        field.append(label, image);
        viewDetails.prepend(field);
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (formError) { formError.hidden = true; formError.textContent = ""; }
        if (formNotice) formNotice.hidden = true;
        if (saving) return;
        const valid = validateForm(form);
        const imageValid = validateImage();
        const editing = form.dataset.mode === "edit";
        const url = editing ? `${endpoint}/${encodeURIComponent(form.dataset.recordId)}` : endpoint;
        const method = editing ? "PATCH" : "POST";
        try {
            await requestWrite(url, method, { ...buildPayload(editing), kiem_tra: true });
            if (!valid || !imageValid) {
                showFormError("Vui lòng kiểm tra các trường được đánh dấu bên dưới.");
                return;
            }
        } catch (error) {
            showFormError(error.message || "Không thể kiểm tra thông tin tác giả.", error);
            return;
        }
        await saveAuthor();
    });
}
