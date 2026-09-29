function getOptions(wrapper) {
    return [...wrapper.querySelectorAll(".bf-select-option:not(.bf-select-all-option)")];
}

function getSelected(wrapper) {
    return getOptions(wrapper).filter(option => option.classList.contains("is-selected"));
}

function updateHiddenValues(wrapper) {
    const container = wrapper.querySelector(".bf-select-hidden-values");
    const name = wrapper.dataset.name;
    const multiple = wrapper.dataset.multiple === "true";
    container.innerHTML = "";
    getSelected(wrapper).forEach(option => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = multiple ? `${name}[]` : name;
        input.value = option.dataset.value;
        container.appendChild(input);
    });
}

function updateDisplay(wrapper) {
    const value = wrapper.querySelector(".bf-select-value");
    const clear = wrapper.querySelector(".bf-select-clear");
    const selected = getSelected(wrapper);
    const multiple = wrapper.dataset.multiple === "true";
    value.innerHTML = "";
    if (!selected.length) {
        value.textContent = wrapper.dataset.placeholder || "Chọn...";
        wrapper.classList.remove("has-value");
        if (clear) clear.hidden = true;
    } else if (multiple) {
        selected.forEach(option => {
            const chip = document.createElement("span");
            chip.className = "bf-select-chip";
            chip.innerHTML = `<span>${escapeHtml(option.dataset.label)}</span><button type="button" data-remove-value="${escapeAttribute(option.dataset.value)}" aria-label="Bỏ lựa chọn">×</button>`;
            value.appendChild(chip);
        });
        wrapper.classList.add("has-value");
        if (clear) clear.hidden = false;
    } else {
        value.textContent = selected[0].dataset.label;
        wrapper.classList.add("has-value");
        if (clear) clear.hidden = false;
    }
    updateHiddenValues(wrapper);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttribute(value) {
    return String(value ?? "").replace(/"/g, "&quot;");
}

function setActive(wrapper, index) {
    const options = getOptions(wrapper).filter(option => !option.disabled && !option.hidden);
    if (!options.length) return;
    index = Math.max(0, Math.min(index, options.length - 1));
    wrapper.querySelectorAll(".bf-select-option").forEach(option => option.classList.remove("is-active"));
    options[index].classList.add("is-active");
    options[index].scrollIntoView({ block: "nearest" });
}

function toggleOption(wrapper, option) {
    if (!option || option.disabled) return;
    const multiple = wrapper.dataset.multiple === "true";
    const all = wrapper.dataset.selectAll === "true";
    if (option.classList.contains("bf-select-all-option")) {
        if (!all) return;
        const options = getOptions(wrapper).filter(item => !item.disabled);
        const selected = options.every(item => item.classList.contains("is-selected"));
        options.forEach(item => item.classList.toggle("is-selected", !selected));
    } else if (multiple) {
        option.classList.toggle("is-selected");
    } else {
        getOptions(wrapper).forEach(item => item.classList.remove("is-selected"));
        option.classList.add("is-selected");
        close(wrapper);
    }
    updateDisplay(wrapper);
}

function open(wrapper) {
    wrapper.classList.add("is-open");
    wrapper.querySelector(".bf-select-control")?.setAttribute("aria-expanded", "true");
    setActive(wrapper, 0);
    const search = wrapper.querySelector(".bf-select-search-input");
    if (search) setTimeout(() => search.focus(), 0);
}

function close(wrapper) {
    wrapper.classList.remove("is-open");
    wrapper.querySelector(".bf-select-control")?.setAttribute("aria-expanded", "false");
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    wrapper.dataset.formInitialized = "true";
    const control = wrapper.querySelector(".bf-select-control");
    const optionsBox = wrapper.querySelector(".bf-select-options");
    const search = wrapper.querySelector(".bf-select-search-input");
    control.addEventListener("click", event => {
        if (event.target.closest(".bf-select-clear")) return;
        wrapper.classList.contains("is-open") ? close(wrapper) : open(wrapper);
    });
    control.addEventListener("keydown", event => {
        const options = getOptions(wrapper).filter(option => !option.disabled && !option.hidden);
        const active = options.findIndex(option => option.classList.contains("is-active"));
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!wrapper.classList.contains("is-open")) open(wrapper);
            else setActive(wrapper, active + 1);
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (wrapper.classList.contains("is-open")) setActive(wrapper, active - 1);
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!wrapper.classList.contains("is-open")) open(wrapper);
            else toggleOption(wrapper, options[Math.max(active, 0)]);
        }
        if (event.key === "Escape") close(wrapper);
        if (event.key === "Home") {
            event.preventDefault();
            setActive(wrapper, 0);
        }
        if (event.key === "End") {
            event.preventDefault();
            setActive(wrapper, options.length - 1);
        }
    });
    optionsBox.addEventListener("click", event => {
        const option = event.target.closest(".bf-select-option");
        const remove = event.target.closest("[data-remove-value]");
        if (option) toggleOption(wrapper, option);
        if (remove) {
            const target = getOptions(wrapper).find(item => item.dataset.value === remove.dataset.removeValue);
            if (target) target.classList.remove("is-selected");
            updateDisplay(wrapper);
            event.stopPropagation();
        }
    });
    wrapper.querySelector(".bf-select-clear")?.addEventListener("click", event => {
        event.stopPropagation();
        getOptions(wrapper).forEach(option => option.classList.remove("is-selected"));
        updateDisplay(wrapper);
    });
    search?.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        let visible = 0;
        getOptions(wrapper).forEach(option => {
            const match = option.dataset.label.toLowerCase().includes(query);
            option.hidden = !match;
            if (match) visible++;
        });
        const empty = wrapper.querySelector(".bf-select-empty");
        if (empty) empty.hidden = visible !== 0;
        setActive(wrapper, 0);
    });
    search?.addEventListener("keydown", event => {
        if (event.key === "Escape") close(wrapper);
        if (event.key === "Enter") {
            event.preventDefault();
            const active = wrapper.querySelector(".bf-select-option.is-active");
            if (active) toggleOption(wrapper, active);
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const options = getOptions(wrapper).filter(option => !option.disabled && !option.hidden);
            const active = options.findIndex(option => option.classList.contains("is-active"));
            setActive(wrapper, event.key === "ArrowDown" ? active + 1 : active - 1);
        }
    });
    document.addEventListener("click", event => {
        if (!wrapper.contains(event.target)) close(wrapper);
    });
    updateDisplay(wrapper);
}

export function initSelectInputs(root = document) {
    root.querySelectorAll?.("[data-bf-select]").forEach(initialize);
}