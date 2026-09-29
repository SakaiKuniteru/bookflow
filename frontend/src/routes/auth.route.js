import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

router.get('/dang-nhap', authController.loginPage);
router.post('/dang-nhap', authController.login);
router.get('/dang-ky', authController.registerPage);
router.post('/dang-ky', authController.register);
router.get('/quen-mat-khau', authController.forgotPasswordPage);
router.post('/quen-mat-khau', authController.forgotPassword);
router.get('/dat-lai-mat-khau', authController.resetPasswordPage);
router.post('/dat-lai-mat-khau', authController.resetPassword);
router.post('/dang-xuat', authMiddleware, authController.logout);

export default router;