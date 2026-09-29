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
    modal.innerHTML = `<div class="bf-image-modal-backdrop"></div><div class="bf-image-modal-content"><button type="button" class="bf-image-modal-close" aria-label="Đóng">×</button><img alt=""></div>`;
    document.body.appendChild(modal);
    const close = () => modal.classList.remove("is-open");
    modal.querySelector(".bf-image-modal-backdrop").addEventListener("click", close);
    modal.querySelector(".bf-image-modal-close").addEventListener("click", close);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") close();
    });
    return modal;
}

function openPreview(src, alt) {
    const modal = createPreviewModal();
    const image = modal.querySelector("img");
    image.src = src;
    image.alt = alt || "";
    modal.classList.add("is-open");
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    const input = wrapper.querySelector(".bf-image-input");
    const list = wrapper.querySelector(".bf-image-list");
    const addButton = wrapper.querySelector(".bf-image-add");
    const deleteState = wrapper.querySelector(".bf-image-delete-state");
    if (!input || !list) return;
    wrapper.dataset.formInitialized = "true";
    const multiple = wrapper.dataset.multiple === "true";
    const width = Math.max(1, Math.round(Number(wrapper.dataset.width) || 160));
    const height = Math.max(1, Math.round(Number(wrapper.dataset.height) || 160));
    const files = [];
    let objectUrls = [];
    wrapper.style.setProperty("--bf-image-width", `${width}px`);
    wrapper.style.setProperty("--bf-image-height", `${height}px`);
    const updateRequired = () => {
        const existingVisible = Boolean(list.querySelector(".bf-image-item[data-existing-src]:not([hidden])"));
        input.required = input.dataset.required === "true" && !existingVisible && files.length === 0;
    };
    const render = () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
        objectUrls = [];
        list.querySelectorAll(".bf-image-item[data-local-image]").forEach(item => item.remove());
        files.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "bf-image-item";
            item.dataset.localImage = "true";
            const url = URL.createObjectURL(file);
            objectUrls.push(url);
            item.innerHTML = `<img alt="${escapeHtml(file.name)}"><div class="bf-image-actions"><button type="button" class="bf-image-preview" data-file-index="${index}" aria-label="Xem ảnh"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button type="button" class="bf-image-delete" data-file-index="${index}" aria-label="Xóa ảnh">×</button></div>`;
            item.querySelector("img").src = url;
            list.appendChild(item);
        });
        if (addButton) addButton.hidden = !multiple && files.length > 0 && !list.querySelector(".bf-image-item[data-existing-src]:not([hidden])");
        updateRequired();
    };
    input.addEventListener("change", async () => {
        const incoming = [...input.files].filter(file => file.type.startsWith("image/"));
        input.value = "";
        if (!incoming.length) return;
        input.disabled = true;
        try {
            const processed = await Promise.all(incoming.map(file => resizeImage(file, width, height)));
            if (multiple) files.push(...processed);
            else {
                files.length = 0;
                files.push(processed[0]);
                const existing = list.querySelector(".bf-image-item[data-existing-src]");
                if (existing) existing.hidden = true;
                if (deleteState) deleteState.value = "true";
            }
            syncInput(input, files);
            render();
        } catch (error) {
            window.alert(error.message || "Không thể xử lý ảnh.");
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
                openPreview(objectUrls[index], files[index].name);
                return;
            }
            if (preview.dataset.existingSrc) openPreview(preview.dataset.existingSrc, preview.dataset.alt || "");
            return;
        }
        const deleteButton = event.target.closest(".bf-image-delete");
        if (!deleteButton) return;
        event.preventDefault();
        if (deleteButton.hasAttribute("data-file-index")) {
            files.splice(Number(deleteButton.dataset.fileIndex), 1);
            syncInput(input, files);
            render();
            return;
        }
        const item = deleteButton.closest(".bf-image-item[data-existing-src]");
        if (item) {
            item.hidden = true;
            if (deleteState) deleteState.value = "true";
            if (addButton) addButton.hidden = false;
            updateRequired();
        }
    });
    list.querySelectorAll(".bf-image-item[data-existing-src] img").forEach(image => {
        image.style.width = `${width}px`;
        image.style.height = `${height}px`;
        image.style.objectFit = "fill";
    });
    updateRequired();
}

export function initImageInputs(root = document) {
    root.querySelectorAll?.("[data-bf-image]").forEach(initialize);
}