const { Router } = require('express');
const xacThucRouter = require('../modules/xac-thuc/xac-thuc.routes.js');
const phanQuyenRouter = require('../modules/phan-quyen/phan-quyen.routes.js');
const donViRouter = require('../modules/don-vi/don-vi.routes.js');
const chiNhanhRouter = require('../modules/chi-nhanh/chi-nhanh.routes.js');

const apiRouter = Router();

apiRouter.use('/xac-thuc', xacThucRouter);
apiRouter.use('/phan-quyen', phanQuyenRouter);
apiRouter.use('/don-vi', donViRouter);
apiRouter.use('/chi-nhanh', chiNhanhRouter);

module.exports = apiRouter;