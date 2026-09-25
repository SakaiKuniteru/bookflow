const express = require('express');
const apiRouter = require('./routes/index.js');
const { AppError } = require('./common/errors/AppError.js');
const { ganRequestId } = require('./common/middlewares/request-id.js');
const { chuanHoaResponse } = require('./common/middlewares/response-camel-case.js');
const { xuLyLoi } = require('./common/middlewares/error-handler.js');

function taoUngDung({ kiemTraSanSang = null } = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.use(ganRequestId);
    app.use(chuanHoaResponse);
    app.use(express.json({ limit: '1mb' }));
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

module.exports = { taoUngDung };