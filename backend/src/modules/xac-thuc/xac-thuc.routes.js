const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const controller = require('./xac-thuc.controller.js');

const router = Router();

const gioiHan = (max, windowMs = 15 * 60000) => rateLimit({
    windowMs, limit: max, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
        success: false,
        request_id: req.requestId,
        error: { code: 'RATE_LIMIT', message: 'Quá nhiều yêu cầu, vui lòng thử lại', details: [] }
    })
});

router.post('/dang-ky', gioiHan(5, 3600000), controller.dangKy);
router.post('/xac-nhan-dang-ky', gioiHan(10), controller.xacNhanDangKy);
router.post('/gui-lai-otp-dang-ky', gioiHan(5, 3600000), controller.guiLaiOtpDangKy);
router.post('/dang-nhap', gioiHan(10), controller.dangNhap);
router.post('/hoan-tat-nhan-vien', gioiHan(10), controller.hoanTatNhanVien);
router.post('/quen-mat-khau', gioiHan(5, 3600000), controller.quenMatKhau);
router.post('/dat-lai-mat-khau', gioiHan(10), controller.datLaiMatKhau);
router.post('/lam-moi-phien', gioiHan(30), controller.lamMoiPhien);
router.get('/me', authenticate, controller.me);
router.post('/dang-xuat', authenticate, controller.dangXuat);
router.post('/yeu-cau-doi-mat-khau', authenticate, gioiHan(5, 3600000), controller.yeuCauDoiMatKhau);
router.post('/doi-mat-khau', authenticate, gioiHan(10), controller.doiMatKhau);
router.post('/chon-don-vi', authenticate, controller.chonDonVi);
router.post('/nhan-vien', authenticate, gioiHan(10, 3600000), controller.taoNhanVienBoiAdmin);
router.post('/nhan-vien/:taiKhoanId/gui-lai-thu-moi', authenticate, gioiHan(5, 3600000), controller.guiLaiThuMoiNhanVien);

module.exports = router;