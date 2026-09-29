function syncInput(input, files) {
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
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
    return modal;
}

function openPreview(src, alt) {
    const modal = createPreviewModal();
    modal.querySelector("img").src = src;
    modal.querySelector("img").alt = alt || "";
    modal.classList.add("is-open");
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    wrapper.dataset.formInitialized = "true";
    const input = wrapper.querySelector(".bf-image-input");
    const list = wrapper.querySelector(".bf-image-list");
    const multiple = wrapper.dataset.multiple === "true";
    const width = Number(wrapper.dataset.width) || 160;
    const height = Number(wrapper.dataset.height) || 160;
    const files = [];
    const render = () => {
        list.querySelectorAll(".bf-image-item[data-local-image]").forEach(item => item.remove());
        files.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "bf-image-item";
            item.dataset.localImage = "true";
            const url = URL.createObjectURL(file);
            item.innerHTML = `<img src="${url}" alt="${escapeHtml(file.name)}"><div class="bf-image-actions"><button type="button" class="bf-image-preview" data-image-index="${index}" aria-label="Xem ảnh"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button><button type="button" class="bf-image-delete" data-image-index="${index}" aria-label="Xóa ảnh">×</button></div>`;
            const image = item.querySelector("img");
            image.style.width = `${width}px`;
            image.style.height = `${height}px`;
            image.style.objectFit = "fill";
            list.appendChild(item);
        });
    };
    input.addEventListener("change", () => {
        const incoming = [...input.files].filter(file => file.type.startsWith("image/"));
        if (multiple) files.push(...incoming);
        else {
            files.length = 0;
            files.push(...incoming.slice(0, 1));
        }
        syncInput(input, files);
        render();
    });
    list.addEventListener("click", event => {
        const preview = event.target.closest("[data-image-index]");
        const deleteButton = event.target.closest("[data-image-index]");
        if (preview && event.target.closest(".bf-image-preview")) {
            const file = files[Number(preview.dataset.imageIndex)];
            if (file) openPreview(URL.createObjectURL(file), file.name);
        }
        if (deleteButton && event.target.closest(".bf-image-delete")) {
            files.splice(Number(deleteButton.dataset.imageIndex), 1);
            syncInput(input, files);
            render();
        }
    });
    list.querySelectorAll(".bf-image-item img").forEach(image => {
        image.style.width = `${width}px`;
        image.style.height = `${height}px`;
        image.style.objectFit = "fill";
    });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

export function initImageInputs(root = document) {
    root.querySelectorAll?.("[data-bf-image]").forEach(initialize);
}