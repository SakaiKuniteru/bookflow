const initializedDocuments = new WeakSet();

export function initPasswordInputs(root = document) {
    const doc = root.nodeType === 9 ? root : root.ownerDocument || document;
    if (initializedDocuments.has(doc)) return;
    initializedDocuments.add(doc);
    doc.addEventListener("click", event => {
        const button = event.target.closest?.(".bf-password-toggle");
        if (!button) return;
        const input = button.closest(".bf-input-with-action")?.querySelector("input");
        if (!input || input.disabled) return;
        const visible = input.type === "password";
        input.type = visible ? "text" : "password";
        button.classList.toggle("is-visible", visible);
        button.setAttribute("aria-label", visible ? "Ẩn mật khẩu" : "Hiển thị mật khẩu");
        button.setAttribute("aria-pressed", String(visible));
        input.focus({ preventScroll: true });
    });
}
