const service = require('./phan-quyen.service.js');

function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}

class PhanQuyenController {
    async quyenCuaToi(req, res, next) {
        try {
            const data = await service.quyenCuaToi(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async danhMucQuyen(req, res, next) {
        try {
            const data = await service.danhMucQuyen(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async danhSachVaiTro(req, res, next) {
        try {
            const data = await service.danhSachVaiTro(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async quyenCuaVaiTro(req, res, next) {
        try {
            const data = await service.quyenCuaVaiTro(req.auth, req.params.vaiTroId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async taoVaiTro(req, res, next) {
        try {
            const data = await service.taoVaiTro(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }

    async suaVaiTro(req, res, next) {
        try {
            const data = await service.suaVaiTro(req.auth, req.params.vaiTroId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async voHieuVaiTro(req, res, next) {
        try {
            const data = await service.voHieuVaiTro(req.auth, req.params.vaiTroId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async thayQuyenVaiTro(req, res, next) {
        try {
            const data = await service.thayQuyenVaiTro(req.auth, req.params.vaiTroId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async vaiTroCuaThanhVien(req, res, next) {
        try {
            const data = await service.vaiTroCuaThanhVien(req.auth, req.params.thanhVienId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async ganVaiTro(req, res, next) {
        try {
            const data = await service.ganVaiTro(req.auth, req.params.thanhVienId, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }

    async thuHoiVaiTro(req, res, next) {
        try {
            const data = await service.thuHoiVaiTro(req.auth, req.params.thanhVienId, req.params.ganVaiTroId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}

module.exports = new PhanQuyenController();