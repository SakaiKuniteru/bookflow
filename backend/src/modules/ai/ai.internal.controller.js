const service = require('./ai.internal.service.js');
class AiInternalController {
    async laySach(req, res, next) {
        try {
            const data = await service.laySach(req.params.book_id, req.query.don_vi_id);
            if (!data) return res.status(404).json({ success: false, error: { code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy sách' } });
            return res.json({ success: true, data });
        } catch (error) {
            return next(error);
        }
    }
    async layTaiLieu(req, res, next) {
        try {
            const data = await service.layTaiLieu(req.params.file_id, req.query.don_vi_id);
            if (!data) return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Không tìm thấy tài liệu' } });
            return res.json({ success: true, data });
        } catch (error) {
            return next(error);
        }
    }
}
module.exports = new AiInternalController();