const express = require('express');
const controller = require('./gia-han.controller.js');

const router = express.Router();

router.get('/', controller.danhSach.bind(controller));
router.get('/:giaHanId', controller.chiTiet.bind(controller));
router.post('/', controller.tao.bind(controller));
router.post('/:giaHanId/duyet', controller.duyet.bind(controller));
router.post('/:giaHanId/huy', controller.huy.bind(controller));
router.put('/cau-hinh', controller.cauHinh.bind(controller));

module.exports = router;