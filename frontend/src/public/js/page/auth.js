import { hideLoading, showLoading } from "../components/feedback.js";
import { apiRequest } from "../common/api.js";

function otpParts(form) {
    const wrapper = form.querySelector("[data-bf-otp]");
    return {
        wrapper,
        inputs: [...(wrapper?.querySelectorAll(".bf-otp-digit-field input") || [])],
        value: wrapper?.querySelector("[data-bf-otp-value]"),
        error: wrapper?.querySelector("[data-otp-error]")
    };
}

function isOtpComplete(form) {
    const { inputs } = otpParts(form);
    return inputs.length === 6 && inputs.every(input => /^\d$/.test(input.value));
}
function syncOtpValue(form) {
    const { inputs, value } = otpParts(form);
    if (value) value.value = inputs.map(input => input.value.replace(/\D/g, "").slice(0, 1)).join("");
}

function setOtpError(form, visible) {
    const { wrapper, inputs, error } = otpParts(form);
    if (!wrapper) return;
    if (error) error.hidden = !visible;
    wrapper.classList.toggle("is-invalid", visible);
    inputs.forEach(input => input.classList.toggle("is-invalid", visible && !/^\d$/.test(input.value)));
    if (visible) inputs.find(input => !/^\d$/.test(input.value))?.focus();
}

function initializeOtpInputs(form) {
    const { wrapper, inputs, value } = otpParts(form);
    if (!wrapper || wrapper.dataset.formInitialized === "true") return;
    wrapper.dataset.formInitialized = "true";
    const initial = typeof value?.value === "string" && /^\d{6}$/.test(value.value) ? value.value : "";
    inputs.forEach((input, index) => {
        input.inputMode = "numeric";
        input.autocomplete = index === 0 ? "one-time-code" : "off";
        input.maxLength = 1;
        input.addEventListener("input", () => {
            const digits = input.value.replace(/\D/g, "");
            if (digits.length > 1) {
                [...digits].slice(0, inputs.length - index).forEach((digit, offset) => { inputs[index + offset].value = digit; });
            } else {
                input.value = digits.slice(0, 1);
            }
            syncOtpValue(form);
            if (isOtpComplete(form)) setOtpError(form, false);
            const nextIndex = Math.min(index + Math.max(digits.length, 1), inputs.length - 1);
            if (input.value && index < inputs.length - 1) inputs[nextIndex].focus();
        });
        input.addEventListener("keydown", event => {
            if (event.key === "Backspace" && !input.value && inputs[index - 1]) inputs[index - 1].focus();
            if (event.key === "ArrowLeft" && inputs[index - 1]) { event.preventDefault(); inputs[index - 1].focus(); }
            if (event.key === "ArrowRight" && inputs[index + 1]) { event.preventDefault(); inputs[index + 1].focus(); }
        });
        input.addEventListener("paste", event => {
            const pasted = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, inputs.length);
            if (!pasted) return;
            event.preventDefault();
            [...pasted].forEach((digit, digitIndex) => { inputs[digitIndex].value = digit; });
            syncOtpValue(form);
            if (isOtpComplete(form)) setOtpError(form, false);
            inputs[Math.min(pasted.length, inputs.length) - 1]?.focus();
        });
        input.addEventListener("change", () => syncOtpValue(form));
        if (initial) input.value = initial[index];
    });
    syncOtpValue(form);
}

function fieldMessage(input) {
    const label = input.closest("[data-form-field]")?.querySelector(".bf-form-label")?.textContent.replace("*", "").trim() || "trường này";
    if (input.validity.valueMissing) return input.type === "checkbox" ? "Vui lòng đồng ý để tiếp tục." : `Vui lòng nhập ${label.toLowerCase()}.`;
        if (["password", "newPassword"].includes(input.name) && (input.validity.tooShort || input.validity.patternMismatch)) return "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
    if (input.validity.typeMismatch) return input.type === "email" ? "Vui lòng nhập địa chỉ email hợp lệ." : "Giá trị nhập chưa đúng định dạng.";
    if (input.validity.tooShort) return `Thông tin cần có ít nhất ${input.minLength} ký tự.`;
    if (input.validity.patternMismatch) return "Thông tin nhập chưa đúng định dạng.";
    return input.validationMessage || "Thông tin nhập chưa hợp lệ.";
}

function inlineErrorFor(input) {
    const field = input.closest("[data-form-field]");
    if (!field) return null;
    let error = field.querySelector("[data-auth-field-error], .bf-email-error, .bf-phone-error");
    if (!error) {
        error = document.createElement("div");
        error.className = "bf-form-error bf-auth-field-error";
        error.dataset.authFieldError = "";
        const anchor = input.closest(".bf-input-with-action, .bf-input-icon-wrap, .bf-phone-control") || input;
        anchor.insertAdjacentElement("afterend", error);
    }
    return error;
}

function setFieldError(input, message, visible) {
    const field = input.closest("[data-form-field]");
    if (input.type === "checkbox") {
        const check = input.closest(".bf-check");
        check?.classList.toggle("is-invalid", visible);
        let error = check?.parentElement?.querySelector("[data-auth-checkbox-error]");
        if (visible && check && !error) {
            error = document.createElement("div");
            error.className = "bf-form-error bf-auth-field-error";
            error.dataset.authCheckboxError = "";
            check.insertAdjacentElement("afterend", error);
        }
        if (error) { error.textContent = message; error.hidden = !visible; }
        return;
    }
    input.classList.toggle("is-invalid", visible);
    field?.classList.toggle("has-auth-error", visible);
    const error = inlineErrorFor(input);
    if (error) { error.textContent = message; error.hidden = !visible; }
}

function initializeResetPasswordStep(form) {
    const otpStep = form.querySelector("[data-auth-reset-otp-step]");
    const passwordStep = form.querySelector("[data-auth-reset-password-step]");
    const next = form.querySelector("[data-otp-continue]");
    if (!otpStep || !passwordStep || !next) return;
    const passwordInputs = [...passwordStep.querySelectorAll("input")];
    const passwordStepActive = !passwordStep.hidden;
    passwordInputs.forEach(input => { input.disabled = !passwordStepActive; });
    if (passwordStepActive) { otpStep.hidden = true; return; }
    next.addEventListener("click", () => {
        if (!isOtpComplete(form)) { setOtpError(form, true); return; }
        setOtpError(form, false);
        otpStep.hidden = true;
        passwordStep.hidden = false;
        passwordInputs.forEach(input => { input.disabled = false; });
        passwordInputs[0]?.focus();
    });
}

function initializeCodeCountdown() {
    const resendForms = [...document.querySelectorAll("[data-auth-resend-button]")];
    if (!resendForms.length) return;
    const params = new URLSearchParams(window.location.search);
    const justSent = document.body.dataset.authCodeSent === "true" || params.get("sent") === "1";
    const email = document.querySelector('input[name="email"]')?.value || params.get("email") || "";
    const storageKey = `bookflow:auth-code-expiry:${window.location.pathname}:${email.toLowerCase()}`;
    let expiresAt = Number(localStorage.getItem(storageKey) || 0);
    if (justSent) {
        expiresAt = Date.now() + 60000;
        localStorage.setItem(storageKey, String(expiresAt));
        if (params.has("sent")) {
            params.delete("sent");
            const query = params.toString();
            window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
        }
    }
    resendForms.forEach(button => {
        const label = button.querySelector("[data-auth-resend-label]");
        const countdown = button.querySelector("[data-auth-countdown]");
        const form = button.closest("form");
        if (!label || !countdown || !form) return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            button.disabled = remaining > 0;
            label.textContent = remaining > 0 ? "Gửi lại mã sau" : "Gửi lại mã";
            countdown.hidden = remaining <= 0;
            countdown.textContent = remaining > 0 ? `${remaining}s` : "";
            if (!remaining) localStorage.removeItem(storageKey);
        };
        tick();
        if (expiresAt > Date.now()) {
            const timer = window.setInterval(() => {
                tick();
                if (Date.now() >= expiresAt) window.clearInterval(timer);
            }, 250);
        }
    });
}
function initializeApiOtpSubmit(form) {
    form.addEventListener("submit", async event => {
        if (!form.dataset.apiEndpoint) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        syncOtpValue(form);
        if (!isOtpComplete(form)) {
            setOtpError(form, true);
            return;
        }
        const button = form.querySelector("[data-auth-submit]");
        const errorElement = otpParts(form).error;
        if (button) button.disabled = true;
        try {
            const body = Object.fromEntries(new FormData(form).entries());
            await apiRequest(form.dataset.apiEndpoint, { method: "POST", body });
            window.location.assign(form.dataset.apiSuccessUrl || "/auth/dang-nhap");
        } catch (error) {
            if (errorElement) {
                errorElement.textContent = error.message;
                errorElement.hidden = false;
            }
            setOtpError(form, true);
            if (error.requestId) console.error("BookFlow API requestId:", error.requestId);
        } finally {
            if (button) button.disabled = false;
        }
    }, { capture: true });
}
function initializeAuthForm(form) {
    if (form.dataset.formInitialized === "true") return;
    form.dataset.formInitialized = "true";
    form.noValidate = true;
    const isLogin = form.action.includes("/auth/dang-nhap");
    const formAlert = isLogin ? form.closest(".bf-auth-card")?.querySelector(".bf-auth-login-alert") : null;
    const formAlertMessage = formAlert?.querySelector(".bf-alert-message");
    const password = form.querySelector('[name="password"], [name="newPassword"]');
    const confirmation = form.querySelector('[name="passwordConfirm"], [name="confirmNewPassword"]');
    const passwordError = form.querySelector("[data-password-error]");
    const submit = form.querySelector("[data-auth-submit]");
    initializeOtpInputs(form);
    initializeApiOtpSubmit(form);
    initializeResetPasswordStep(form);
    const validatePasswords = () => {
        if (!password || !confirmation) return true;
        const mismatch = Boolean(confirmation.value && password.value !== confirmation.value);
        confirmation.setCustomValidity(mismatch ? "Mật khẩu xác nhận chưa khớp." : "");
        if (passwordError) { passwordError.textContent = "Mật khẩu xác nhận chưa khớp."; passwordError.hidden = !mismatch; }
        if (confirmation.value) {
            const field = confirmation.closest("[data-form-field]");
            const requiredError = field?.querySelector("[data-auth-field-error]");
            if (requiredError) { requiredError.textContent = ""; requiredError.hidden = true; }
            confirmation.classList.toggle("is-invalid", mismatch);
            field?.classList.toggle("has-auth-error", mismatch);
        }
        return !mismatch;
    };
    if (password && confirmation) {
        password.addEventListener("input", validatePasswords);
        confirmation.addEventListener("input", validatePasswords);
    }
    form.addEventListener("input", event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) return;
        if (input.closest("[data-bf-otp]")) return;
        if (input.type === "checkbox") {
            if (input.checked) setFieldError(input, "", false);
        } else if (input.checkValidity()) {
            setFieldError(input, "", false);
        }
        if (isLogin && formAlert && [...form.querySelectorAll("input:not([type=hidden])")].every(field => field.disabled || field.checkValidity())) formAlert.hidden = true;
    });
    form.addEventListener("submit", event => {
        syncOtpValue(form);
        validatePasswords();
        const { inputs: otpInputs } = otpParts(form);
        const otpInvalid = otpInputs.length > 0 && !isOtpComplete(form);
        const controls = [...form.querySelectorAll("input:not([type=hidden]), select, textarea")].filter(input => !input.disabled && !otpInputs.includes(input));
        const invalid = controls.filter(input => !input.checkValidity());
        if (isLogin && (invalid.length || otpInvalid)) {
            event.preventDefault();
            const first = invalid[0];
            if (formAlert && formAlertMessage) {
                formAlertMessage.textContent = first ? fieldMessage(first) : "Vui lòng nhập mã xác nhận đầy đủ.";
                formAlert.hidden = false;
            }
            first?.focus();
            return;
        }
        if (!isLogin && (invalid.length || otpInvalid)) {
            event.preventDefault();
            invalid.forEach(input => {
                if (confirmation === input && passwordError && confirmation.value) {
                    passwordError.hidden = false;
                    input.classList.add("is-invalid");
                    return;
                }
                setFieldError(input, fieldMessage(input), true);
            });
            if (otpInvalid) setOtpError(form, true);
            (invalid[0] || otpParts(form).inputs.find(input => !/^\d$/.test(input.value)))?.focus();
            return;
        }
        if (formAlert) formAlert.hidden = true;
        if (submit) submit.disabled = true;
        showLoading(document.body, { fullscreen: true, text: form.dataset.authLoadingText || "Đang xử lý..." });
    });
}

export function initAuthForms(root = document) {
    if (root.matches?.("[data-bf-auth-form]")) initializeAuthForm(root);
    root.querySelectorAll?.("[data-bf-auth-form]").forEach(initializeAuthForm);
}
window.addEventListener("pageshow", () => hideLoading(document.body));
initAuthForms();
initializeCodeCountdown();
