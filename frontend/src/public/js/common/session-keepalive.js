(() => {
  const idleMs = 60 * 60 * 1000;
  const refreshMs = 15 * 60 * 1000;
  const activityKey = 'bookflow:last-activity';
  const refreshKey = 'bookflow:last-refresh';
  const authEventKey = 'bookflow:auth-event';
  const authEventName = 'bookflow_auth_event';
  const stamp = key => Number(localStorage.getItem(key) || 0);
  const authEvent = () => document.cookie.split('; ').find(value => value.startsWith(`${authEventName}=`))?.split('=').slice(1).join('=') || '';
  let seenAuthEvent = authEvent();
  if (localStorage.getItem(authEventKey) !== seenAuthEvent) {
    localStorage.setItem(authEventKey, seenAuthEvent);
    localStorage.setItem(activityKey, String(Date.now()));
  }
  let heartbeatTimer = null;
  let lastHeartbeat = 0;
  let endingSession = false;
  const endSession = async () => {
    if (endingSession || Date.now() - stamp(activityKey) < idleMs) return;
    endingSession = true;
    try {
      await fetch('/auth/dang-xuat', { method: 'POST', credentials: 'same-origin' });
    } finally {
      location.assign('/auth/dang-nhap?expired=idle');
    }
  };
  const refreshIfNeeded = async (force = false) => {
    const refresh = async () => {
      if (!force && Date.now() - stamp(refreshKey) < refreshMs) return true;
      const response = await fetch('/auth/lam-moi-phien', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (response.status === 401) return false;
      if (!response.ok) return false;
      const payload = await response.json().catch(() => null);
      if (!payload?.accessToken) return false;
      window.BookFlowAuth?.setAccessToken(payload.accessToken);
      localStorage.setItem(refreshKey, String(Date.now()));
      return true;
    };
    if (navigator.locks?.request) return navigator.locks.request('bookflow-auth-refresh', refresh);
    return refresh();
  };
  const sendHeartbeat = async () => {
    let response = await fetch('/api/xac-thuc/hoat-dong', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (response.status !== 401) return;
    if (!await refreshIfNeeded(true)) return;
    response = await fetch('/api/xac-thuc/hoat-dong', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } });
  };
  const recordActivity = () => {
    const now = Date.now();
    const lastActivity = stamp(activityKey);
    if (lastActivity && now - lastActivity >= idleMs) {
      void endSession();
      return;
    }
    localStorage.setItem(activityKey, String(now));
    if (heartbeatTimer) return;
    heartbeatTimer = setTimeout(async () => {
      heartbeatTimer = null;
      lastHeartbeat = Date.now();
      try {
        await sendHeartbeat();
      } catch {}
    }, Math.max(0, 15000 - (now - lastHeartbeat)));
  };
  const checkSession = async () => {
    const currentAuthEvent = authEvent();
    if (currentAuthEvent !== seenAuthEvent) {
      seenAuthEvent = currentAuthEvent;
      localStorage.setItem(authEventKey, currentAuthEvent);
      localStorage.setItem(activityKey, String(Date.now()));
      location.reload();
      return;
    }
    if (Date.now() - stamp(activityKey) >= idleMs) {
      await endSession();
      return;
    }
    await refreshIfNeeded();
  };
  recordActivity();
  ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel', 'click', 'input', 'change', 'submit'].forEach(eventName => window.addEventListener(eventName, recordActivity, { passive: true }));
  window.addEventListener('focus', recordActivity);
  setInterval(() => { void checkSession(); }, 15000);
  void checkSession();
})();