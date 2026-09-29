function initializeInput(button) {
    if (button.dataset.formInitialized === "true") return;
    button.dataset.formInitialized = "true";
    button.addEventListener("click", () => {
        const wrapper = button.closest(".bf-input-with-action");
        const input = wrapper?.querySelector("input");
        if (!input) return;
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.classList.toggle("is-visible", !visible);
        button.setAttribute("aria-label", visible ? "Hiển thị mật khẩu" : "Ẩn mật khẩu");
    });
}

export function initPasswordInputs(root = document) {
    root.querySelectorAll?.(".bf-password-toggle").forEach(initializeInput);
}