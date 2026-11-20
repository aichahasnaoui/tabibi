import { Router } from 'express';
import * as ctrl from '../controllers/waitlist.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { waitlistSchema, moveSchema } from '../validators/appointment.validator.js';

const router = Router();
router.use(authenticate, requireRole('PATIENT'));
router.post('/', validate(waitlistSchema), ctrl.join);
router.get('/mine', ctrl.mine);
router.post('/:id/confirm', validate(moveSchema), ctrl.confirm);

export default router;