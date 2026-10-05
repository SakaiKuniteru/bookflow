(() => {
    const tokenElement = document.querySelector('meta[name="bf-access-token"]');
    let accessToken = tokenElement?.content || '';
    tokenElement?.remove();
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('bookflow-access-token') : null;
    channel?.addEventListener('message', event => {
        if (typeof event.data?.token === 'string') accessToken = event.data.token;
    });
    const capNhatToken = token => {
        accessToken = typeof token === 'string' ? token : '';
        channel?.postMessage({ token: accessToken });
    };
    window.BookFlowAuth = { setAccessToken: capNhatToken, clearAccessToken: () => capNhatToken('') };
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const options = init || {};
        const requestUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
        let url;
        try { url = new URL(requestUrl, window.location.href); } catch { return nativeFetch(input, options); }
        if (url.origin !== window.location.origin || !/^\/api(?:\/|$)/.test(url.pathname) || !accessToken) return nativeFetch(input, options);
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(options.headers || {}).forEach((value, name) => headers.set(name, value));
        headers.set('Authorization', `Bearer ${accessToken}`);
        return nativeFetch(input, { ...options, headers }).then(response => {
            const tokenMoi = response.headers.get('X-BookFlow-Access-Token');
            if (tokenMoi) capNhatToken(tokenMoi);
            return response;
        });
    };
})();