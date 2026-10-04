(() => {
  const key = 'bookflow.pendingLoginCredentials';
  const lifetime = 60 * 60 * 1000;
  let storage;
  try {
    storage = window.sessionStorage;
  } catch {
    return;
  }
  const clearDraft = () => {
    try {
      storage.removeItem(key);
    } catch {}
  };
  const readDraft = () => {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };
  const page = document.body?.dataset?.authPage || '';
  const loginForm = document.querySelector('form[action="/auth/dang-nhap"]');
  const isWorkspace = /^\/(customer|staff|admin|super-admin)(\/|$)/.test(window.location.pathname);
  if (isWorkspace) {
    clearDraft();
    return;
  }
  if (!loginForm) {
    if (page !== 'thiet-lap-phien') clearDraft();
    return;
  }
  if (document.body.dataset.loginFailed === 'true') clearDraft();
  else if (new URLSearchParams(window.location.search).get('doi-giao-dien') === '1') {
    const draft = readDraft();
    if (draft && Date.now() - draft.createdAt < lifetime) {
      const email = loginForm.querySelector('[name="email"]');
      const password = loginForm.querySelector('[name="password"]');
      if (email && draft.email) email.value = draft.email;
      if (password && draft.password) password.value = draft.password;
    }
    clearDraft();
  } else clearDraft();
  loginForm.addEventListener('submit', () => {
    const email = loginForm.querySelector('[name="email"]')?.value || '';
    const password = loginForm.querySelector('[name="password"]')?.value || '';
    if (email && password) {
      try {
        storage.setItem(key, JSON.stringify({ email, password, createdAt: Date.now() }));
      } catch {}
    }
  });
})();