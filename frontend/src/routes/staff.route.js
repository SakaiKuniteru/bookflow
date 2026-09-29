import { Router } from 'express';
import staffController from '../controllers/staff.controller.js';
import authMiddleware from '../middlewares/auth.js';
import permissionMiddleware from '../middlewares/permission.js';

const router = Router();

router.use(authMiddleware);

router.get('/tong-quan', permissionMiddleware('STAFF_VIEW'), staffController.dashboard);

router.get('/sach', permissionMiddleware('BOOK_VIEW'), staffController.books);
router.get('/sach/them', permissionMiddleware('BOOK_CREATE'), staffController.createBook);
router.get('/sach/:id', permissionMiddleware('BOOK_VIEW'), staffController.bookDetail);
router.get('/sach/:id/sua', permissionMiddleware('BOOK_UPDATE'), staffController.editBook);

router.get('/kho/ton-kho', permissionMiddleware('INVENTORY_VIEW'), staffController.inventory);
router.get('/kho/ban-sao-sach', permissionMiddleware('INVENTORY_VIEW'), staffController.bookCopies);
router.get('/kho/nhap-kho', permissionMiddleware('STOCK_IMPORT_VIEW'), staffController.stockImport);
router.get('/kho/chuyen-kho', permissionMiddleware('STOCK_TRANSFER_VIEW'), staffController.stockTransfer);

router.get('/ban-hang', permissionMiddleware('SALE_VIEW'), staffController.sale);
router.get('/ban-hang/don-hang', permissionMiddleware('SALE_VIEW'), staffController.orders);
router.get('/ban-hang/don-hang/:id', permissionMiddleware('SALE_VIEW'), staffController.orderDetail);
router.get('/ban-hang/tra-hang', permissionMiddleware('RETURN_VIEW'), staffController.returns);

router.get('/muon-tra', permissionMiddleware('BORROW_VIEW'), staffController.borrowList);
router.get('/muon-tra/tao', permissionMiddleware('BORROW_CREATE'), staffController.createBorrow);
router.get('/muon-tra/:id', permissionMiddleware('BORROW_VIEW'), staffController.borrowDetail);
router.get('/muon-tra/:id/nhan-tra', permissionMiddleware('BORROW_RETURN'), staffController.receiveReturn);
router.get('/muon-tra/dat-truoc', permissionMiddleware('RESERVATION_VIEW'), staffController.reservations);
router.get('/muon-tra/qua-han', permissionMiddleware('BORROW_VIEW'), staffController.overdue);

router.get('/khach-hang', permissionMiddleware('CUSTOMER_VIEW'), staffController.customers);
router.get('/khach-hang/:id', permissionMiddleware('CUSTOMER_VIEW'), staffController.customerDetail);

export default router;