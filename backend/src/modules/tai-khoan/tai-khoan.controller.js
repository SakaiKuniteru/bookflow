const service = require('./tai-khoan.service.js');

function tra(req, res, data) {
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, requestId: req.requestId, data });
}

const taiKhoanController = {
    async layHoSo(req, res, next) {
        try { return tra(req, res, await service.layHoSoTaiKhoan(req.auth.taiKhoanId)); }
        catch (error) { return next(error); }
    },
    async capNhatHoSo(req, res, next) {
        try { return tra(req, res, await service.capNhatHoSoTaiKhoan(req.auth.taiKhoanId, req.body ?? {})); }
        catch (error) { return next(error); }
    },
    async capNhatAvatar(req, res, next) {
        try { return tra(req, res, await service.capNhatAnhDaiDien(req.auth.taiKhoanId, req.body ?? {})); }
        catch (error) { return next(error); }
    }
};

module.exports = taiKhoanController;
