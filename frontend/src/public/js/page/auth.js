function initializeAuthForm(form) {
    if (form.dataset.formInitialized === "true") return;
    form.dataset.formInitialized = "true";
    const password = form.querySelector('[name="password"], [name="newPassword"]');
    const confirmation = form.querySelector('[name="passwordConfirm"], [name="confirmNewPassword"]');
    const error = form.querySelector("[data-password-error]");
    const submit = form.querySelector("[data-auth-submit]");
    const loading = form.querySelector(".bf-auth-loading");
    const otp = form.querySelector('[name="otp"]');
    const validatePasswords = () => {
        if (!password || !confirmation) return true;
        const valid = password.value === confirmation.value;
        confirmation.setCustomValidity(valid ? "" : "Mật khẩu xác nhận chưa khớp.");
        if (error) error.hidden = valid || !confirmation.value;
        return valid;
    };
    if (password && confirmation) {
        password.addEventListener("input", validatePasswords);
        confirmation.addEventListener("input", validatePasswords);
    }
    if (otp) otp.addEventListener("input", () => { otp.value = otp.value.replace(/\D/g, "").slice(0, 6); });
    form.addEventListener("submit", event => {
        if (!validatePasswords()) {
            event.preventDefault();
            confirmation.reportValidity();
            return;
        }
        if (submit) submit.disabled = true;
        if (loading) loading.hidden = false;
    });
}
export function initAuthForms(root = document) {
    if (root.matches?.("[data-bf-auth-form]")) initializeAuthForm(root);
    root.querySelectorAll?.("[data-bf-auth-form]").forEach(initializeAuthForm);
}
initAuthForms();
