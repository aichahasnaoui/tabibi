import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));
router.patch('/doctors/:id/validate', ctrl.validate);

export default router;