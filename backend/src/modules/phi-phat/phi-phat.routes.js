const express = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { tenantScope } = require('../../common/middlewares/tenant-scope.js');
const { authorize } = require('../../common/middlewares/authorize.js');
const controller = require('./phi-phat.controller.js');

const router = express.Router();

router.use(authenticate, tenantScope);
router.get('/', authorize('circulation.read'), controller.danhSach.bind(controller));
router.get('/:phiPhatId', authorize('circulation.read'), controller.chiTiet.bind(controller));
router.post('/', authorize('circulation.create'), controller.tao.bind(controller));
router.post('/loai', authorize('circulation.update'), controller.taoLoai.bind(controller));
router.post('/:phiPhatId/duyet', authorize('circulation.update'), controller.duyet.bind(controller));
router.post('/:phiPhatId/mien-giam', authorize('circulation.update'), controller.mienGiam.bind(controller));
router.post('/:phiPhatId/thu-tien', authorize('circulation.update'), controller.thuTien.bind(controller));
router.post('/:phiPhatId/huy', authorize('circulation.update'), controller.huy.bind(controller));

module.exports = router;