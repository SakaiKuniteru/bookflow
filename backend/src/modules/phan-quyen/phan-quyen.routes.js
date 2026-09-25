import { Router } from 'express';
import { authenticate, kiemTraCsrf } from '../../common/middlewares/authenticate.js';
import { authorize } from '../../common/middlewares/authorize.js';
import * as controller from './phan-quyen.controller.js';

export const phanQuyenRouter = Router();

phanQuyenRouter.use(authenticate);
phanQuyenRouter.get('/toi/quyen', controller.quyenCuaToi);

phanQuyenRouter.use(authorize('roles.manage'));
phanQuyenRouter.get('/quyen', controller.danhMucQuyen);
phanQuyenRouter.get('/vai-tro', controller.danhSachVaiTro);
phanQuyenRouter.get('/vai-tro/:vaiTroId/quyen', controller.quyenCuaVaiTro);
phanQuyenRouter.get('/thanh-vien/:thanhVienId/vai-tro', controller.vaiTroCuaThanhVien);

phanQuyenRouter.use(kiemTraCsrf);
phanQuyenRouter.post('/vai-tro', controller.taoVaiTro);
phanQuyenRouter.patch('/vai-tro/:vaiTroId', controller.suaVaiTro);
phanQuyenRouter.delete('/vai-tro/:vaiTroId', controller.voHieuVaiTro);
phanQuyenRouter.put('/vai-tro/:vaiTroId/quyen', controller.thayQuyenVaiTro);
phanQuyenRouter.post('/thanh-vien/:thanhVienId/vai-tro', controller.ganVaiTro);
phanQuyenRouter.delete('/thanh-vien/:thanhVienId/vai-tro/:ganVaiTroId', controller.thuHoiVaiTro);