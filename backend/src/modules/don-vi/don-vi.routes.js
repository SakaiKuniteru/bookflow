import { Router } from 'express';
import { authenticate, kiemTraCsrf } from '../../common/middlewares/authenticate.js';
import { authorize } from '../../common/middlewares/authorize.js';
import { tenantScope } from '../../common/middlewares/tenant-scope.js';
import * as controller from './don-vi.controller.js';

export const donViRouter = Router();

donViRouter.use(authenticate);
donViRouter.post('/', kiemTraCsrf, controller.taoDonVi);
donViRouter.post('/', kiemTraCsrf, controller.taoDonVi);
donViRouter.get('/hien-tai', tenantScope, controller.donViHienTai);
donViRouter.patch('/hien-tai', tenantScope, kiemTraCsrf, authorize('units.manage'), controller.capNhatDonVi);