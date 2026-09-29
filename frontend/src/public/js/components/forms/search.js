const registeredShortcuts = new WeakSet();
const SEARCH_MODES = ["exact", "relative", "similar", "ratio"];

function normalizeMode(mode) {
    return SEARCH_MODES.includes(mode) ? mode : "relative";
}

function normalizeText(value) {
    return String(value ?? "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();
}

function editDistance(left, right) {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let row = 1; row <= left.length; row++) {
        let diagonal = previous[0];
        previous[0] = row;
        for (let column = 1; column <= right.length; column++) {
            const above = previous[column];
            previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (left[row - 1] === right[column - 1] ? 0 : 1));
            diagonal = above;
        }
    }
    return previous[right.length];
}

function similarityRatio(query, candidate) {
    const queryWords = query.split(" ").filter(Boolean);
    const candidateWords = candidate.split(" ").filter(Boolean);
    if (!query || !candidate) return 0;
    let best = 1 - editDistance(query, candidate) / Math.max(query.length, candidate.length);
    const minWords = Math.max(1, queryWords.length - 1);
    const maxWords = Math.min(candidateWords.length, queryWords.length + 1);
    for (let size = minWords; size <= maxWords; size++) {
        for (let start = 0; start + size <= candidateWords.length; start++) {
            const phrase = candidateWords.slice(start, start + size).join(" ");
            best = Math.max(best, 1 - editDistance(query, phrase) / Math.max(query.length, phrase.length));
        }
    }
    return Math.max(0, best);
}

function matchesSearch(query, candidate, mode = "relative", threshold = 85) {
    const selectedMode = normalizeMode(mode);
    const rawQuery = String(query ?? "").trim().toLocaleLowerCase();
    const rawCandidate = String(candidate ?? "").trim().toLocaleLowerCase();
    const normalizedQuery = normalizeText(query);
    const normalizedCandidate = normalizeText(candidate);
    if (!rawQuery) return true;
    if (selectedMode === "exact") return rawQuery === rawCandidate;
    if (selectedMode === "relative") return normalizedCandidate.includes(normalizedQuery);
    const initials = normalizedCandidate.split(" ").filter(Boolean).map(word => word[0]).join("");
    const ratio = similarityRatio(normalizedQuery, normalizedCandidate) * 100;
    const minimum = selectedMode === "similar" ? Math.min(Number(threshold) || 70, 70) : Math.max(0, Math.min(100, Number(threshold) || 85));
    return initials === normalizedQuery.replace(/\s/g, "") || ratio >= minimum;
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    const input = wrapper.querySelector(".bf-search-input");
    const clear = wrapper.querySelector(".bf-search-clear");
    const modeInput = wrapper.querySelector(".bf-search-mode");
    const thresholdInput = wrapper.querySelector(".bf-search-threshold");
    if (!input || !clear) return;
    wrapper.dataset.formInitialized = "true";
    const mode = normalizeMode(wrapper.dataset.mode);
    const threshold = Math.max(0, Math.min(100, Number(wrapper.dataset.threshold) || 85));
    wrapper.dataset.mode = mode;
    wrapper.dataset.threshold = String(threshold);
    if (modeInput) modeInput.value = mode;
    if (thresholdInput) thresholdInput.value = String(threshold);
    const updateClear = () => clear.classList.toggle("is-visible", Boolean(input.value));
    const performSearch = () => {
        const detail = { value: input.value.trim(), name: input.name, id: input.id, mode, threshold };
        wrapper.dispatchEvent(new CustomEvent("bookflow:search", { bubbles: true, detail }));
        const form = input.closest("form");
        if (form) form.requestSubmit();
    };
    updateClear();
    input.addEventListener("input", updateClear);
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            performSearch();
        }
    });
    clear.addEventListener("click", () => {
        input.value = "";
        updateClear();
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

export { matchesSearch };