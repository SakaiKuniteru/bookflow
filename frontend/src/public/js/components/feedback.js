const initializedDocuments = new WeakSet();
const toastTimers = new WeakMap();
const loadingLeases = new WeakMap();
const activeApiLoading = new Map();

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
function findLoading(host) {
    if (!host) return null;
    if (host.matches?.("[data-bf-loading]")) return host;
    const direct = [...(host.children || [])].find(child => child.matches?.("[data-bf-loading]"));
    if (direct) return direct;
    if (host === document.body) return null;
    return host.querySelector?.("[data-bf-loading]") || null;
}
function setLoadingText(target, message, channel = "api") {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;
    const state = loadingLeases.get(host);
    if (state?.counts.has(channel)) {
        state.texts.delete(channel);
        state.texts.set(channel, message || "");
    }
    const loading = state?.loading || findLoading(host);
    const text = loading?.querySelector(".bf-loading-text");
    if (!text) return;
    text.textContent = message || "";
    text.hidden = !message;
}
function syncApiLoading(type, id, message) {
    if (type === "start") {
        if (!id || activeApiLoading.has(id)) return;
        activeApiLoading.set(id, message || "Đang tải dữ liệu...");
        const currentMessage = [...activeApiLoading.values()].at(-1);
        if (activeApiLoading.size === 1) showLoading(document.body, { fullscreen: true, text: currentMessage, channel: "api" });
        else setLoadingText(document.body, currentMessage, "api");
        return;
    }
    if (type !== "end" || !activeApiLoading.delete(id)) return;
    if (!activeApiLoading.size) hideLoading(document.body, { channel: "api" });
    else setLoadingText(document.body, [...activeApiLoading.values()].at(-1), "api");
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
            showLoading(document.body, { fullscreen: true, text: "Đang mở trang...", channel: "navigation" });
            if (history.length > 1) history.back();
            else window.location.assign("/");
            return;
        }
        if (event.target.closest("[data-feedback-retry]")) {
            showLoading(document.body, { fullscreen: true, text: "Đang tải lại trang...", channel: "navigation" });
            window.location.reload();
            return;
        }
        const link = event.target.closest?.("a[href]");
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
        const rawHref = link.getAttribute("href") || "";
        if (!rawHref || rawHref.startsWith("#")) return;
        let destination;
        try { destination = new URL(link.href, window.location.href); } catch { return; }
        if (destination.origin !== window.location.origin || (destination.pathname === window.location.pathname && destination.search === window.location.search)) return;
        showLoading(document.body, { fullscreen: true, text: "Đang mở trang...", channel: "navigation" });
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
    window.addEventListener("bookflow:api-loading", event => {
        const detail = event.detail || {};
        syncApiLoading(detail.type, detail.id, detail.text);
    });
    window.__bfActiveLoadingRequests?.forEach((request, id) => syncApiLoading("start", request?.id || id, request?.text));
    window.addEventListener("pageshow", () => hideLoading(document.body, { channel: "navigation" }));
    window.BookFlowFeedback = { toast: showToast, showLoading, hideLoading };
}

function showLoading(target, options = {}) {
    if (!target) return null;
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return null;
    const channel = options.channel || "manual";
    let state = loadingLeases.get(host);
    if (!state) {
        state = { counts: new Map(), texts: new Map(), fullscreen: new Map(), loading: null };
        loadingLeases.set(host, state);
    }
    state.counts.set(channel, (state.counts.get(channel) || 0) + 1);
    state.texts.delete(channel);
    state.texts.set(channel, options.text || "");
    state.fullscreen.set(channel, Boolean(options.fullscreen));
    let loading = state.loading || findLoading(host);
    if (!loading) {
        loading = document.createElement("div");
        loading.className = "bf-loading";
        loading.dataset.bfLoading = "";
        loading.setAttribute("role", "status");
        loading.setAttribute("aria-live", "polite");
        loading.setAttribute("aria-busy", "true");
        loading.innerHTML = `<div class="bf-loading-backdrop"></div><div class="bf-loading-content"><img class="bf-loading-brand" alt=""><span class="bf-loading-spinner" aria-hidden="true"></span><span class="bf-loading-text"></span></div>`;
        const brandLogo = loading.querySelector(".bf-loading-brand");
        brandLogo.src = document.body.dataset.bfAppLogo || "/brand/logo-symbol.svg";
        brandLogo.title = document.body.dataset.bfAppName || "";
        host.appendChild(loading);
    }
    state.loading = loading;
    const fullscreen = [...state.fullscreen.values()].some(Boolean);
    loading.classList.toggle("bf-loading-fullscreen", fullscreen);
    loading.classList.toggle("bf-loading-region", !fullscreen);
    loading.dataset.fullscreen = String(fullscreen);
    if (fullscreen) document.body.appendChild(loading);
    else if (loading.parentElement !== host) host.appendChild(loading);
    const message = [...state.texts.values()].reverse().find(Boolean) || "";
    const text = loading.querySelector(".bf-loading-text");
    if (text) {
        text.textContent = message;
        text.hidden = !message;
    }
    loading.hidden = false;
    loading.setAttribute("aria-busy", "true");
    return loading;
}
function hideLoading(target, options = {}) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;
    const channel = options.channel || "manual";
    const state = loadingLeases.get(host);
    const loading = state?.loading || findLoading(host);
    if (!loading) return;
    if (!state) {
        loading.hidden = true;
        loading.setAttribute("aria-busy", "false");
        return;
    }
    const count = state.counts.get(channel) || 0;
    if (!count) return;
    if (count > 1) state.counts.set(channel, count - 1);
    else {
        state.counts.delete(channel);
        state.texts.delete(channel);
        state.fullscreen.delete(channel);
    }
    if (!state.counts.size) {
        loading.hidden = true;
        loading.setAttribute("aria-busy", "false");
        loadingLeases.delete(host);
        return;
    }
    const fullscreen = [...state.fullscreen.values()].some(Boolean);
    loading.classList.toggle("bf-loading-fullscreen", fullscreen);
    loading.classList.toggle("bf-loading-region", !fullscreen);
    loading.dataset.fullscreen = String(fullscreen);
    if (fullscreen) document.body.appendChild(loading);
    else if (loading.parentElement !== host) host.appendChild(loading);
    const message = [...state.texts.values()].reverse().find(Boolean) || "";
    const text = loading.querySelector(".bf-loading-text");
    if (text) {
        text.textContent = message;
        text.hidden = !message;
    }
    loading.hidden = false;
    loading.setAttribute("aria-busy", "true");
}

export { initFeedback, showToast, showLoading, hideLoading };
