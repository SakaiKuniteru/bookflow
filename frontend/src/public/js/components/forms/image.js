function syncInput(input, files) {
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function getOutputType(type) {
    return ["image/png", "image/jpeg", "image/webp"].includes(type) ? type : "image/png";
}

function getOutputName(file, type) {
    const extension = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return `${baseName}.${extension}`;
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Không thể đọc ảnh ${file.name}`));
        };
        image.src = url;
    });
}

async function resizeImage(file, width, height) {
    const image = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không thể xử lý ảnh.");
    context.drawImage(image, 0, 0, width, height);
    const type = getOutputType(file.type);
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => result ? resolve(result) : reject(new Error(`Không thể chuyển đổi ảnh ${file.name}`)), type, 0.92);
    });
    return new File([blob], getOutputName(file, blob.type || type), { type: blob.type || type, lastModified: Date.now() });
}

function createPreviewModal() {
    let modal = document.getElementById("bf-image-preview-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "bf-image-preview-modal";
    modal.className = "bf-image-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Xem ảnh");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `<div class="bf-image-modal-backdrop"></div><div class="bf-image-modal-content"><button type="button" class="bf-image-modal-close" aria-label="Đóng">×</button><img alt=""></div>`;
    document.body.appendChild(modal);
    const close = () => {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        modal.querySelector("img").removeAttribute("src");
        const trigger = modal.returnFocusTo;
        modal.returnFocusTo = null;
        if (trigger?.isConnected) trigger.focus();
    };
    modal.querySelector(".bf-image-modal-backdrop").addEventListener("click", close);
    modal.querySelector(".bf-image-modal-close").addEventListener("click", close);
    modal.addEventListener("keydown", event => {
        if (event.key === "Tab") {
            event.preventDefault();
            modal.querySelector(".bf-image-modal-close").focus();
        } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    });
    return modal;
}

function openPreview(src, alt, trigger) {
    const modal = createPreviewModal();
    const image = modal.querySelector("img");
    image.src = src;
    image.alt = alt || "";
    modal.returnFocusTo = trigger || document.activeElement;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    modal.querySelector(".bf-image-modal-close").focus();
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    const input = wrapper.querySelector(".bf-image-input");
    const list = wrapper.querySelector(".bf-image-list");
    const addButton = wrapper.querySelector(".bf-image-add");
    const deleteState = wrapper.querySelector(".bf-image-delete-state");
    const valueInput = wrapper.querySelector(".bf-image-value");
    const errorElement = wrapper.querySelector("[data-bf-image-error]");
    if (!input || !list) return;
    wrapper.dataset.formInitialized = "true";
    const multiple = wrapper.dataset.multiple === "true";
    const maxFiles = multiple ? Math.max(1, Math.floor(Number(wrapper.dataset.maxFiles) || 10)) : 1;
    const width = Math.max(1, Math.round(Number(wrapper.dataset.width) || 160));
    const height = Math.max(1, Math.round(Number(wrapper.dataset.height) || 160));
    const files = [];
    const previewFiles = [];
    let objectUrls = [];
    let previewObjectUrls = [];
    wrapper.style.setProperty("--bf-image-width", `${width}px`);
    wrapper.style.setProperty("--bf-image-height", `${height}px`);
    const updateRequired = () => {
        const existingVisible = Boolean(list.querySelector(".bf-image-item[data-existing-src]:not([hidden])"));
        input.required = input.dataset.required === "true" && !existingVisible && files.length === 0;
    };
    const showError = message => {
        if (errorElement) {
            errorElement.textContent = message || "";
            errorElement.hidden = !message;
        }
        input.classList.toggle("is-invalid", Boolean(message));
        input.setAttribute("aria-invalid", String(Boolean(message)));
    };
    const render = () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
        previewObjectUrls.forEach(url => URL.revokeObjectURL(url));
        objectUrls = [];
        previewObjectUrls = [];
        list.querySelectorAll(".bf-image-item[data-local-image]").forEach(item => item.remove());
        files.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "bf-image-item";
            item.dataset.localImage = "true";
            const url = URL.createObjectURL(file);
            objectUrls.push(url);
            previewObjectUrls.push(URL.createObjectURL(previewFiles[index] || file));
            item.innerHTML = `<img alt="${escapeHtml(file.name)}"><div class="bf-image-actions"><button type="button" class="bf-image-preview" data-file-index="${index}" aria-label="Xem ảnh"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button type="button" class="bf-image-delete" data-file-index="${index}" aria-label="Xóa ảnh">×</button></div>`;
            item.querySelector("img").src = url;
            list.appendChild(item);
        });
        if (addButton) {
            const existingCount = list.querySelectorAll(".bf-image-item[data-existing-src]:not([hidden])").length;
            addButton.hidden = multiple
                ? files.length + existingCount >= maxFiles
                : files.length > 0 || existingCount > 0;
        }
        updateRequired();
    };
    const setExisting = (src, value = "") => {
        showError("");
        list.querySelectorAll(".bf-image-item[data-existing-src]").forEach(item => item.remove());
        if (src) {
            const item = document.createElement("div");
            item.className = "bf-image-item";
            item.dataset.existingSrc = "true";
            item.innerHTML = `<img alt="Ảnh đã chọn"><div class="bf-image-actions"><button type="button" class="bf-image-preview" aria-label="Xem ảnh"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button type="button" class="bf-image-delete" aria-label="Xóa ảnh">×</button></div>`;
            const image = item.querySelector("img");
            image.src = src;
            item.querySelector(".bf-image-preview").dataset.existingSrc = src;
            item.querySelector(".bf-image-preview").dataset.alt = "Ảnh đã chọn";
            image.style.width = "100%";
            image.style.height = "100%";
            image.style.objectFit = "contain";
            list.prepend(item);
        }
        if (valueInput) valueInput.value = value || "";
        if (deleteState) deleteState.value = "false";
        render();
    };
    input.addEventListener("change", async () => {
        const selected = [...input.files];
        const incoming = selected.filter(file => file.type.startsWith("image/"));
        input.value = "";
        if (!incoming.length) {
            if (selected.length) showError("Chỉ được chọn tệp ảnh.");
            return;
        }
        if (multiple && files.length + incoming.length > maxFiles) {
            showError(`Chỉ được chọn tối đa ${maxFiles} ảnh.`);
            return;
        }
        input.disabled = true;
        try {
            const processed = await Promise.all(incoming.map(file => resizeImage(file, width, height)));
            if (multiple) {
                files.push(...processed);
                previewFiles.push(...incoming);
            }
            else {
                files.length = 0;
                previewFiles.length = 0;
                files.push(processed[0]);
                previewFiles.push(incoming[0]);
                const existing = list.querySelector(".bf-image-item[data-existing-src]");
                if (existing) existing.hidden = true;
                if (deleteState) deleteState.value = "true";
                if (valueInput) valueInput.value = "";
            }
            syncInput(input, files);
            showError("");
            render();
        } catch (error) {
            showError(error.message || "Không thể xử lý ảnh.");
        } finally {
            input.disabled = false;
            updateRequired();
        }
    });
    list.addEventListener("click", event => {
        const preview = event.target.closest(".bf-image-preview");
        if (preview) {
            event.preventDefault();
            const index = Number(preview.dataset.fileIndex);
            if (Number.isInteger(index) && files[index]) {
                openPreview(previewObjectUrls[index], previewFiles[index]?.name || files[index].name, preview);
                return;
            }
            if (preview.dataset.existingSrc) openPreview(preview.dataset.existingSrc, preview.dataset.alt || "", preview);
            return;
        }
        const deleteButton = event.target.closest(".bf-image-delete");
        if (!deleteButton) return;
        event.preventDefault();
        if (deleteButton.hasAttribute("data-file-index")) {
            const index = Number(deleteButton.dataset.fileIndex);
            files.splice(index, 1);
            previewFiles.splice(index, 1);
            syncInput(input, files);
            render();
            return;
        }
        const item = deleteButton.closest(".bf-image-item[data-existing-src]");
        if (item) {
            item.hidden = true;
            if (deleteState) deleteState.value = "true";
            if (valueInput) valueInput.value = "";
            if (addButton) addButton.hidden = false;
            showError("");
            updateRequired();
        }
    });
    wrapper.addEventListener("bookflow:image:set-existing", event => setExisting(event.detail?.src, event.detail?.value));
    wrapper.closest("form")?.addEventListener("bookflow:catalog:form-reset", () => {
        files.length = 0;
        previewFiles.length = 0;
        syncInput(input, files);
        showError("");
        setExisting("", "");
    });
    list.querySelectorAll(".bf-image-item[data-existing-src] img").forEach(image => {
        image.style.width = "100%";
        image.style.height = "100%";
        image.style.objectFit = "contain";
    });
    render();
}

export function initImageInputs(root = document) {
    root.querySelectorAll?.("[data-bf-image]").forEach(initialize);
}
