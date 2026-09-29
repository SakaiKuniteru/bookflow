function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    wrapper.dataset.formInitialized = "true";
    const editor = wrapper.querySelector(".bf-rich-editor");
    const hidden = wrapper.querySelector(".bf-rich-hidden");
    editor.innerHTML = editor.dataset.initialValue || "";
    const sync = () => {
        hidden.value = editor.innerHTML;
        hidden.dispatchEvent(new Event("input", { bubbles: true }));
        hidden.dispatchEvent(new Event("change", { bubbles: true }));
    };
    wrapper.querySelectorAll("[data-command]").forEach(control => {
        control.addEventListener("mousedown", event => event.preventDefault());
        control.addEventListener("click", () => {
            editor.focus();
            const command = control.dataset.command;
            if (command === "createLink") {
                const url = window.prompt("Nhập URL liên kết:");
                if (url) document.execCommand("createLink", false, url);
            } else {
                document.execCommand(command, false, control.value || null);
            }
            sync();
        });
    });
    editor.addEventListener("input", sync);
    editor.addEventListener("blur", sync);
    editor.addEventListener("paste", () => setTimeout(sync, 0));
}

export function initRichTextInputs(root = document) {
    root.querySelectorAll?.("[data-bf-rich-text]").forEach(initialize);
}