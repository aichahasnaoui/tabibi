import * as doctorService from '../services/doctor.service.js';
import { getAvailableSlots } from '../services/slot.service.js';
import { slotsQuerySchema } from '../validators/doctor.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  res.status(201).json(await doctorService.registerDoctor(req.body));
});
export const search = asyncHandler(async (req, res) => {
  res.json(await doctorService.searchDoctors(req.query));
});
export const specialites = asyncHandler(async (req, res) => {
  res.json(await doctorService.listSpecialites());
});
export const getOne = asyncHandler(async (req, res) => {
  res.json(await doctorService.getDoctor(req.params.id));
});
export const updateMe = asyncHandler(async (req, res) => {
  res.json(await doctorService.updateMyProfile(req.user.id, req.body));
});
export const slots = asyncHandler(async (req, res) => {
  const { from, to } = slotsQuerySchema.parse(req.query);
  res.json(await getAvailableSlots(req.params.id, from, to));
});