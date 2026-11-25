import { Router } from 'express';
import * as ctrl from '../controllers/stats.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();
router.use(authenticate);
router.get('/admin', requireRole('ADMIN'), ctrl.admin);
router.get('/doctor', requireRole('MEDECIN'), ctrl.doctor);

export default router;