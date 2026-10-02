(() => {
  let lastRefresh = Date.now();
  let refreshing = false;
  const refreshInterval = 5 * 60 * 1000;
  const refresh = async () => {
    if (refreshing || Date.now() - lastRefresh < refreshInterval) return;
    refreshing = true;
    try {
      const response = await fetch('/auth/lam-moi-phien', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (response.status === 401) {
        const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
        location.assign(`/auth/dang-nhap?redirect=${redirect}`);
        return;
      }
      if (response.ok) lastRefresh = Date.now();
    } finally {
      refreshing = false;
    }
  };
  ['pointerdown', 'keydown', 'touchstart', 'scroll', 'input'].forEach(eventName => {
    window.addEventListener(eventName, refresh, { passive: true });
  });
})();