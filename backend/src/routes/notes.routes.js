import { Router } from 'express';
import * as ctrl from '../controllers/note.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { noteSchema } from '../validators/appointment.validator.js';

const router = Router();
router.use(authenticate, requireRole('MEDECIN'));
router.put('/:appointmentId', validate(noteSchema), ctrl.save);
router.get('/:appointmentId', ctrl.get);

export default router;