const service = require('./the-loai.service.js');
function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}
class TheLoaiController {
    async danhSach(req, res, next) {
        try {
            const data = await service.danhSach(req.auth, req.query);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async chiTiet(req, res, next) {
        try {
            const data = await service.chiTiet(req.auth, req.params.theLoaiId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async cayTheLoai(req, res, next) {
        try {
            const data = await service.cayTheLoai(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async taoTheLoai(req, res, next) {
        try {
            const data = await service.taoTheLoai(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }
    async suaTheLoai(req, res, next) {
        try {
            const data = await service.suaTheLoai(req.auth, req.params.theLoaiId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async doiTrangThai(req, res, next) {
        try {
            const data = await service.doiTrangThai(req.auth, req.params.theLoaiId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
    async xoaTheLoai(req, res, next) {
        try {
            const data = await service.xoaTheLoai(req.auth, req.params.theLoaiId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}
module.exports = new TheLoaiController();