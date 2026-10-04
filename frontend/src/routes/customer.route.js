import { Router } from 'express';
import customerController from '../controllers/customer.controller.js';
import authMiddleware from '../middlewares/auth.js';
import permissionMiddleware from '../middlewares/permission.js';
import requireActiveInterface from '../middlewares/active-interface.js';

const router = Router();

router.use(authMiddleware, requireActiveInterface('customer'));

router.get('/tong-quan', customerController.dashboard);
router.get('/gio-hang', customerController.cart);
router.get('/thanh-toan', customerController.checkout);
router.get('/don-hang', customerController.orders);
router.get('/don-hang/:id', customerController.orderDetail);
router.get('/yeu-cau-muon', customerController.borrowRequests);
router.get('/sach-dang-muon', customerController.borrowingBooks);
router.get('/chi-tiet-phieu-muon/:id', customerController.borrowDetail);
router.get('/dat-truoc-sach', customerController.reservations);
router.get('/hoi-vien', customerController.membership);
router.get('/thong-bao', customerController.notifications);
router.get('/ho-so', customerController.profile);

export default router;