import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { secretarySchema } from '../validators/doctor.validator.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));
router.patch('/doctors/:id/validate', ctrl.validate);
router.post('/secretaires', validate(secretarySchema), ctrl.createSecretary);

export default router;