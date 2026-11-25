import * as svc from '../services/stats.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const admin = asyncHandler(async (req, res) => res.json(await svc.adminDashboard(req.query)));
export const doctor = asyncHandler(async (req, res) => res.json(await svc.doctorDashboard(req.user.id)));