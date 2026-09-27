const express = require('express');
const controller = require('./ai.controller.js');

const router = express.Router();

router.post('/chat', controller.chat.bind(controller));
router.post('/search', controller.search.bind(controller));
router.post('/goi-y-sach', controller.goiYSach.bind(controller));
router.post('/phan-tich', controller.phanTich.bind(controller));

module.exports = router;