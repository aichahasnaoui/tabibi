import ConsultationNote from '../models/ConsultationNote.js';
import Appointment from '../models/Appointment.js';
import { ApiError } from '../utils/ApiError.js';
import { doctorIdOf } from './agenda.service.js';

async function ownAppointment(userId, appointmentId) {
  const medecin = await doctorIdOf(userId);
  const rdv = await Appointment.findOne({ _id: appointmentId, medecin }).select('_id');
  if (!rdv) throw new ApiError(404, 'Rendez-vous introuvable');
  return medecin;
}

export async function saveNote(userId, appointmentId, contenu) {
  const medecin = await ownAppointment(userId, appointmentId);
  const note = await ConsultationNote.findOneAndUpdate(
    { appointment: appointmentId },
    { appointment: appointmentId, medecin, contenu },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { id: note._id, contenu: note.contenu, updatedAt: note.updatedAt };
}

export async function getNote(userId, appointmentId) {
  const medecin = await ownAppointment(userId, appointmentId);
  const note = await ConsultationNote.findOne({ appointment: appointmentId, medecin })
    .select('contenu updatedAt').lean();
  if (!note) throw new ApiError(404, 'Aucune note');
  return note;
}