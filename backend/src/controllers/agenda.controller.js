import * as svc from '../services/agenda.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listSchedules = asyncHandler(async (req, res) => res.json(await svc.listSchedules(req.user.id)));
export const addSchedule = asyncHandler(async (req, res) => res.status(201).json(await svc.addSchedule(req.user.id, req.body)));
export const deleteSchedule = asyncHandler(async (req, res) => { await svc.deleteSchedule(req.user.id, req.params.id); res.status(204).end(); });

export const listAbsences = asyncHandler(async (req, res) => res.json(await svc.listAbsences(req.user.id)));
export const addAbsence = asyncHandler(async (req, res) => res.status(201).json(await svc.addAbsence(req.user.id, req.body)));
export const deleteAbsence = asyncHandler(async (req, res) => { await svc.deleteAbsence(req.user.id, req.params.id); res.status(204).end(); });