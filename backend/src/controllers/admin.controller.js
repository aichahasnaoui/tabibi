import { validateDoctor } from '../services/doctor.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const validate = asyncHandler(async (req, res) => {
  res.json(await validateDoctor(req.params.id, req.body?.valide !== false));
});