import { Router } from 'express';
import publicController from '../controllers/public.controller.js';

const router = Router();

router.get('/', publicController.home);
router.get('/sach', publicController.books);
router.get('/sach/:id', publicController.bookDetail);
router.get('/tim-kiem', publicController.search);
router.get('/goi-hoi-vien', publicController.membership);
router.get('/gioi-thieu', publicController.about);

export default router;