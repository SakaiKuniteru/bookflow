import { Router } from 'express';
import config from '../config/index.js';
const router = Router();
router.use(async (req, res) => {
    const allowedMethods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
    if (!allowedMethods.has(req.method)) return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Phương thức không được hỗ trợ' } });
    const headers = { Accept: req.get('accept') || 'application/json' };
    if (req.authToken) headers.Authorization = `Bearer ${req.authToken}`;
    let body;
    const contentType = req.get('content-type') || '';
    const multipart = contentType.toLowerCase().startsWith('multipart/form-data;');
    if (!['GET', 'HEAD'].includes(req.method)) {
        if (multipart) {
            headers['Content-Type'] = contentType;
            const contentLength = req.get('content-length');
            if (contentLength) headers['Content-Length'] = contentLength;
            body = req;
        } else {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(req.body ?? {});
        }
    }
    try {
        const upstream = await fetch(`${config.api.baseUrl}${req.url}`, { method: req.method, headers, body, redirect: 'manual', ...(multipart ? { duplex: 'half' } : {}) });
        const responseBody = Buffer.from(await upstream.arrayBuffer());
        res.status(upstream.status);
        const contentType = upstream.headers.get('content-type');
        const contentDisposition = upstream.headers.get('content-disposition');
        const requestId = upstream.headers.get('x-request-id');
        if (contentType) res.set('Content-Type', contentType);
        if (contentDisposition) res.set('Content-Disposition', contentDisposition);
        if (requestId) res.set('X-Request-Id', requestId);
        res.set('Cache-Control', 'no-store');
        return res.send(responseBody);
    } catch {
        return res.status(502).json({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Không kết nối được Backend' } });
    }
});
export default router;
