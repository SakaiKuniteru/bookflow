const express = require('express');
const controller = require('./phi-phat.controller.js');

const router = express.Router();

router.get('/', controller.danhSach.bind(controller));
router.get('/:phiPhatId', controller.chiTiet.bind(controller));
router.post('/', controller.tao.bind(controller));
router.post('/loai', controller.taoLoai.bind(controller));
router.post('/:phiPhatId/duyet', controller.duyet.bind(controller));
router.post('/:phiPhatId/mien-giam', controller.mienGiam.bind(controller));
router.post('/:phiPhatId/thu-tien', controller.thuTien.bind(controller));
router.post('/:phiPhatId/huy', controller.huy.bind(controller));

module.exports = router;