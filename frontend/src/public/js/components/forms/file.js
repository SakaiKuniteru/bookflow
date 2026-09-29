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

function createFileIcon() {
    const icon = document.createElement("span");
    icon.className = "bf-file-item-icon";
    icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"></path></svg>`;
    return icon;
}

function createDeleteButton(onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bf-file-delete";
    button.setAttribute("aria-label", "Xóa tệp");
    button.title = "Xóa tệp";
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"></path></svg>`;
    button.addEventListener("click", onClick);
    return button;
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    const input = wrapper.querySelector(".bf-file-input");
    const list = wrapper.querySelector(".bf-file-list");
    const zone = wrapper.querySelector(".bf-file-dropzone");
    const removedFiles = wrapper.querySelector(".bf-file-removed");
    if (!input || !list || !zone) return;
    wrapper.dataset.formInitialized = "true";
    const multiple = wrapper.dataset.multiple === "true";
    const download = wrapper.dataset.download === "true";
    const disabled = wrapper.dataset.disabled === "true";
    const name = wrapper.dataset.name || input.name;
    const files = [];
    const createName = (file, url, index) => {
        if (!download) {
            const text = document.createElement("span");
            text.className = "bf-file-name";
            text.textContent = file.name;
            return text;
        }
        const link = document.createElement("a");
        link.className = "bf-file-name";
        link.textContent = file.name;
        link.href = url;
        link.setAttribute("download", file.name);
        if (Number.isInteger(index)) link.dataset.fileIndex = String(index);
        return link;
    };
    const render = () => {
        list.querySelectorAll(".bf-file-item[data-local-file]").forEach(item => item.remove());
        files.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "bf-file-item";
            item.dataset.localFile = "true";
            const url = URL.createObjectURL(file);
            item.appendChild(createFileIcon());
            item.appendChild(createName(file, url, index));
            const size = document.createElement("span");
            size.className = "bf-file-size";
            size.textContent = formatSize(file.size);
            item.appendChild(size);
            item.appendChild(createDeleteButton(() => {
                URL.revokeObjectURL(url);
                files.splice(index, 1);
                syncInput(input, files);
                render();
            }));
            list.appendChild(item);
        });
    };
    const addFiles = incoming => {
        const valid = [...incoming].filter(file => !input.accept || input.accept === "*" || input.accept.split(",").some(rule => rule.trim().startsWith(".") ? file.name.toLowerCase().endsWith(rule.trim().toLowerCase()) : rule.trim().endsWith("/*") ? file.type.startsWith(rule.trim().slice(0, -1)) : file.type === rule.trim()));
        if (!valid.length) return;
        if (multiple) files.push(...valid);
        else {
            files.length = 0;
            files.push(valid[0]);
            list.querySelectorAll(".bf-file-item[data-existing-file]").forEach(item => item.remove());
        }
        syncInput(input, files);
        render();
    };
    input.addEventListener("change", () => {
        const incoming = [...input.files];
        input.value = "";
        addFiles(incoming);
    });
    zone.addEventListener("dragover", event => {
        if (disabled) return;
        event.preventDefault();
        zone.classList.add("is-dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone.addEventListener("drop", event => {
        if (disabled) return;
        event.preventDefault();
        zone.classList.remove("is-dragover");
        addFiles(event.dataTransfer.files);
    });
    list.addEventListener("click", event => {
        const deleteButton = event.target.closest(".bf-file-delete");
        if (!deleteButton) return;
        event.preventDefault();
        const item = deleteButton.closest(".bf-file-item");
        if (item?.hasAttribute("data-existing-file")) {
            const url = item.dataset.url || "";
            const removed = document.createElement("input");
            removed.type = "hidden";
            removed.name = `${name}_removed[]`;
            removed.value = url;
            removedFiles?.appendChild(removed);
            item.remove();
            wrapper.dispatchEvent(new CustomEvent("bf:file-remove", { bubbles: true, detail: { name: item.dataset.name || "", url } }));
        }
    });
    list.querySelectorAll(".bf-file-item[data-existing-file]").forEach(item => {
        const deleteButton = item.querySelector(".bf-file-delete");
        deleteButton?.addEventListener("click", event => {
            event.preventDefault();
            const url = item.dataset.url || "";
            const removed = document.createElement("input");
            removed.type = "hidden";
            removed.name = `${name}_removed[]`;
            removed.value = url;
            removedFiles?.appendChild(removed);
            item.remove();
            wrapper.dispatchEvent(new CustomEvent("bf:file-remove", { bubbles: true, detail: { name: item.dataset.name || "", url } }));
        });
    });
}

export function initFileInputs(root = document) {
    root.querySelectorAll?.("[data-bf-file]").forEach(initialize);
}