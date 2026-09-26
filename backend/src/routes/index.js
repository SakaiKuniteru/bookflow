const { Router } = require('express');
const xacThucRouter = require('../modules/xac-thuc/xac-thuc.routes.js');
const phanQuyenRouter = require('../modules/phan-quyen/phan-quyen.routes.js');
const donViRouter = require('../modules/don-vi/don-vi.routes.js');
const chiNhanhRouter = require('../modules/chi-nhanh/chi-nhanh.routes.js');
const nhanVienRouter = require('../modules/nhan-vien/nhan-vien.routes.js');
const tepTinRouter = require('../modules/tep-tin/tep-tin.routes.js');

const apiRouter = Router();

apiRouter.use('/xac-thuc', xacThucRouter);
apiRouter.use('/phan-quyen', phanQuyenRouter);
apiRouter.use('/don-vi', donViRouter);
apiRouter.use('/chi-nhanh', chiNhanhRouter);
apiRouter.use('/nhan-vien', nhanVienRouter);
apiRouter.use('/tep-tin', tepTinRouter);

module.exports = apiRouter;