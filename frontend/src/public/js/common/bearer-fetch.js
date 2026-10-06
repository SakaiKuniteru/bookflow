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
    const doiTenTruongCamelCase = ten => ten.replace(/_([a-z0-9])/gi, (_, kyTu) => kyTu.toUpperCase());
    const chuyenCamelCase = value => {
        if (Array.isArray(value)) return value.map(chuyenCamelCase);
        if (value === null || typeof value !== 'object' || value instanceof Date) return value;
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [doiTenTruongCamelCase(key), chuyenCamelCase(item)]));
    };
    const chuyenDuongDanCamelCase = url => {
        const query = new URLSearchParams();
        for (const [key, value] of url.searchParams) query.append(doiTenTruongCamelCase(key), value);
        url.search = query.toString();
        return url;
    };
    const chuyenBodyCamelCase = body => {
        if (typeof body === 'string') {
            try { return JSON.stringify(chuyenCamelCase(JSON.parse(body))); } catch { return body; }
        }
        if (body instanceof FormData) {
            const formData = new FormData();
            for (const [key, value] of body.entries()) formData.append(doiTenTruongCamelCase(key), value);
            return formData;
        }
        if (body instanceof URLSearchParams) {
            const params = new URLSearchParams();
            for (const [key, value] of body) params.append(doiTenTruongCamelCase(key), value);
            return params;
        }
        return body;
    };
    window.BookFlowAuth = { setAccessToken: capNhatToken, clearAccessToken: () => capNhatToken('') };
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const options = init || {};
        const requestUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
        let url;
        try { url = new URL(requestUrl, window.location.href); } catch { return nativeFetch(input, options); }
        if (url.origin !== window.location.origin || !/^\/api(?:\/|$)/.test(url.pathname)) return nativeFetch(input, options);
        chuyenDuongDanCamelCase(url);
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(options.headers || {}).forEach((value, name) => headers.set(name, value));
        if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
        const requestOptions = { ...options, headers };
        if (options.body !== undefined) requestOptions.body = chuyenBodyCamelCase(options.body);
        const requestInput = input instanceof Request ? new Request(url.href, input) : url.href;
        return nativeFetch(requestInput, requestOptions).then(response => {
            const tokenMoi = response.headers.get('X-BookFlow-Access-Token');
            if (tokenMoi) capNhatToken(tokenMoi);
            return response;
        });
    };
})();
