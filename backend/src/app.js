import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes/index.js';
import { AppError } from './common/errors/AppError.js';
import { ganRequestId } from './common/middlewares/request-id.js';
import { xuLyLoi } from './common/middlewares/error-handler.js';

export function taoUngDung({ kiemTraSanSang = null } = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.use(ganRequestId);
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());
    app.get('/health', (req, res) => res.status(200).json({ success: true, request_id: req.requestId, data: { status: 'ok', service: 'backend' } }));
    app.get('/ready', async (req, res, next) => {
        try {
            const ketQua = kiemTraSanSang ? await kiemTraSanSang() : { database: false, redis: false, storage: false };
            if (!Object.values(ketQua).every(Boolean)) throw new AppError({ code: 'SERVICE_UNAVAILABLE', message: 'Dich vu chua san sang', status: 503 });
            res.status(200).json({ success: true, request_id: req.requestId, data: { status: 'ready', service: 'backend', dependencies: { database: 'ok', redis: 'ok', storage: 'ok' } } });
        } catch (error) { next(error); }
    });
    app.use('/api', apiRouter);
    app.use((req, _res, next) => next(new AppError({ code: 'NOT_FOUND', message: 'Duong dan khong ton tai', status: 404 })));
    app.use(xuLyLoi);
    return app;
}
