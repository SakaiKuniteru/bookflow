const service = require('./phien-ban-sach.service.js');
function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}
class PhienBanSachController {
    async danhSach(req, res, next) {
        try {
            const data = await service.danhSach(req.auth, req.query);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async chiTiet(req, res, next) {
        try {
            const data = await service.chiTiet(req.auth, req.params.phienBanId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async taoPhienBan(req, res, next) {
        try {
            const data = await service.taoPhienBan(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async suaPhienBan(req, res, next) {
        try {
            const data = await service.suaPhienBan(req.auth, req.params.phienBanId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async doiTrangThai(req, res, next) {
        try {
            const data = await service.doiTrangThai(req.auth, req.params.phienBanId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async xoaPhienBan(req, res, next) {
        try {
            const data = await service.xoaPhienBan(req.auth, req.params.phienBanId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}
module.exports = new PhienBanSachController();