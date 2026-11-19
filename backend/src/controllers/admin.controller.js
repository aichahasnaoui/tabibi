import { validateDoctor } from '../services/doctor.service.js';
import { createSecretary as createSecretarySvc } from '../services/admin.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const validate = asyncHandler(async (req, res) => {
  res.json(await validateDoctor(req.params.id, req.body?.valide !== false));
});

export const createSecretary = asyncHandler(async (req, res) => {
  res.status(201).json(await createSecretarySvc(req.body));
});