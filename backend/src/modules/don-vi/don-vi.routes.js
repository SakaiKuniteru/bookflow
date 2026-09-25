const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { authorize } = require('../../common/middlewares/authorize.js');
const { tenantScope } = require('../../common/middlewares/tenant-scope.js');
const controller = require('./don-vi.controller.js');

const router = Router();

router.use(authenticate);
router.get('/tham-gia', controller.danhSachDonVi);
router.post('/', controller.taoDonVi);
router.get('/hien-tai', tenantScope, controller.donViHienTai);
router.patch('/hien-tai', tenantScope, authorize('units.manage'), controller.capNhatDonVi);

module.exports = router;