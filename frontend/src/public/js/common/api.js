export async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
    if (!path.startsWith('/api/')) throw new Error('API path phải bắt đầu bằng /api/');
    const response = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
        const error = new Error(payload?.error?.message || payload?.message || `API trả về HTTP ${response.status}`);
        error.status = response.status;
        error.code = payload?.error?.code || payload?.code || 'API_ERROR';
        error.requestId = payload?.request_id || response.headers.get('x-request-id') || '';
        error.data = payload;
        throw error;
    }
    return payload;
}