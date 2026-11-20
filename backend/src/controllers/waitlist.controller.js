import * as svc from '../services/waitlist.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const join = asyncHandler(async (req, res) =>
  res.status(201).json(await svc.join({ user: req.user, ...req.body })));
export const mine = asyncHandler(async (req, res) => res.json(await svc.listMine(req.user)));
export const confirm = asyncHandler(async (req, res) =>
  res.status(201).json(await svc.confirm(req.user, req.params.id, req.body.debut)));