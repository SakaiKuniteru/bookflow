const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { authorize } = require('../../common/middlewares/authorize.js');
const controller = require('./nha-cung-cap.controller.js');
const router = Router();
router.use(authenticate);
const bangCon = {
    'dia-chi': 'dia_chi_nha_cung_cap',
    'lien-he': 'lien_he_nha_cung_cap',
    'tai-khoan-ngan-hang': 'tai_khoan_ngan_hang_nha_cung_cap',
    'hop-dong': 'hop_dong_nha_cung_cap',
    'phien-ban-sach': 'nha_cung_cap_phien_ban_sach'
};
for (const [duongDan, bang] of Object.entries(bangCon)) {
    const con = Router({ mergeParams: true });
    con.use((req, res, next) => { req.loaiBang = bang; next(); });
    con.get('/', authorize('books.read'), controller.xuLy('danhSach'));
    con.get('/:banGhiId', authorize('books.read'), controller.xuLy('chiTiet'));
    con.post('/', authorize('books.create'), controller.xuLy('tao', 201));
    con.patch('/:banGhiId', authorize('books.create'), controller.xuLy('sua'));
    con.delete('/:banGhiId', authorize('books.create'), controller.xuLy('xoa'));
    router.use(`/:nhaCungCapId/${duongDan}`, con);
}
router.get('/', authorize('books.read'), controller.xuLy('danhSach'));
router.get('/:nhaCungCapId', authorize('books.read'), controller.xuLy('chiTiet'));
router.post('/', authorize('books.create'), controller.xuLy('tao', 201));
router.patch('/:nhaCungCapId', authorize('books.create'), controller.xuLy('sua'));
router.delete('/:nhaCungCapId', authorize('books.create'), controller.xuLy('xoa'));
module.exports = router;