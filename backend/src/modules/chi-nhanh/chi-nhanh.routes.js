const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { authorize } = require('../../common/middlewares/authorize.js');
const { tenantScope } = require('../../common/middlewares/tenant-scope.js');
const { branchScope } = require('../../common/middlewares/branch-scope.js');
const controller = require('./chi-nhanh.controller.js');

const router = Router();

router.use(authenticate, tenantScope);
router.get('/', controller.danhSachChiNhanh);
router.get('/dang-chon', branchScope, controller.chiNhanhDangChon);
router.post('/chon', controller.chonChiNhanh);
router.post('/', authorize('branches.manage'), controller.taoChiNhanh);
router.get('/:chiNhanhId', controller.chiTietChiNhanh);
router.patch('/:chiNhanhId', controller.capNhatChiNhanh);
router.patch('/:chiNhanhId/trang-thai', authorize('branches.manage'), controller.doiTrangThaiChiNhanh);
router.get('/:chiNhanhId/nhan-vien', controller.danhSachNhanVien);
router.put('/:chiNhanhId/nhan-vien/:thanhVienId', controller.phanCongNhanVien);
router.delete('/:chiNhanhId/nhan-vien/:thanhVienId', controller.boPhanCongNhanVien);

module.exports = router;