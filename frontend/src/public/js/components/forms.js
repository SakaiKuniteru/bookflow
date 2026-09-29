import { initNumberInputs } from "./forms/number.js";
import { initEmailInputs } from "./forms/email.js";
import { initPasswordInputs } from "./forms/password.js";
import { initDateInputs } from "./forms/date.js";
import { initSelectInputs } from "./forms/select.js";
import { initFileInputs } from "./forms/file.js";
import { initImageInputs } from "./forms/image.js";
import { initRichTextInputs } from "./forms/rich-text.js";
import { initSearchInputs } from "./forms/search.js";
import { initPhoneInputs } from "./forms/phone.js";

const initializers = [
    initNumberInputs,
    initEmailInputs,
    initPasswordInputs,
    initDateInputs,
    initSelectInputs,
    initFileInputs,
    initImageInputs,
    initRichTextInputs,
    initSearchInputs,
    initPhoneInputs
];

function initForms(root = document) {
    initializers.forEach(initializer => initializer(root));
}

function observeForms() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                initForms(node);
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function boot() {
    initForms(document);
    observeForms();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}

window.BookFlowForms = {
    init: initForms
};