import { Router } from 'express';
import superAdminController from '../controllers/super-admin.controller.js';
import authMiddleware from '../middlewares/auth.js';
import permissionMiddleware from '../middlewares/permission.js';

const router = Router();

router.use(authMiddleware);

router.get('/tong-quan', permissionMiddleware('SUPER_ADMIN_DASHBOARD_VIEW'), superAdminController.dashboard);
router.get('/don-vi', permissionMiddleware('TENANT_VIEW'), superAdminController.organizations);
router.get('/goi-dich-vu', permissionMiddleware('SERVICE_PLAN_VIEW'), superAdminController.servicePlans);
router.get('/dang-ky-dich-vu', permissionMiddleware('SUBSCRIPTION_VIEW'), superAdminController.subscriptions);
router.get('/hoa-don', permissionMiddleware('INVOICE_VIEW'), superAdminController.invoices);
router.get('/su-dung-ai', permissionMiddleware('AI_USAGE_VIEW'), superAdminController.aiUsage);
router.get('/nhat-ky', permissionMiddleware('AUDIT_LOG_VIEW'), superAdminController.auditLogs);
router.get('/cai-dat', permissionMiddleware('PLATFORM_SETTING_VIEW'), superAdminController.settings);

export default router;