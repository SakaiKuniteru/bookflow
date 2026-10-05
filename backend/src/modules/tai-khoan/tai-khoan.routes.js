const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const controller = require('./tai-khoan.controller.js');

const router = Router();
router.use(authenticate);
router.get('/me', controller.layHoSo);
router.patch('/me', controller.capNhatHoSo);
router.patch('/me/avatar', controller.capNhatAvatar);

module.exports = router;
