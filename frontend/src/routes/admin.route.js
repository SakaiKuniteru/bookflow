import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import authMiddleware from '../middlewares/auth.js';
import permissionMiddleware from '../middlewares/permission.js';
import requireActiveInterface from '../middlewares/active-interface.js';

const router = Router();

router.use(authMiddleware, requireActiveInterface('admin'));
router.get('/', (req, res) => res.redirect('/admin/tong-quan'));
router.get('/tong-quan', permissionMiddleware('members.manage'), adminController.dashboard);
router.get('/thong-tin-ca-nhan', adminController.profile);
router.get('/chi-nhanh', permissionMiddleware('BRANCH_VIEW'), adminController.branches);
router.get('/nhan-vien', permissionMiddleware('EMPLOYEE_VIEW'), adminController.employees);
router.get('/phan-quyen', permissionMiddleware('PERMISSION_VIEW'), adminController.permissions);
router.get('/sach', permissionMiddleware('BOOK_MANAGE'), adminController.books);
router.get('/tac-gia', permissionMiddleware('BOOK_MANAGE'), adminController.authors);
router.get('/the-loai', permissionMiddleware('BOOK_MANAGE'), adminController.genres);
router.get('/nha-xuat-ban', permissionMiddleware('BOOK_MANAGE'), adminController.publishers);
router.get('/phien-ban-sach', permissionMiddleware('BOOK_MANAGE'), adminController.bookVersions);
router.get('/nha-cung-cap', permissionMiddleware('SUPPLIER_VIEW'), adminController.suppliers);
router.get('/kho', permissionMiddleware('WAREHOUSE_MANAGE'), adminController.warehouses);
router.get('/kho/nhap-kho', permissionMiddleware('WAREHOUSE_MANAGE'), adminController.stockImport);
router.get('/kho/chuyen-kho', permissionMiddleware('WAREHOUSE_MANAGE'), adminController.stockTransfer);
router.get('/kho/ton-kho', permissionMiddleware('WAREHOUSE_MANAGE'), adminController.inventory);
router.get('/kho/ton-kho/tong-hop', permissionMiddleware('WAREHOUSE_MANAGE'), adminController.inventorySummary);
router.get('/kho/ton-kho/lich-su', permissionMiddleware('WAREHOUSE_MANAGE'), adminController.inventoryHistory);
router.get('/kho/kiem-kho', permissionMiddleware('WAREHOUSE_MANAGE'), adminController.stocktake);
router.get('/khach-hang', permissionMiddleware('CUSTOMER_MANAGE'), adminController.customers);
router.get('/hoi-vien', permissionMiddleware('MEMBERSHIP_MANAGE'), adminController.memberships);
router.get('/chinh-sach-muon', permissionMiddleware('BORROW_POLICY_MANAGE'), adminController.borrowPolicies);
router.get('/thanh-toan', permissionMiddleware('PAYMENT_MANAGE'), adminController.payments);
router.get('/bao-cao', permissionMiddleware('REPORT_VIEW'), adminController.reports);
router.get('/cai-dat', permissionMiddleware('SYSTEM_SETTING_VIEW'), adminController.settings);

export default router;
