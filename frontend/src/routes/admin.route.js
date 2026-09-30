import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import authMiddleware from '../middlewares/auth.js';
import permissionMiddleware from '../middlewares/permission.js';

const router = Router();

router.use(authMiddleware);

router.get('/tong-quan', permissionMiddleware('members.manage'), adminController.dashboard);

router.get('/chi-nhanh', permissionMiddleware('BRANCH_VIEW'), adminController.branches);
router.get('/nhan-vien', permissionMiddleware('EMPLOYEE_VIEW'), adminController.employees);
router.get('/phan-quyen', permissionMiddleware('PERMISSION_VIEW'), adminController.permissions);
router.get('/sach', permissionMiddleware('BOOK_MANAGE'), adminController.books);
router.get('/nha-cung-cap', permissionMiddleware('SUPPLIER_VIEW'), adminController.suppliers);
router.get('/kho', permissionMiddleware('WAREHOUSE_MANAGE'), adminController.warehouses);
router.get('/khach-hang', permissionMiddleware('CUSTOMER_MANAGE'), adminController.customers);
router.get('/hoi-vien', permissionMiddleware('MEMBERSHIP_MANAGE'), adminController.memberships);
router.get('/chinh-sach-muon', permissionMiddleware('BORROW_POLICY_MANAGE'), adminController.borrowPolicies);
router.get('/thanh-toan', permissionMiddleware('PAYMENT_MANAGE'), adminController.payments);
router.get('/bao-cao', permissionMiddleware('REPORT_VIEW'), adminController.reports);
router.get('/cai-dat', permissionMiddleware('SYSTEM_SETTING_VIEW'), adminController.settings);

export default router;
