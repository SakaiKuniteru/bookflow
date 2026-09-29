const registeredShortcuts = new WeakSet();

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    wrapper.dataset.formInitialized = "true";
    const input = wrapper.querySelector(".bf-search-input");
    const clear = wrapper.querySelector(".bf-search-clear");
    const performSearch = () => {
        const detail = {
            value: input.value.trim(),
            name: input.name,
            id: input.id
        };
        wrapper.dispatchEvent(new CustomEvent("bookflow:search", { bubbles: true, detail }));
        const form = input.closest("form");
        if (form) form.requestSubmit();
    };
    input.addEventListener("input", () => {
        clear.classList.toggle("is-visible", Boolean(input.value));
    });
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            performSearch();
        }
    });
    clear.addEventListener("click", () => {
        input.value = "";
        clear.classList.remove("is-visible");
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    if (!registeredShortcuts.has(document)) {
        registeredShortcuts.add(document);
        document.addEventListener("keydown", event => {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
            const target = document.querySelector("[data-bf-search] .bf-search-input");
            if (!target) return;
            event.preventDefault();
            target.focus();
            target.select();
        });
    }
}

export function initSearchInputs(root = document) {
    root.querySelectorAll?.("[data-bf-search]").forEach(initialize);
}