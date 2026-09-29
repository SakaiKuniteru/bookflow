const initializedDocuments = new WeakSet();
const toastTimers = new WeakMap();

function normalizeType(type) {
    return ["success", "error", "warning", "info"].includes(type) ? type : "info";
}

function removeToast(toast) {
    const timer = toastTimers.get(toast);
    if (timer) clearTimeout(timer);
    toastTimers.delete(toast);
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 180);
}

function scheduleToast(toast) {
    const duration = Number(toast.dataset.duration) || 4500;
    if (duration <= 0) return;
    toastTimers.set(toast, setTimeout(() => removeToast(toast), duration));
}

function showToast({ type = "info", message = "", duration = 4500 } = {}) {
    if (!message) return null;
    let region = document.querySelector("[data-bf-toast-region]");
    if (!region) {
        region = document.createElement("div");
        region.className = "bf-toast-region";
        region.dataset.bfToastRegion = "";
        region.setAttribute("aria-live", "polite");
        region.setAttribute("aria-relevant", "additions");
        document.body.appendChild(region);
    }
    const toast = document.createElement("div");
    toast.className = `bf-toast bf-toast-${normalizeType(type)}`;
    toast.dataset.bfToast = "";
    toast.dataset.duration = String(duration);
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    const icon = document.createElement("span");
    icon.className = "bf-toast-icon";
    icon.textContent = type === "success" ? "✓" : type === "warning" || type === "error" ? "!" : "i";
    const text = document.createElement("span");
    text.className = "bf-toast-message";
    text.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "bf-toast-close";
    close.dataset.feedbackDismiss = "";
    close.setAttribute("aria-label", "Đóng thông báo");
    close.textContent = "×";
    toast.append(icon, text, close);
    region.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    scheduleToast(toast);
    return toast;
}

function initFeedback(root = document) {
    const doc = root.ownerDocument || root;
    const toasts = [];
    if (root.matches?.("[data-bf-toast]")) toasts.push(root);
    root.querySelectorAll?.("[data-bf-toast]").forEach(toast => toasts.push(toast));
    toasts.forEach(toast => {
        if (toast.dataset.initialized === "true") return;
        toast.dataset.initialized = "true";
        if (!toast.hidden) {
            requestAnimationFrame(() => toast.classList.add("is-visible"));
            scheduleToast(toast);
        }
    });
    if (initializedDocuments.has(doc)) return;
    initializedDocuments.add(doc);
    doc.addEventListener("click", event => {
        const dismiss = event.target.closest("[data-feedback-dismiss]");
        if (dismiss) {
            const toast = dismiss.closest("[data-bf-toast]");
            if (toast) removeToast(toast);
            else dismiss.closest(".bf-alert")?.remove();
            return;
        }
        if (event.target.closest("[data-feedback-back]")) {
            if (history.length > 1) history.back();
            else window.location.assign("/");
            return;
        }
        if (event.target.closest("[data-feedback-retry]")) window.location.reload();
    });
    doc.addEventListener("bookflow:toast", event => showToast(event.detail));
    doc.addEventListener("bookflow:loading:show", event => {
        const target = event.detail?.target;
        const element = typeof target === "string" ? doc.querySelector(target) : target;
        if (element) showLoading(element, event.detail);
    });
    doc.addEventListener("bookflow:loading:hide", event => {
        const target = event.detail?.target;
        const element = typeof target === "string" ? doc.querySelector(target) : target;
        if (element) hideLoading(element);
    });
    window.BookFlowFeedback = { toast: showToast, showLoading, hideLoading };
}

function showLoading(target, options = {}) {
    if (!target) return null;
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return null;
    let loading = host.matches?.("[data-bf-loading]") ? host : host.querySelector("[data-bf-loading]");
    if (!loading) {
        const template = document.createElement("div");
        template.className = `bf-loading ${options.fullscreen ? "bf-loading-fullscreen" : "bf-loading-region"}`;
        template.dataset.bfLoading = "";
        template.dataset.fullscreen = String(Boolean(options.fullscreen));
        template.setAttribute("role", "status");
        template.setAttribute("aria-live", "polite");
        template.setAttribute("aria-busy", "true");
        template.innerHTML = `<div class="bf-loading-backdrop"></div><div class="bf-loading-content"><span class="bf-loading-spinner" aria-hidden="true"><i style="--bf-spinner-index:0"></i><i style="--bf-spinner-index:1"></i><i style="--bf-spinner-index:2"></i><i style="--bf-spinner-index:3"></i><i style="--bf-spinner-index:4"></i><i style="--bf-spinner-index:5"></i><i style="--bf-spinner-index:6"></i><i style="--bf-spinner-index:7"></i><i style="--bf-spinner-index:8"></i><i style="--bf-spinner-index:9"></i><i style="--bf-spinner-index:10"></i><i style="--bf-spinner-index:11"></i></span><span class="bf-loading-text"></span></div>`;
        loading = template;
        host.appendChild(loading);
    }
    const text = loading.querySelector(".bf-loading-text");
    if (text) {
        text.textContent = options.text || "";
        text.hidden = !options.text;
    }
    if (options.fullscreen) {
        loading.classList.add("bf-loading-fullscreen");
        loading.dataset.fullscreen = "true";
        document.body.appendChild(loading);
    } else {
        loading.classList.remove("bf-loading-fullscreen");
        loading.dataset.fullscreen = "false";
    }
    loading.hidden = false;
    return loading;
}

function hideLoading(target) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;
    const loading = host.matches?.("[data-bf-loading]") ? host : host.querySelector("[data-bf-loading]");
    if (loading) loading.hidden = true;
}

export { initFeedback, showToast, showLoading, hideLoading };