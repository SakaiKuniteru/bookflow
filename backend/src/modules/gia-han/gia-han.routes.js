const express = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { tenantScope } = require('../../common/middlewares/tenant-scope.js');
const { authorize } = require('../../common/middlewares/authorize.js');
const controller = require('./gia-han.controller.js');

const router = express.Router();

router.use(authenticate, tenantScope);
router.get('/', authorize('circulation.read'), controller.danhSach.bind(controller));
router.get('/:giaHanId', authorize('circulation.read'), controller.chiTiet.bind(controller));
router.post('/', authorize('circulation.create'), controller.tao.bind(controller));
router.post('/:giaHanId/duyet', authorize('circulation.update'), controller.duyet.bind(controller));
router.post('/:giaHanId/huy', authorize('circulation.update'), controller.huy.bind(controller));
router.put('/cau-hinh', authorize('circulation.update'), controller.cauHinh.bind(controller));

module.exports = router;