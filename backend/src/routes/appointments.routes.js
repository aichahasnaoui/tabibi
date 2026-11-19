import { Router } from 'express';
import * as ctrl from '../controllers/appointment.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { bookSchema, moveSchema, statusSchema } from '../validators/appointment.validator.js';

const router = Router();
router.use(authenticate);

router.post('/', requireRole('PATIENT', 'SECRETAIRE'), validate(bookSchema), ctrl.book);
router.get('/mine', requireRole('PATIENT'), ctrl.mine);
router.get('/day', requireRole('MEDECIN', 'SECRETAIRE'), ctrl.day);
router.patch('/:id/cancel', requireRole('PATIENT', 'MEDECIN', 'SECRETAIRE'), ctrl.cancel);
router.patch('/:id/move', requireRole('PATIENT', 'SECRETAIRE'), validate(moveSchema), ctrl.move);
router.patch('/:id/confirm', requireRole('PATIENT', 'SECRETAIRE'), ctrl.confirm);
router.patch('/:id/status', requireRole('MEDECIN'), validate(statusSchema), ctrl.setStatus);

export default router;