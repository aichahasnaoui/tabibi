import { DateTime } from 'luxon';
import Waitlist from '../models/Waitlist.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import { ApiError } from '../utils/ApiError.js';
import { ZONE, getAvailableSlots } from './slot.service.js';

const HOLD_MINUTES = 30;
const dayStart = (iso) => DateTime.fromISO(iso, { zone: ZONE }).startOf('day').toUTC().toJSDate();

export async function join({ user, medecinId, patientId, jour }) {
  const patient = await Patient.findById(patientId);
  if (!patient || String(patient.titulaire) !== String(user.id)) throw new ApiError(403, 'Accès interdit');
  if (!(await Doctor.exists({ _id: medecinId, valide: true }))) throw new ApiError(404, 'Médecin introuvable');

  const slots = await getAvailableSlots(medecinId, jour, jour);
  if (slots.length > 0) throw new ApiError(409, "Le jour n'est pas complet : réservez directement");

  const day = dayStart(jour);
  if (await Waitlist.exists({ medecin: medecinId, patient: patientId, jour: day })) {
    throw new ApiError(409, 'Déjà inscrit sur la liste');
  }
  const last = await Waitlist.findOne({ medecin: medecinId, jour: day }).sort('-rang').select('rang');
  const w = await Waitlist.create({ medecin: medecinId, patient: patientId, jour: day, rang: (last?.rang || 0) + 1 });
  return { id: w._id, rang: w.rang };
}

// Appelé après une annulation : notifie le premier patient en attente ce jour-là.
export async function notifyNext(medecinId, debut) {
  const day = DateTime.fromJSDate(debut, { zone: ZONE }).startOf('day').toUTC().toJSDate();
  const now = new Date();
  // Libère les notifications expirées : le suivant passe devant
  await Waitlist.deleteMany({ medecin: medecinId, jour: day, expireLe: { $lte: now } });
  if (await Waitlist.exists({ medecin: medecinId, jour: day, expireLe: { $gt: now } })) return null;
  const next = await Waitlist.findOneAndUpdate(
    { medecin: medecinId, jour: day, notifieLe: { $exists: false } },
    { notifieLe: now, expireLe: new Date(now.getTime() + HOLD_MINUTES * 60 * 1000) },
    { sort: 'rang', new: true }
  );
  return next; // la notification réelle (e-mail, Socket.IO) pourra se brancher ici
}

export async function listMine(user) {
  const ids = (await Patient.find({ titulaire: user.id }).select('_id')).map((p) => p._id);
  return Waitlist.find({ patient: { $in: ids } }).select('medecin jour rang notifieLe expireLe').lean();
}

export async function confirm(user, id, debut) {
  const w = await Waitlist.findById(id).populate('patient', 'titulaire');
  if (!w || String(w.patient.titulaire) !== String(user.id)) throw new ApiError(404, 'Inscription introuvable');
  if (!w.notifieLe || w.expireLe <= new Date()) throw new ApiError(409, 'Aucune place proposée ou délai expiré');
  // Import tardif pour éviter une dépendance circulaire avec appointment.service
  const { book } = await import('./appointment.service.js');
  const rdv = await book({ user, medecinId: w.medecin, patientId: w.patient._id, debut });
  await Waitlist.deleteOne({ _id: w._id });
  return rdv;
}