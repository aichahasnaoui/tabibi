import Doctor from '../models/Doctor.js';
import Schedule from '../models/Schedule.js';
import Absence from '../models/Absence.js';
import { ApiError } from '../utils/ApiError.js';

export async function doctorIdOf(userId) {
  const doctor = await Doctor.findOne({ user: userId }).select('_id');
  if (!doctor) throw new ApiError(404, 'Profil médecin introuvable');
  return doctor._id;
}

export async function listSchedules(userId) {
  return Schedule.find({ medecin: await doctorIdOf(userId) }).sort('jourSemaine heureDebut').lean();
}

export async function addSchedule(userId, data) {
  const medecin = await doctorIdOf(userId);
  const clash = await Schedule.exists({
    medecin, jourSemaine: data.jourSemaine,
    heureDebut: { $lt: data.heureFin }, heureFin: { $gt: data.heureDebut },
  });
  if (clash) throw new ApiError(409, 'Cette plage chevauche un horaire existant');
  return Schedule.create({ ...data, medecin });
}

export async function deleteSchedule(userId, id) {
  const r = await Schedule.deleteOne({ _id: id, medecin: await doctorIdOf(userId) });
  if (!r.deletedCount) throw new ApiError(404, 'Agenda introuvable');
}

export async function listAbsences(userId) {
  return Absence.find({ medecin: await doctorIdOf(userId) }).sort('debut').lean();
}

export async function addAbsence(userId, data) {
  return Absence.create({ ...data, medecin: await doctorIdOf(userId) });
}

export async function deleteAbsence(userId, id) {
  const r = await Absence.deleteOne({ _id: id, medecin: await doctorIdOf(userId) });
  if (!r.deletedCount) throw new ApiError(404, 'Absence introuvable');
}