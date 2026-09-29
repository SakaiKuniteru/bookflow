import { Router } from 'express';
import publicRoutes from './public.route.js';
import authRoutes from './auth.route.js';
import customerRoutes from './customer.route.js';
import staffRoutes from './staff.route.js';
import adminRoutes from './admin.route.js';
import superAdminRoutes from './super-admin.route.js';

const router = Router();

router.use('/', publicRoutes);
router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);
router.use('/super-admin', superAdminRoutes);

export default router;