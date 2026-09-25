const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { authorize } = require('../../common/middlewares/authorize.js');
const controller = require('./phan-quyen.controller.js');

const router = Router();

router.use(authenticate);
router.get('/toi/quyen', controller.quyenCuaToi);
router.use(authorize('roles.manage'));
router.get('/quyen', controller.danhMucQuyen);
router.get('/vai-tro', controller.danhSachVaiTro);
router.get('/vai-tro/:vaiTroId/quyen', controller.quyenCuaVaiTro);
router.get('/thanh-vien/:thanhVienId/vai-tro', controller.vaiTroCuaThanhVien);
router.post('/vai-tro', controller.taoVaiTro);
router.patch('/vai-tro/:vaiTroId', controller.suaVaiTro);
router.delete('/vai-tro/:vaiTroId', controller.voHieuVaiTro);
router.put('/vai-tro/:vaiTroId/quyen', controller.thayQuyenVaiTro);
router.post('/thanh-vien/:thanhVienId/vai-tro', controller.ganVaiTro);
router.delete('/thanh-vien/:thanhVienId/vai-tro/:ganVaiTroId', controller.thuHoiVaiTro);

module.exports = router;