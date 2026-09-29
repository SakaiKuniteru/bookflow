function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    const editor = wrapper.querySelector(".bf-rich-editor");
    const hidden = wrapper.querySelector(".bf-rich-hidden");
    if (!editor || !hidden) return;
    wrapper.dataset.formInitialized = "true";
    editor.innerHTML = editor.dataset.initialValue || "";
    let savedRange = null;
    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection?.rangeCount && editor.contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
    };
    const restoreSelection = () => {
        editor.focus();
        if (!savedRange) return;
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange);
    };
    const sync = () => {
        hidden.value = editor.innerHTML;
        hidden.dispatchEvent(new Event("input", { bubbles: true }));
        hidden.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const runCommand = (command, value = null) => {
        restoreSelection();
        document.execCommand(command, false, value);
        saveSelection();
        sync();
    };
    const applyFontSize = value => {
        const size = Number(String(value).trim().replace(",", "."));
        if (!Number.isFinite(size) || size < 1 || size > 200) return;
        restoreSelection();
        const selection = window.getSelection();
        if (!selection?.rangeCount || selection.isCollapsed) return;
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.style.fontSize = `${size}px`;
        try {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            selection.removeAllRanges();
            const nextRange = document.createRange();
            nextRange.selectNodeContents(span);
            selection.addRange(nextRange);
            savedRange = nextRange.cloneRange();
        } catch {
            document.execCommand("fontSize", false, "7");
            editor.querySelectorAll('font[size="7"]').forEach(font => {
                font.removeAttribute("size");
                font.style.fontSize = `${size}px`;
            });
        }
        sync();
    };
    const insertHtml = html => {
        restoreSelection();
        document.execCommand("insertHTML", false, html);
        saveSelection();
        sync();
    };
    const insertLink = () => {
        const url = window.prompt("Nhập URL liên kết:");
        if (!url) return;
        restoreSelection();
        if (window.getSelection()?.isCollapsed) {
            const label = window.prompt("Nhập nội dung liên kết:", url);
            if (!label) return;
            insertHtml(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
            return;
        }
        document.execCommand("createLink", false, url);
        editor.querySelectorAll("a").forEach(link => {
            if (link.getAttribute("href") === url) {
                link.setAttribute("target", "_blank");
                link.setAttribute("rel", "noopener noreferrer");
            }
        });
        sync();
    };
    const insertImage = url => {
        const imageUrl = url || window.prompt("Nhập URL ảnh:");
        if (!imageUrl) return;
        const alt = window.prompt("Mô tả ảnh:", "") || "";
        insertHtml(`<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" loading="lazy">`);
    };
    const insertTable = () => {
        const rows = Math.min(20, Math.max(1, Number(window.prompt("Số hàng:", "3")) || 0));
        const columns = Math.min(12, Math.max(1, Number(window.prompt("Số cột:", "3")) || 0));
        if (!rows || !columns) return;
        const body = Array.from({ length: rows }, () => `<tr>${Array.from({ length: columns }, () => "<td><br></td>").join("")}</tr>`).join("");
        insertHtml(`<table class="bf-rich-table"><tbody>${body}</tbody></table><p><br></p>`);
    };
    const insertCode = () => {
        const language = wrapper.querySelector(".bf-rich-language")?.value || "plaintext";
        const selection = window.getSelection();
        const code = selection?.toString() || "";
        insertHtml(`<pre class="bf-rich-code"><code class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre><p><br></p>`);
    };
    const highlightCode = block => {
        const code = block.querySelector("code");
        if (!code || code.dataset.highlighted === "true") return;
        const language = code.className.match(/language-([\w-]+)/)?.[1] || "plaintext";
        let text = escapeHtml(code.textContent);
        if (["javascript", "js", "typescript", "ts", "python", "py"].includes(language)) {
            text = text.replace(/(\/\/.*|#.*)$/gm, '<span class="bf-code-comment">$1</span>');
            text = text.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '<span class="bf-code-string">$&</span>');
            text = text.replace(/\b(const|let|var|function|return|if|else|for|while|class|new|import|from|export|default|async|await|def|print|True|False|None)\b/g, '<span class="bf-code-keyword">$1</span>');
            text = text.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="bf-code-number">$1</span>');
        } else if (["html", "xml"].includes(language)) {
            text = text.replace(/(&lt;\/?[\w-]+|&gt;)/g, '<span class="bf-code-tag">$1</span>');
            text = text.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="bf-code-string">$1</span>');
        }
        code.innerHTML = text;
        code.dataset.highlighted = "true";
    };
    wrapper.querySelectorAll("[data-command]").forEach(control => {
        if (control.tagName === "BUTTON") control.addEventListener("mousedown", event => event.preventDefault());
        control.addEventListener("click", () => {
            const command = control.dataset.command;
            if (command === "createLink") return insertLink();
            if (command === "insertImage") return insertImage();
            if (command === "insertTable") return insertTable();
            if (command === "insertCode") return insertCode();
            if (command === "removeFormat") return runCommand("removeFormat");
            if (command === "strikeThrough") return runCommand("strikeThrough");
            if (command === "fontSizeCustom") return applyFontSize(wrapper.querySelector(".bf-rich-font-size")?.value || "");
            if (command === "listStyle") {
                runCommand(control.value === "decimal" || control.value === "lower-alpha" || control.value === "upper-roman" || control.value === "lower-roman" ? "insertOrderedList" : "insertUnorderedList");
                const list = window.getSelection()?.anchorNode?.parentElement?.closest("ol, ul");
                if (list) list.style.listStyleType = control.value;
                sync();
                return;
            }
            if (command === "tableVertical") {
                const cell = window.getSelection()?.anchorNode?.parentElement?.closest("td, th");
                const table = window.getSelection()?.anchorNode?.parentElement?.closest("table");
                (cell || table)?.style.setProperty("vertical-align", control.value);
                if (table) table.querySelectorAll("td, th").forEach(item => item.style.verticalAlign = control.value);
                sync();
                return;
            }
            if (command === "tableAlign") {
                const table = window.getSelection()?.anchorNode?.parentElement?.closest("table");
                if (table) {
                    table.style.marginLeft = control.value === "left" ? "0" : "auto";
                    table.style.marginRight = control.value === "right" ? "0" : "auto";
                    if (control.value === "center") table.style.marginLeft = table.style.marginRight = "auto";
                }
                sync();
                return;
            }
            if (control.type === "color") {
                runCommand(command, control.value);
                return;
            }
            if (control.tagName === "SELECT") {
                runCommand(command, control.value);
                return;
            }
            runCommand(command);
        });
        if (control.tagName === "SELECT" || control.type === "color") control.addEventListener("change", () => control.click());
    });
    wrapper.querySelector(".bf-rich-font-size")?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            applyFontSize(event.currentTarget.value);
        }
    });
    editor.addEventListener("keyup", saveSelection);
    editor.addEventListener("mouseup", saveSelection);
    editor.addEventListener("input", () => {
        editor.querySelectorAll("pre.bf-rich-code").forEach(block => block.querySelector("code")?.removeAttribute("data-highlighted"));
        sync();
    });
    editor.addEventListener("blur", () => {
        editor.querySelectorAll("pre.bf-rich-code").forEach(highlightCode);
        sync();
    });
    editor.addEventListener("paste", event => {
        const items = [...(event.clipboardData?.items || [])];
        const imageItem = items.find(item => item.type.startsWith("image/"));
        if (!imageItem) {
            const codeBlock = window.getSelection()?.anchorNode?.parentElement?.closest("pre.bf-rich-code");
            if (codeBlock) {
                event.preventDefault();
                const text = event.clipboardData?.getData("text/plain") || "";
                document.execCommand("insertText", false, text);
                sync();
            } else {
                setTimeout(sync, 0);
            }
            return;
        }
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => insertHtml(`<img src="${escapeHtml(reader.result)}" alt="" loading="lazy">`);
        reader.readAsDataURL(file);
    });
    editor.addEventListener("keydown", event => {
        const modifier = event.ctrlKey || event.metaKey;
        if (!modifier) return;
        const key = event.key.toLowerCase();
        const commands = { b: "bold", i: "italic", u: "underline", k: "createLink" };
        if (commands[key]) {
            event.preventDefault();
            if (commands[key] === "createLink") insertLink();
            else runCommand(commands[key]);
        } else if (event.shiftKey && key === "x") {
            event.preventDefault();
            runCommand("strikeThrough");
        } else if (event.shiftKey && key === "7") {
            event.preventDefault();
            runCommand("insertOrderedList");
        } else if (event.shiftKey && key === "8") {
            event.preventDefault();
            runCommand("insertUnorderedList");
        }
    });
    sync();
}

export function initRichTextInputs(root = document) {
    root.querySelectorAll?.("[data-bf-rich-text]").forEach(initialize);
}