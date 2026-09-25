const { AppError } = require('../errors/AppError.js');

function xuLyLoi(error, req, res, _next) {
    if (res.headersSent) return _next(error);
    const laLoiNghiepVu = error instanceof AppError;
    const laLoiJson = error?.type === 'entity.parse.failed';
    const status = laLoiNghiepVu ? error.status : laLoiJson ? 400 : 500;
    const code = laLoiNghiepVu ? error.code : laLoiJson ? 'INVALID_JSON' : 'INTERNAL_ERROR';
    const message = laLoiNghiepVu ? error.message : laLoiJson ? 'JSON không hợp lệ' : 'Hệ thống đang gặp lỗi';
    if (status >= 500) console.error(JSON.stringify({ request_id: req.requestId, method: req.method, path: req.path, status, error_name: error.name }));
    return res.status(status).json({
        success: false,
        request_id: req.requestId,
        error: { code, message, details: laLoiNghiepVu ? error.details : [] }
    });
}

module.exports = { xuLyLoi };