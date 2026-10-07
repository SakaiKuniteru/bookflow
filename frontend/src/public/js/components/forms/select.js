function getOptions(wrapper) {
    return [...wrapper.querySelectorAll(".bf-select-option")];
}

function getVisibleOptions(wrapper) {
    return getOptions(wrapper).filter(option => !option.disabled && !option.hidden);
}

function getSelected(wrapper) {
    return getOptions(wrapper).filter(option => option.classList.contains("is-selected"));
}

function isMultiple(wrapper) {
    return wrapper.dataset.multiple === "true";
}

function hasSearch(wrapper) {
    return wrapper.dataset.search === "true";
}

function hasCheckbox(wrapper) {
    return wrapper.dataset.checkbox === "true";
}

function updateHiddenValues(wrapper) {
    const container = wrapper.querySelector(".bf-select-hidden-values");
    const name = wrapper.dataset.name;
    if (!container || !name) return;
    container.replaceChildren();
    getSelected(wrapper).forEach(option => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = isMultiple(wrapper) ? `${name}[]` : name;
        input.value = option.dataset.value ?? "";
        container.appendChild(input);
    });
}

function updateControlState(wrapper) {
    const value = wrapper.querySelector(".bf-select-value");
    const clear = wrapper.querySelector(".bf-select-clear");
    const chevron = wrapper.querySelector(".bf-select-chevron");
    const search = wrapper.querySelector(".bf-select-search-input");
    const selected = getSelected(wrapper);
    if (!value) return;
    value.replaceChildren();
    if (isMultiple(wrapper)) {
        selected.forEach(option => {
            const chip = document.createElement("span");
            chip.className = "bf-select-chip";
            const label = document.createElement("span");
            label.className = "bf-select-chip-label";
            label.textContent = option.dataset.label ?? "";
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "bf-select-chip-remove";
            remove.dataset.removeValue = option.dataset.value ?? "";
            remove.setAttribute("aria-label", `Bỏ lựa chọn ${option.dataset.label ?? ""}`);
            remove.textContent = "×";
            chip.append(label, remove);
            value.appendChild(chip);
        });
    } else if (selected.length && !hasSearch(wrapper)) {
        value.textContent = selected[0].dataset.label ?? "";
    } else if (!selected.length && !hasSearch(wrapper)) {
        value.textContent = wrapper.dataset.placeholder || "Chọn...";
    }
    wrapper.classList.toggle("has-value", selected.length > 0);
    if (clear) clear.hidden = selected.length === 0;
    if (chevron) chevron.hidden = selected.length > 0;
    if (search && !wrapper.classList.contains("is-open")) {
        search.value = !isMultiple(wrapper) && selected.length ? selected[0].dataset.label ?? "" : "";
    }
}

function updateOptions(wrapper) {
    getOptions(wrapper).forEach(option => {
        const selected = option.classList.contains("is-selected");
        option.setAttribute("aria-selected", String(selected));
        const checkbox = option.querySelector(".bf-select-option-checkbox");
        if (checkbox) {
            checkbox.setAttribute("aria-checked", String(selected));
            checkbox.classList.toggle("is-checked", selected);
        }
    });
}

function updateDisplay(wrapper) {
    updateControlState(wrapper);
    updateOptions(wrapper);
    updateHiddenValues(wrapper);
}
export function syncSelect(wrapper) {
    if (!wrapper?.matches?.("[data-bf-select]")) return;
    updateDisplay(wrapper);
}
export function setSelectDisabled(wrapper, disabled) {
    if (!wrapper?.matches?.("[data-bf-select]")) return;
    wrapper.dataset.disabled = String(disabled);
    wrapper.classList.toggle("is-disabled", disabled);
    const control = wrapper.querySelector(".bf-select-control");
    control?.setAttribute("aria-disabled", String(disabled));
    if (control) control.tabIndex = disabled ? -1 : 0;
    if (disabled) close(wrapper);
}
function setActive(wrapper, index) {
    const options = getVisibleOptions(wrapper);
    if (!options.length) return;
    const nextIndex = Math.max(0, Math.min(index, options.length - 1));
    getOptions(wrapper).forEach(option => option.classList.remove("is-active"));
    options[nextIndex].classList.add("is-active");
    options[nextIndex].scrollIntoView({ block: "nearest" });
}

function getActiveIndex(wrapper) {
    return getVisibleOptions(wrapper).findIndex(option => option.classList.contains("is-active"));
}

function open(wrapper, focusSearch = false) {
    if (wrapper.dataset.disabled === "true") return;
    wrapper.classList.add("is-open");
    wrapper.querySelector(".bf-select-control")?.setAttribute("aria-expanded", "true");
    setActive(wrapper, 0);
    if (focusSearch && hasSearch(wrapper)) {
        const search = wrapper.querySelector(".bf-select-search-input");
        if (search) {
            search.value = "";
            filterOptions(wrapper, "");
            search.focus();
        }
    }
}

function close(wrapper, restoreSearch = true) {
    wrapper.classList.remove("is-open");
    wrapper.querySelector(".bf-select-control")?.setAttribute("aria-expanded", "false");
    if (hasSearch(wrapper)) {
        const search = wrapper.querySelector(".bf-select-search-input");
        if (search && restoreSearch) {
            search.value = !isMultiple(wrapper) && getSelected(wrapper).length ? getSelected(wrapper)[0].dataset.label ?? "" : "";
        }
        filterOptions(wrapper, "");
    }
}

function filterOptions(wrapper, query) {
    const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase();
    let visible = 0;
    getOptions(wrapper).forEach(option => {
        const label = String(option.dataset.label ?? "").toLocaleLowerCase();
        option.hidden = !label.includes(normalizedQuery);
        if (!option.hidden) visible++;
    });
    const empty = wrapper.querySelector(".bf-select-empty");
    if (empty) empty.hidden = visible > 0;
    getOptions(wrapper).forEach(option => option.classList.remove("is-active"));
    if (visible) setActive(wrapper, 0);
}

function clearSelection(wrapper) {
    getOptions(wrapper).forEach(option => option.classList.remove("is-selected"));
    updateDisplay(wrapper);
}

function toggleOption(wrapper, option) {
    if (!option || option.disabled || wrapper.dataset.disabled === "true") return;
    if (isMultiple(wrapper)) {
        option.classList.toggle("is-selected");
    } else {
        getOptions(wrapper).forEach(item => item.classList.remove("is-selected"));
        option.classList.add("is-selected");
    }
    updateDisplay(wrapper);
    if (isMultiple(wrapper)) {
        wrapper.querySelector(".bf-select-search-input")?.focus();
    } else {
        close(wrapper);
    }
    wrapper.dispatchEvent(new Event("change", { bubbles: true }));
}

function moveActive(wrapper, direction) {
    const options = getVisibleOptions(wrapper);
    if (!options.length) return;
    const active = getActiveIndex(wrapper);
    setActive(wrapper, active < 0 ? 0 : active + direction);
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    const control = wrapper.querySelector(".bf-select-control");
    const optionsBox = wrapper.querySelector(".bf-select-options");
    const search = wrapper.querySelector(".bf-select-search-input");
    const clear = wrapper.querySelector(".bf-select-clear");
    if (!control || !optionsBox) return;
    wrapper.dataset.formInitialized = "true";
    control.addEventListener("click", event => {
        if (wrapper.dataset.disabled === "true") { event.preventDefault(); return; }
        const chipRemove = event.target.closest("[data-remove-value]");
        if (chipRemove) {
            event.preventDefault();
            event.stopPropagation();
            const option = getOptions(wrapper).find(item => item.dataset.value === chipRemove.dataset.removeValue);
            option?.classList.remove("is-selected");
            updateDisplay(wrapper);
            wrapper.dispatchEvent(new Event("change", { bubbles: true }));
            return;
        }
        if (event.target.closest(".bf-select-clear")) return;
        if (event.target.closest(".bf-select-search-input")) {
            if (!wrapper.classList.contains("is-open")) open(wrapper);
            return;
        }
        if (wrapper.classList.contains("is-open")) close(wrapper);
        else open(wrapper, hasSearch(wrapper));
    });
    control.addEventListener("keydown", event => {
        if (wrapper.dataset.disabled === "true") { event.preventDefault(); return; }
        if (hasSearch(wrapper)) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!wrapper.classList.contains("is-open")) open(wrapper);
            else moveActive(wrapper, event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!wrapper.classList.contains("is-open")) open(wrapper);
            else toggleOption(wrapper, wrapper.querySelector(".bf-select-option.is-active"));
        } else if (event.key === "Escape") {
            close(wrapper);
        } else if (event.key === "Home" && wrapper.classList.contains("is-open")) {
            event.preventDefault();
            setActive(wrapper, 0);
        } else if (event.key === "End" && wrapper.classList.contains("is-open")) {
            event.preventDefault();
            setActive(wrapper, getVisibleOptions(wrapper).length - 1);
        }
    });
    optionsBox.addEventListener("click", event => {
        const option = event.target.closest(".bf-select-option");
        if (option) toggleOption(wrapper, option);
    });
    search?.addEventListener("focus", () => {
        if (!wrapper.classList.contains("is-open")) open(wrapper);
    });
    search?.addEventListener("input", () => filterOptions(wrapper, search.value));
    search?.addEventListener("keydown", event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!wrapper.classList.contains("is-open")) open(wrapper);
            else moveActive(wrapper, event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            toggleOption(wrapper, wrapper.querySelector(".bf-select-option.is-active"));
        } else if (event.key === "Escape") {
            event.preventDefault();
            close(wrapper);
            control.focus();
        }
    });
    clear?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        clearSelection(wrapper);
        if (hasSearch(wrapper) && wrapper.classList.contains("is-open")) search?.focus();
        wrapper.dispatchEvent(new Event("change", { bubbles: true }));
    });
    document.addEventListener("click", event => {
        if (!wrapper.contains(event.target)) close(wrapper);
    });
    updateDisplay(wrapper);
    setSelectDisabled(wrapper, wrapper.dataset.disabled === "true");
}

export function initSelectInputs(root = document) {
    root.querySelectorAll?.("[data-bf-select]").forEach(initialize);
}