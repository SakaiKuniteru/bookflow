const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { tenantScope } = require('../../common/middlewares/tenant-scope.js');
const { authorize } = require('../../common/middlewares/authorize.js');
const controller = require('./nhan-vien.controller.js');

const router = Router();
router.use(authenticate, tenantScope);
router.get('/toi', controller.cuaToi);
router.get('/vi-tri', authorize('members.manage'), controller.danhSachViTri);
router.post('/vi-tri', authorize('members.manage'), controller.taoViTri);
router.get('/', authorize('members.manage'), controller.danhSach);
router.post('/moi', authorize('members.manage'), controller.moiNhanVien);
router.get('/:thanhVienId', authorize('members.manage'), controller.chiTiet);
router.patch('/:thanhVienId', authorize('members.manage'), controller.capNhat);
router.patch('/:thanhVienId/trang-thai', authorize('members.manage'), controller.doiTrangThai);
router.post('/:thanhVienId/chuyen-chi-nhanh', authorize('members.manage'), controller.chuyenChiNhanh);
router.post('/:thanhVienId/phan-cong-vi-tri', authorize('members.manage'), controller.phanCongViTri);
router.get('/:thanhVienId/lich-su', authorize('members.manage'), controller.lichSu);

module.exports = router;