function formatSize(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function syncInput(input, files) {
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    wrapper.dataset.formInitialized = "true";
    const input = wrapper.querySelector(".bf-file-input");
    const list = wrapper.querySelector(".bf-file-list");
    const zone = wrapper.querySelector(".bf-file-dropzone");
    const multiple = wrapper.dataset.multiple === "true";
    const download = wrapper.dataset.download === "true";
    const files = [];
    const render = () => {
        list.querySelectorAll(".bf-file-item[data-local-file]").forEach(item => item.remove());
        files.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "bf-file-item";
            item.dataset.localFile = "true";
            item.innerHTML = `<button type="button" class="bf-file-name" data-file-index="${index}">${escapeHtml(file.name)}</button><span class="bf-file-size">${formatSize(file.size)}</span><button type="button" class="bf-file-delete" data-file-index="${index}" aria-label="Xóa tệp">×</button>`;
            list.appendChild(item);
        });
    };
    const addFiles = incoming => {
        const valid = [...incoming];
        if (multiple) files.push(...valid);
        else {
            files.length = 0;
            files.push(...valid.slice(0, 1));
        }
        syncInput(input, files);
        render();
    };
    input.addEventListener("change", () => addFiles(input.files));
    zone.addEventListener("dragover", event => {
        event.preventDefault();
        zone.classList.add("is-dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone.addEventListener("drop", event => {
        event.preventDefault();
        zone.classList.remove("is-dragover");
        addFiles(event.dataTransfer.files);
    });
    list.addEventListener("click", event => {
        const deleteButton = event.target.closest(".bf-file-delete");
        if (deleteButton) {
            const index = Number(deleteButton.dataset.fileIndex);
            files.splice(index, 1);
            syncInput(input, files);
            render();
            return;
        }
        const name = event.target.closest("[data-file-index]");
        if (name && download) {
            const file = files[Number(name.dataset.fileIndex)];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = file.name;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

export function initFileInputs(root = document) {
    root.querySelectorAll?.("[data-bf-file]").forEach(initialize);
}