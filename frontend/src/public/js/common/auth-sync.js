(() => {
  const authEventName = 'bookflow_auth_event';
  const readAuthEvent = () => document.cookie.split('; ').find(value => value.startsWith(`${authEventName}=`))?.slice(authEventName.length + 1) || '';
  let seenAuthEvent = readAuthEvent();
  let reloadQueued = false;
  const checkAuthEvent = () => {
    const currentAuthEvent = readAuthEvent();
    if (!currentAuthEvent || currentAuthEvent === seenAuthEvent || reloadQueued) return;
    seenAuthEvent = currentAuthEvent;
    reloadQueued = true;
    window.location.reload();
  };
  window.addEventListener('focus', checkAuthEvent);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkAuthEvent(); });
  window.setInterval(checkAuthEvent, 1000);
})();