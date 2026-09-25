import { Router } from 'express';
import { authenticate, kiemTraCsrf } from '../../common/middlewares/authenticate.js';
import { authorize } from '../../common/middlewares/authorize.js';
import { tenantScope } from '../../common/middlewares/tenant-scope.js';
import { branchScope } from '../../common/middlewares/branch-scope.js';
import * as controller from './chi-nhanh.controller.js';

export const chiNhanhRouter = Router();

chiNhanhRouter.use(authenticate, tenantScope);

chiNhanhRouter.get('/', controller.danhSachChiNhanh);
chiNhanhRouter.get('/dang-chon', branchScope, controller.chiNhanhDangChon);
chiNhanhRouter.post('/chon', kiemTraCsrf, controller.chonChiNhanh);
chiNhanhRouter.post('/', kiemTraCsrf, authorize('branches.manage'), controller.taoChiNhanh);

chiNhanhRouter.get('/:chiNhanhId', controller.chiTietChiNhanh);
chiNhanhRouter.patch('/:chiNhanhId', kiemTraCsrf, controller.capNhatChiNhanh);
chiNhanhRouter.patch('/:chiNhanhId/trang-thai', kiemTraCsrf, authorize('branches.manage'), controller.doiTrangThaiChiNhanh);

chiNhanhRouter.get('/:chiNhanhId/nhan-vien', controller.danhSachNhanVien);
chiNhanhRouter.put('/:chiNhanhId/nhan-vien/:thanhVienId', kiemTraCsrf, controller.phanCongNhanVien);
chiNhanhRouter.delete('/:chiNhanhId/nhan-vien/:thanhVienId', kiemTraCsrf, controller.boPhanCongNhanVien);