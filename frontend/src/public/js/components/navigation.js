const initializedDocuments = new WeakSet();

function closeMenu(wrapper, returnFocus = false) {
    wrapper.classList.remove("is-open");
    wrapper.querySelector("[data-bf-menu-trigger]")?.setAttribute("aria-expanded", "false");
    const panel = wrapper.querySelector("[data-bf-menu-panel]");
    if (panel) panel.hidden = true;
    if (returnFocus) wrapper.querySelector("[data-bf-menu-trigger]")?.focus();
}

function openMenu(wrapper) {
    document.querySelectorAll("[data-bf-menu].is-open").forEach(item => {
        if (item !== wrapper) closeMenu(item);
    });
    wrapper.classList.add("is-open");
    wrapper.querySelector("[data-bf-menu-trigger]")?.setAttribute("aria-expanded", "true");
    const panel = wrapper.querySelector("[data-bf-menu-panel]");
    if (panel) panel.hidden = false;
}
async function loadSidebarAvatars(root) {
    const images = root.querySelectorAll("[data-bf-avatar-file-id]");
    await Promise.all([...images].map(async image => {
        const fileId = image.dataset.bfAvatarFileId;
        if (!/^[1-9]\d*$/.test(fileId || "")) return;
        try {
            const response = await fetch(`/api/tep-tin/${fileId}/url`, { credentials: "same-origin", headers: { Accept: "application/json" } });
            if (!response.ok) return;
            const payload = await response.json();
            if (typeof payload?.data?.url !== "string") return;
            const fallback = image.parentElement?.querySelector("[data-bf-avatar-fallback]");
            image.addEventListener("load", () => {
                image.hidden = false;
                if (fallback) fallback.hidden = true;
            }, { once: true });
            image.addEventListener("error", () => {
                image.hidden = true;
                if (fallback) fallback.hidden = false;
            }, { once: true });
            image.src = payload.data.url;
        } catch {}
    }));
}
function initNavigation(root = document) {
    const doc = root.ownerDocument || root;
    if (initializedDocuments.has(doc)) return;
    initializedDocuments.add(doc);
    loadSidebarAvatars(doc);
    doc.addEventListener("click", event => {
        const toggle = event.target.closest("[data-bf-sidebar-toggle]");
        if (toggle) {
            const sidebar = doc.getElementById(toggle.dataset.bfSidebarToggle);
            if (sidebar) {
                const isOpen = sidebar.classList.toggle("is-open");
                toggle.setAttribute("aria-expanded", String(isOpen));
            }
            return;
        }
        const trigger = event.target.closest("[data-bf-menu-trigger]");
        if (trigger) {
            const wrapper = trigger.closest("[data-bf-menu]");
            if (!wrapper) return;
            wrapper.classList.contains("is-open") ? closeMenu(wrapper) : openMenu(wrapper);
            return;
        }
        const markAll = event.target.closest('[data-bf-menu-action="mark-all-read"]');
        if (markAll) {
            const wrapper = markAll.closest("[data-bf-menu]");
            wrapper?.dispatchEvent(new CustomEvent("bookflow:notifications:mark-all-read", { bubbles: true }));
            wrapper?.querySelectorAll(".bf-nav-notification.is-unread").forEach(item => item.classList.replace("is-unread", "is-read"));
            return;
        }
        const notification = event.target.closest("[data-bf-notification]");
        if (notification) {
            notification.closest("[data-bf-menu]")?.dispatchEvent(new CustomEvent("bookflow:notification:open", { bubbles: true, detail: { id: notification.dataset.notificationId } }));
            return;
        }
        doc.querySelectorAll("[data-bf-menu].is-open").forEach(wrapper => {
            if (!wrapper.contains(event.target)) closeMenu(wrapper);
        });
        if (!event.target.closest("[data-bf-sidebar]")) {
            doc.querySelectorAll("[data-bf-sidebar].is-open").forEach(sidebar => sidebar.classList.remove("is-open"));
            doc.querySelectorAll("[data-bf-sidebar-toggle][aria-expanded='true']").forEach(button => button.setAttribute("aria-expanded", "false"));
        }
    });
    doc.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        const open = doc.querySelector("[data-bf-menu].is-open");
        if (open) closeMenu(open, true);
        doc.querySelectorAll("[data-bf-sidebar].is-open").forEach(sidebar => sidebar.classList.remove("is-open"));
    });
}

export default initNavigation;
export { initNavigation };