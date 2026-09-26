const { Router } = require('express');
const multer = require('multer');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { AppError } = require('../../common/errors/AppError.js');
const controller = require('./tep-tin.controller.js');

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 10, fileSize: 5 * 1024 * 1024, fields: 4, parts: 14 },
    fileFilter: (_req, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) return callback(new AppError({ code: 'UNSUPPORTED_FILE', message: 'Định dạng file không được hỗ trợ', status: 422 }));
        callback(null, true);
    }
});
function nhanNhieuFile(req, res, next) {
    upload.array('files', 10)(req, res, error => {
        if (!error) return next();
        if (error instanceof multer.MulterError) return next(new AppError({ code: 'UPLOAD_LIMIT', message: 'Tối đa 10 file, mỗi file không quá 5 MB', status: 413 }));
        return next(error);
    });
}
router.use(authenticate);
router.post('/upload', nhanNhieuFile, controller.uploadNhieu);
router.post('/upload-nhieu', nhanNhieuFile, controller.uploadNhieu);
router.get('/', controller.danhSach);
router.get('/:tepId', controller.chiTiet);
router.get('/:tepId/url', controller.urlDoc);
router.delete('/:tepId', controller.xoa);

module.exports = router;