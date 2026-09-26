const service = require('./sach.service.js');
function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}
class SachController {
    async danhSach(req, res, next) {
        try {
            const data = await service.danhSach(req.auth, req.query);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async chiTiet(req, res, next) {
        try {
            const data = await service.chiTiet(req.auth, req.params.sachId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async taoSach(req, res, next) {
        try {
            const data = await service.taoSach(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async suaSach(req, res, next) {
        try {
            const data = await service.suaSach(req.auth, req.params.sachId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async doiTrangThai(req, res, next) {
        try {
            const data = await service.doiTrangThai(req.auth, req.params.sachId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async xoaSach(req, res, next) {
        try {
            const data = await service.xoaSach(req.auth, req.params.sachId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async khoiPhuc(req, res, next) {
        try {
            const data = await service.khoiPhuc(req.auth, req.params.sachId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async danhSachLienKet(req, res, next) {
        try {
            const data = await service.danhSachLienKet(req.auth, req.params.sachId, req.params.loai);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async taoLienKet(req, res, next) {
        try {
            const data = await service.taoLienKet(req.auth, req.params.sachId, req.params.loai, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async suaLienKet(req, res, next) {
        try {
            const data = await service.suaLienKet(req.auth, req.params.sachId, req.params.loai, req.params.lienKetId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async xoaLienKet(req, res, next) {
        try {
            const data = await service.xoaLienKet(req.auth, req.params.sachId, req.params.loai, req.params.lienKetId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async danhSachAnh(req, res, next) {
        try {
            return tra(req, res, await service.danhSachAnh(req.auth, req.params.sachId));
        } catch (error) { next(error); }
    }
    async themNhieuAnh(req, res, next) {
        try {
            return tra(req, res, await service.themNhieuAnh(req.auth, req.params.sachId, req.body ?? {}, req.requestId), 201);
        } catch (error) { next(error); }
    }
    async suaAnh(req, res, next) {
        try {
            return tra(req, res, await service.suaAnh(req.auth, req.params.sachId, req.params.anhId, req.body ?? {}, req.requestId));
        } catch (error) { next(error); }
    }
    async datAnhChinh(req, res, next) {
        try {
            return tra(req, res, await service.datAnhChinh(req.auth, req.params.sachId, req.params.anhId, req.requestId));
        } catch (error) { next(error); }
    }
    async sapXepAnh(req, res, next) {
        try {
            return tra(req, res, await service.sapXepAnh(req.auth, req.params.sachId, req.body ?? {}, req.requestId));
        } catch (error) { next(error); }
    }
    async xoaAnh(req, res, next) {
        try {
            return tra(req, res, await service.xoaAnh(req.auth, req.params.sachId, req.params.anhId, req.requestId));
        } catch (error) { next(error); }
    }
}
module.exports = new SachController();