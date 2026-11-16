import { Router } from 'express';
import * as ctrl from '../controllers/doctor.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { registerDoctorSchema, updateDoctorSchema } from '../validators/doctor.validator.js';

const router = Router();
router.post('/register', validate(registerDoctorSchema), ctrl.register);
router.get('/', ctrl.search);
router.get('/specialites', ctrl.specialites);
router.put('/me', authenticate, requireRole('MEDECIN'), validate(updateDoctorSchema), ctrl.updateMe);
router.get('/:id', ctrl.getOne);
router.get('/:id/slots', ctrl.slots);

export default router;