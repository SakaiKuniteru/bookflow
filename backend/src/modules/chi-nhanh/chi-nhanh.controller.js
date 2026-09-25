const service = require('./chi-nhanh.service.js');

function tra(req, res, data, status = 200) {
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}

class ChiNhanhController {
    async danhSachChiNhanh(req, res, next) {
        try {
            const data = await service.danhSachChiNhanh(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async chiTietChiNhanh(req, res, next) {
        try {
            const data = await service.chiTietChiNhanh(req.auth, req.params.chiNhanhId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async taoChiNhanh(req, res, next) {
        try {
            const data = await service.taoChiNhanh(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }

    async capNhatChiNhanh(req, res, next) {
        try {
            const data = await service.capNhatChiNhanh(req.auth, req.params.chiNhanhId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async doiTrangThaiChiNhanh(req, res, next) {
        try {
            const data = await service.doiTrangThaiChiNhanh(req.auth, req.params.chiNhanhId, req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async chonChiNhanh(req, res, next) {
        try {
            const data = await service.chonChiNhanh(req.auth, req.body ?? {});
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async chiNhanhDangChon(req, res, next) {
        try {
            const data = await service.chiNhanhDangChon(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async danhSachNhanVien(req, res, next) {
        try {
            const data = await service.danhSachNhanVien(req.auth, req.params.chiNhanhId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async phanCongNhanVien(req, res, next) {
        try {
            const data = await service.phanCongNhanVien(req.auth, req.params.chiNhanhId, req.params.thanhVienId, req.body ?? {}, req.requestId);
            return tra(req, res, data, 200);
        } catch (error) { next(error); }
    }

    async boPhanCongNhanVien(req, res, next) {
        try {
            const data = await service.boPhanCongNhanVien(req.auth, req.params.chiNhanhId, req.params.thanhVienId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}

module.exports = new ChiNhanhController();