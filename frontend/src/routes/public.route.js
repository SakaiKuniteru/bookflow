import { Router } from 'express';
import publicController from '../controllers/public.controller.js';

const router = Router();
const redirectWorkspaceFromPublic = (req, res, next) => {
  const destinations = { 'super-admin': '/super-admin/tong-quan', admin: '/admin/tong-quan', staff: '/staff/tong-quan' };
  const destination = destinations[req.session?.activeInterface];
  if (destination) return res.redirect(destination);
  next();
};
router.get('/',redirectWorkspaceFromPublic, publicController.home);
router.get('/sach',redirectWorkspaceFromPublic, publicController.books);
router.get('/sach/:id',redirectWorkspaceFromPublic, publicController.bookDetail);
router.get('/tim-kiem',redirectWorkspaceFromPublic, publicController.search);
router.get('/goi-hoi-vien',redirectWorkspaceFromPublic, publicController.membership);
router.get('/gioi-thieu',redirectWorkspaceFromPublic, publicController.about);

export default router;