import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, kiemTraCsrf } from '../../common/middlewares/authenticate.js';
import * as controller from './xac-thuc.controller.js';

export const xacThucRouter = Router();
const gioiHan = (max, windowMs = 15 * 60000) => rateLimit({ windowMs, limit: max, standardHeaders: true, legacyHeaders: false, message: { success: false, request_id: '', error: { code: 'RATE_LIMIT', message: 'Quá nhiều yêu cầu, vui lòng thử lại', details: [] } }, handler: (req, res) => res.status(429).json({ success: false, request_id: req.requestId, error: { code: 'RATE_LIMIT', message: 'Quá nhiều yêu cầu, vui lòng thử lại', details: [] } }) });

xacThucRouter.post('/dang-ky', gioiHan(5, 3600000), controller.dangKy);
xacThucRouter.post('/xac-nhan-dang-ky', gioiHan(10), controller.xacNhanDangKy);
xacThucRouter.post('/gui-lai-otp-dang-ky', gioiHan(5, 3600000), controller.guiLaiOtpDangKy);
xacThucRouter.post('/dang-nhap', gioiHan(10), controller.dangNhap);
xacThucRouter.post('/hoan-tat-nhan-vien', gioiHan(10), controller.hoanTatNhanVien);
xacThucRouter.post('/quen-mat-khau', gioiHan(5, 3600000), controller.quenMatKhau);
xacThucRouter.post('/dat-lai-mat-khau', gioiHan(10), controller.datLaiMatKhau);
xacThucRouter.get('/me', authenticate, controller.me);
xacThucRouter.post('/lam-moi-phien', authenticate, kiemTraCsrf, controller.lamMoiPhien);
xacThucRouter.post('/dang-xuat', authenticate, kiemTraCsrf, controller.dangXuat);
xacThucRouter.post('/yeu-cau-doi-mat-khau', authenticate, kiemTraCsrf, gioiHan(5, 3600000), controller.yeuCauDoiMatKhau);
xacThucRouter.post('/doi-mat-khau', authenticate, kiemTraCsrf, gioiHan(10), controller.doiMatKhau);
xacThucRouter.post('/chon-don-vi', authenticate, kiemTraCsrf, controller.chonDonVi);
xacThucRouter.post('/nhan-vien', authenticate, kiemTraCsrf, gioiHan(10, 3600000), controller.taoNhanVienBoiAdmin);
xacThucRouter.post('/nhan-vien/:taiKhoanId/gui-lai-thu-moi', authenticate, kiemTraCsrf, gioiHan(5, 3600000), controller.guiLaiThuMoiNhanVien);
