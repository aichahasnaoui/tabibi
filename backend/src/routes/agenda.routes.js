import { Router } from 'express';
import * as ctrl from '../controllers/agenda.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { scheduleSchema, absenceSchema } from '../validators/doctor.validator.js';

const router = Router();
router.use(['/schedules', '/absences'], authenticate, requireRole('MEDECIN'));

router.get('/schedules', ctrl.listSchedules);
router.post('/schedules', validate(scheduleSchema), ctrl.addSchedule);
router.delete('/schedules/:id', ctrl.deleteSchedule);

router.get('/absences', ctrl.listAbsences);
router.post('/absences', validate(absenceSchema), ctrl.addAbsence);
router.delete('/absences/:id', ctrl.deleteAbsence);

export default router;