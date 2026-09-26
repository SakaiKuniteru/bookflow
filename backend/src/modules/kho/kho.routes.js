const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { authorize } = require('../../common/middlewares/authorize.js');
const controller = require('./kho.controller.js');
const router = Router();
router.use(authenticate);
const bangCon = {
    'khu-vuc': 'khu_vuc_kho',
    'vi-tri': 'vi_tri_kho',
    'nhan-su': 'nhan_su_kho',
    'thiet-bi': 'thiet_bi_kho',
    'nhat-ky-dieu-kien': 'nhat_ky_dieu_kien_kho',
    'tai-lieu': 'tai_lieu_kho'
};
for (const [duongDan, bang] of Object.entries(bangCon)) {
    const con = Router({ mergeParams: true });
    con.use((req, res, next) => { req.loaiBang = bang; next(); });
    con.get('/', authorize('books.read'), controller.xuLy('danhSach'));
    con.get('/:banGhiId', authorize('books.read'), controller.xuLy('chiTiet'));
    con.post('/', authorize('books.create'), controller.xuLy('tao', 201));
    con.patch('/:banGhiId', authorize('books.create'), controller.xuLy('sua'));
    con.delete('/:banGhiId', authorize('books.create'), controller.xuLy('xoa'));
    router.use(`/:khoId/${duongDan}`, con);
}
router.get('/', authorize('books.read'), controller.xuLy('danhSach'));
router.get('/:khoId', authorize('books.read'), controller.xuLy('chiTiet'));
router.post('/', authorize('books.create'), controller.xuLy('tao', 201));
router.patch('/:khoId', authorize('books.create'), controller.xuLy('sua'));
router.delete('/:khoId', authorize('books.create'), controller.xuLy('xoa'));
module.exports = router;