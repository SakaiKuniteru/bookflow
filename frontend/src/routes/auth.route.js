import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.js';

const router = Router();

router.get('/dang-nhap', authController.loginPage);
router.post('/dang-nhap', authController.login);
router.post('/lam-moi-phien', authController.refreshSession);
router.get('/dang-ky', authController.registerPage);
router.post('/dang-ky', authController.register);
router.get('/xac-minh-dang-ky', authController.verifyRegistrationPage);
router.post('/xac-minh-dang-ky', authController.verifyRegistration);
router.post('/gui-lai-otp-dang-ky', authController.resendRegistrationOtp);
router.get('/kich-hoat-nhan-vien', authController.employeeActivationPage);
router.post('/kich-hoat-nhan-vien', authController.completeEmployeeActivation);
router.get('/thiet-lap-phien', authMiddleware, authController.workspaceSetupPage);
router.post('/thiet-lap-phien', authMiddleware, authController.confirmWorkspaceSetup);
router.get('/chon-don-vi', authMiddleware, authController.organizationPage);
router.post('/chon-don-vi', authMiddleware, authController.selectOrganization);
router.get('/chon-chi-nhanh', authMiddleware, authController.branchPage);
router.post('/chon-chi-nhanh', authMiddleware, authController.selectBranch);
router.get('/quen-mat-khau', authController.forgotPasswordPage);
router.post('/quen-mat-khau', authController.forgotPassword);
router.get('/dat-lai-mat-khau', authController.resetPasswordPage);
router.post('/dat-lai-mat-khau', authController.resetPassword);
router.post('/dang-xuat', authMiddleware, authController.logout);

export default router;
