const express = require('express');
const crypto = require('crypto');
const controller = require('./ai.internal.controller.js');
const { AppError } = require('../../common/errors/AppError.js');
const router = express.Router();
function xacThucAi(req, res, next) {
    const expected = String(process.env.AI_SERVICE_KEY || '');
    const received = String(req.get('X-Internal-Token') || '');
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return next(new AppError({ code: 'AI_INTERNAL_UNAUTHORIZED', message: 'Không được phép gọi API nội bộ AI', status: 401 }));
    return next();
}
router.use(xacThucAi);
router.get('/sach/:book_id', controller.laySach.bind(controller));
router.get('/tai-lieu/:file_id', controller.layTaiLieu.bind(controller));
module.exports = router;