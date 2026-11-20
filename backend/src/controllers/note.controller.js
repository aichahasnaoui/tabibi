import * as svc from '../services/note.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const save = asyncHandler(async (req, res) =>
  res.json(await svc.saveNote(req.user.id, req.params.appointmentId, req.body.contenu)));
export const get = asyncHandler(async (req, res) =>
  res.json(await svc.getNote(req.user.id, req.params.appointmentId)));