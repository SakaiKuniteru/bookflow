const initializedDocuments = new WeakSet();
let previousFocus = null;
let previousBodyOverflow = "";

function getOpenModals(doc) {
    return [...doc.querySelectorAll("[data-bf-modal].is-open")];
}

function syncBodyLock(doc) {
    const hasOpenModal = getOpenModals(doc).length > 0;
    if (hasOpenModal) {
        if (!doc.body.dataset.modalLocked) {
            previousBodyOverflow = doc.body.style.overflow;
            doc.body.dataset.modalLocked = "true";
        }
        doc.body.style.overflow = "hidden";
    } else if (doc.body.dataset.modalLocked) {
        doc.body.style.overflow = previousBodyOverflow;
        delete doc.body.dataset.modalLocked;
    }
}
function clearModalErrors(modal) {
    if (!modal) return;
    modal.querySelectorAll("[data-bf-field-error]").forEach(error => error.remove());
    modal.querySelectorAll(".bf-form-error").forEach(error => {
        error.hidden = true;
        if (!error.matches(".bf-email-error, .bf-phone-error, .bf-date-error")) error.textContent = "";
    });
    modal.querySelectorAll("[aria-invalid='true']").forEach(field => {
        field.classList.remove("is-invalid");
        field.removeAttribute("aria-invalid");
    });
    modal.querySelectorAll("input, textarea, select").forEach(field => field.setCustomValidity(""));
}
function setModalLoading(modal, loading) {
    if (!modal) return;
    modal.dataset.loading = String(Boolean(loading));
    modal.classList.toggle("is-loading", Boolean(loading));
    const overlay = modal.querySelector("[data-bf-modal-loading-overlay]");
    if (overlay) overlay.hidden = !loading;
    modal.querySelectorAll("[data-bf-modal-close], [data-bf-modal-submit], [data-bf-modal-action]").forEach(button => {
        if (loading) {
            button.dataset.wasDisabled = String(button.disabled);
            button.disabled = true;
        } else {
            button.disabled = button.dataset.wasDisabled === "true";
            delete button.dataset.wasDisabled;
        }
    });
}

function openModal(modal, trigger) {
    if (!modal || modal.classList.contains("is-open")) return;
    clearModalErrors(modal);
    previousFocus = trigger || document.activeElement;
    modal.hidden = false;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    syncBodyLock(modal.ownerDocument);
    const focusTarget = modal.querySelector("[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]");
    focusTarget?.focus();
    modal.dispatchEvent(new CustomEvent("bookflow:modal:open", { bubbles: true }));
}

function closeModal(modal) {
    if (!modal || modal.dataset.loading === "true") return;
    clearModalErrors(modal);
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;
    syncBodyLock(modal.ownerDocument);
    modal.dispatchEvent(new CustomEvent("bookflow:modal:close", { bubbles: true }));
    if (!getOpenModals(modal.ownerDocument).length && previousFocus?.isConnected) previousFocus.focus();
}

function initializeDocument(doc) {
    if (initializedDocuments.has(doc)) return;
    initializedDocuments.add(doc);
    doc.addEventListener("click", event => {
        const opener = event.target.closest("[data-bf-modal-open]");
        if (opener) {
            const modal = doc.getElementById(opener.dataset.bfModalOpen.replace(/^#/, ""));
            openModal(modal, opener);
            return;
        }
        const closeButton = event.target.closest("[data-bf-modal-close]");
        if (closeButton) {
            closeModal(closeButton.closest("[data-bf-modal]"));
            return;
        }
        const backdrop = event.target.closest("[data-bf-modal-backdrop]");
        if (backdrop) {
            const modal = backdrop.closest("[data-bf-modal]");
            if (modal?.dataset.closeOnBackdrop === "true") closeModal(modal);
            return;
        }
        const confirmButton = event.target.closest("[data-bf-modal-confirm]");
        if (confirmButton) {
            const modal = confirmButton.closest("[data-bf-modal]");
            modal?.dispatchEvent(new CustomEvent("bookflow:modal:confirm", { bubbles: true, detail: { action: confirmButton.dataset.action } }));
            if (confirmButton.dataset.loadingOnConfirm === "true") setModalLoading(modal, true);
            return;
        }
        const actionButton = event.target.closest("[data-bf-modal-action]");
        if (actionButton) {
            const modal = actionButton.closest("[data-bf-modal]");
            modal?.dispatchEvent(new CustomEvent("bookflow:modal:action", { bubbles: true, detail: { action: actionButton.dataset.bfModalAction } }));
        }
    });
    doc.addEventListener("submit", event => {
        const form = event.target.closest("[data-bf-modal-form]");
        if (form) setModalLoading(form.closest("[data-bf-modal]"), true);
    });
    doc.addEventListener("keydown", event => {
        const modal = getOpenModals(doc).at(-1);
        if (!modal) return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeModal(modal);
            return;
        }
        if (event.key !== "Tab") return;
        const focusable = [...modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(item => !item.hidden);
        if (!focusable.length) {
            event.preventDefault();
            modal.querySelector(".bf-modal-dialog")?.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && doc.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && doc.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
}

export function initModals(root = document) {
    const doc = root.ownerDocument || root;
    initializeDocument(doc);
    root.querySelectorAll?.("[data-bf-modal][data-loading='true']").forEach(modal => setModalLoading(modal, true));
}

export { closeModal, openModal, setModalLoading };