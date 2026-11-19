import * as svc from '../services/patient.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => res.json(await svc.listMyPatients(req.user)));
export const addRelative = asyncHandler(async (req, res) =>
  res.status(201).json(await svc.addRelative(req.user, req.body)));