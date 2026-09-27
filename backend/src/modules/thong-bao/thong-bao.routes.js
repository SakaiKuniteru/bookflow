const { Router } = require('express');
const { authenticate } = require('../../common/middlewares/authenticate.js');
const { tenantScope } = require('../../common/middlewares/tenant-scope.js');
const controller = require('./thong-bao.controller.js');

const router = Router();

router.use(authenticate);
router.use(tenantScope);

router.get('/', controller.danhSach);
router.get('/chua-doc', async (req, res, next) => {
    try {
        req.query.trang_thai_doc = 'CHUA_DOC';
        return controller.danhSach(req, res, next);
    } catch (error) {
        next(error);
    }
});
router.patch('/da-doc-tat-ca', controller.danhDauTatCaDaDoc);
router.get('/:thongBaoId', controller.chiTiet);
router.patch('/:thongBaoId/da-doc', controller.danhDauDaDoc);

module.exports = router;