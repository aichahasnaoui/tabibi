import * as svc from '../services/appointment.service.js';
import { dayQuerySchema } from '../validators/appointment.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const book = asyncHandler(async (req, res) =>
  res.status(201).json(await svc.book({ user: req.user, ...req.body })));
export const mine = asyncHandler(async (req, res) => res.json(await svc.listMine(req.user)));
export const day = asyncHandler(async (req, res) => {
  const { date, medecinId } = dayQuerySchema.parse(req.query);
  res.json(await svc.dayPlanning(req.user, date, medecinId));
});
export const cancel = asyncHandler(async (req, res) => res.json(await svc.cancel(req.user, req.params.id)));
export const move = asyncHandler(async (req, res) =>
  res.json(await svc.move(req.user, req.params.id, req.body.debut)));
export const confirm = asyncHandler(async (req, res) => res.json(await svc.confirm(req.user, req.params.id)));
export const setStatus = asyncHandler(async (req, res) =>
  res.json(await svc.setStatus(req.user, req.params.id, req.body.statut)));