const service = require('./nha-xuat-ban.service.js');
function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}
class NhaXuatBanController {
    async danhSach(req, res, next) {
        try {
            const data = await service.danhSach(req.auth, req.query);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async chiTiet(req, res, next) {
        try {
            const data = await service.chiTiet(req.auth, req.params.nhaXuatBanId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async taoNhaXuatBan(req, res, next) {
        try {
            const data = await service.taoNhaXuatBan(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async suaNhaXuatBan(req, res, next) {
        try {
            const data = await service.suaNhaXuatBan(req.auth, req.params.nhaXuatBanId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async doiTrangThai(req, res, next) {
        try {
            const data = await service.doiTrangThai(req.auth, req.params.nhaXuatBanId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async xoaNhaXuatBan(req, res, next) {
        try {
            const data = await service.xoaNhaXuatBan(req.auth, req.params.nhaXuatBanId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async danhSachThuongHieu(req, res, next) {
        try {
            const data = await service.danhSachThuongHieu(req.auth, req.params.nhaXuatBanId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async taoThuongHieu(req, res, next) {
        try {
            const data = await service.taoThuongHieu(req.auth, req.params.nhaXuatBanId, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async suaThuongHieu(req, res, next) {
        try {
            const data = await service.suaThuongHieu(req.auth, req.params.nhaXuatBanId, req.params.thuongHieuId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async doiTrangThaiThuongHieu(req, res, next) {
        try {
            const data = await service.doiTrangThaiThuongHieu(req.auth, req.params.nhaXuatBanId, req.params.thuongHieuId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async xoaThuongHieu(req, res, next) {
        try {
            const data = await service.xoaThuongHieu(req.auth, req.params.nhaXuatBanId, req.params.thuongHieuId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}
module.exports = new NhaXuatBanController();