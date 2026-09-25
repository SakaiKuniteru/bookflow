const service = require('./xac-thuc.service.js');

function tra(req, res, data, status = 200) {
    res.set('Cache-Control', 'no-store');
    return res.status(status).json({ success: true, request_id: req.requestId, data });
}

class XacThucController {
    async dangKy(req, res, next) {
        try {
            const data = await service.dangKy(req.body ?? {});
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }

    async xacNhanDangKy(req, res, next) {
        try {
            const data = await service.xacNhanDangKy(req.body ?? {});
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async guiLaiOtpDangKy(req, res, next) {
        try {
            const data = await service.guiLaiOtpDangKy(req.body ?? {});
            return tra(req, res, data, 202);
        } catch (error) { next(error); }
    }

    async dangNhap(req, res, next) {
        try {
            const data = await service.dangNhap(req.body ?? {});
            return tra(req, res, data, data.yeu_cau_kich_hoat ? 202 : 200);
        } catch (error) { next(error); }
    }

    async hoanTatNhanVien(req, res, next) {
        try {
            const data = await service.hoanTatNhanVien(req.body ?? {}, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async me(req, res, next) {
        try {
            const data = await service.layNguoiDung(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async lamMoiPhien(req, res, next) {
        try {
            const data = await service.lamMoiPhien(req.body ?? {});
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async dangXuat(req, res, next) {
        try {
            const data = await service.dangXuat(req.auth);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async quenMatKhau(req, res, next) {
        try {
            const data = await service.quenMatKhau(req.body ?? {});
            return tra(req, res, data, 202);
        } catch (error) { next(error); }
    }

    async datLaiMatKhau(req, res, next) {
        try {
            const data = await service.datLaiMatKhau(req.body ?? {});
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async yeuCauDoiMatKhau(req, res, next) {
        try {
            const data = await service.yeuCauDoiMatKhau(req.auth.taiKhoanId, req.body ?? {});
            return tra(req, res, data, 202);
        } catch (error) { next(error); }
    }

    async doiMatKhau(req, res, next) {
        try {
            const data = await service.doiMatKhau(req.auth.taiKhoanId, req.body ?? {});
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async chonDonVi(req, res, next) {
        try {
            const data = await service.chonDonVi(req.auth, req.body ?? {});
            return tra(req, res, data);
        } catch (error) { next(error); }
    }

    async taoNhanVienBoiAdmin(req, res, next) {
        try {
            const data = await service.taoNhanVienBoiAdmin(req.auth, req.body ?? {}, req.requestId);
            return tra(req, res, data, 201);
        } catch (error) { next(error); }
    }

    async guiLaiThuMoiNhanVien(req, res, next) {
        try {
            const data = await service.guiLaiThuMoiNhanVien(req.auth, req.params.taiKhoanId, req.requestId);
            return tra(req, res, data);
        } catch (error) { next(error); }
    }
}

module.exports = new XacThucController();