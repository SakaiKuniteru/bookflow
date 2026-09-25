import { Router } from 'express';
import { xacThucRouter } from '../modules/xac-thuc/xac-thuc.routes.js';
import { phanQuyenRouter } from '../modules/phan-quyen/phan-quyen.routes.js';
import { donViRouter } from '../modules/don-vi/don-vi.routes.js';
import { chiNhanhRouter } from '../modules/chi-nhanh/chi-nhanh.routes.js';

export const apiRouter = Router();

apiRouter.use('/xac-thuc', xacThucRouter);
apiRouter.use('/phan-quyen', phanQuyenRouter);
apiRouter.use('/don-vi', donViRouter);
apiRouter.use('/chi-nhanh', chiNhanhRouter);