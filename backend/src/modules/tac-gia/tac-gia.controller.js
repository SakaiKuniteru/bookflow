const service = require('./tac-gia.service.js');
function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}
class TacGiaController {
    async danhSach(req, res, next) {
        try {
            const data = await service.danhSach(req.auth, req.query);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async chiTiet(req, res, next) {
        try {
            const data = await service.chiTiet(req.auth, req.params.tacGiaId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async taoTacGia(req, res, next) {
        try {
            const data = await service.taoTacGia(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async suaTacGia(req, res, next) {
        try {
            const data = await service.suaTacGia(req.auth, req.params.tacGiaId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async doiTrangThai(req, res, next) {
        try {
            const data = await service.doiTrangThai(req.auth, req.params.tacGiaId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async xoaTacGia(req, res, next) {
        try {
            const data = await service.xoaTacGia(req.auth, req.params.tacGiaId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async danhSachTenKhac(req, res, next) {
        try {
            const data = await service.danhSachTenKhac(req.auth, req.params.tacGiaId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async taoTenKhac(req, res, next) {
        try {
            const data = await service.taoTenKhac(req.auth, req.params.tacGiaId, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async suaTenKhac(req, res, next) {
        try {
            const data = await service.suaTenKhac(req.auth, req.params.tacGiaId, req.params.tenKhacId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async xoaTenKhac(req, res, next) {
        try {
            const data = await service.xoaTenKhac(req.auth, req.params.tacGiaId, req.params.tenKhacId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}
module.exports = new TacGiaController();