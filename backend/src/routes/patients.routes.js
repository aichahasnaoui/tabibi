import { Router } from 'express';
import * as ctrl from '../controllers/patient.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { patientSchema } from '../validators/appointment.validator.js';

const router = Router();
router.use(authenticate, requireRole('PATIENT'));
router.get('/', ctrl.list);
router.post('/', validate(patientSchema), ctrl.addRelative);

export default router;