import { DateTime } from 'luxon';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Cabinet from '../models/Cabinet.js';
import { ApiError } from '../utils/ApiError.js';
import { ZONE, getAvailableSlots } from './slot.service.js';
import { doctorIdOf } from './agenda.service.js';

const MAX_UPCOMING = 2;
const CANCEL_LIMIT_HOURS = 12;
const hoursBefore = (debut) => (debut.getTime() - Date.now()) / 3_600_000;
const summary = (r) => ({ id: r._id, medecin: r.medecin, patient: r.patient, debut: r.debut, fin: r.fin, statut: r.statut });

const isSecretaryOf = async (userId, doctor) =>
  !!(await Cabinet.exists({ _id: doctor.cabinet, secretaires: userId }));

async function assertSlotFree(medecinId, debut) {
  const day = DateTime.fromJSDate(debut, { zone: ZONE }).toISODate();
  const slots = await getAvailableSlots(medecinId, day, day);
  const slot = slots.find((s) => s.debut.getTime() === debut.getTime());
  if (!slot) throw new ApiError(409, "Ce créneau n'est pas disponible");
  return slot;
}

// Charge un RDV et vérifie que l'utilisateur a le droit d'y toucher.
// Si ce n'est pas le cas : 404 (on ne révèle pas son existence).
async function loadWithAccess(user, id) {
  const rdv = await Appointment.findById(id)
    .populate('medecin', 'user cabinet')
    .populate('patient', 'titulaire');
  if (!rdv) throw new ApiError(404, 'Rendez-vous introuvable');
  const uid = String(user.id);
  let ok = false;
  if (user.role === 'PATIENT') ok = String(rdv.patient.titulaire) === uid;
  else if (user.role === 'MEDECIN') ok = String(rdv.medecin.user) === uid;
  else if (user.role === 'SECRETAIRE') ok = await isSecretaryOf(uid, rdv.medecin);
  if (!ok) throw new ApiError(404, 'Rendez-vous introuvable');
  return rdv;
}

export async function book({ user, medecinId, patientId, debut, motif }) {
  const doctor = await Doctor.findOne({ _id: medecinId, valide: true }).select('cabinet');
  if (!doctor) throw new ApiError(404, 'Médecin introuvable');
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient introuvable');

  if (user.role === 'PATIENT') {
    if (String(patient.titulaire) !== String(user.id)) throw new ApiError(403, 'Accès interdit');
    if (patient.bloqueJusqua && patient.bloqueJusqua > new Date()) {
      throw new ApiError(403, 'Réservation en ligne suspendue (3 absences en 6 mois)');
    }
  } else if (user.role === 'SECRETAIRE') {
    if (!(await isSecretaryOf(user.id, doctor))) throw new ApiError(403, 'Accès interdit');
  } else {
    throw new ApiError(403, 'Accès interdit');
  }

  const upcoming = await Appointment.countDocuments({
    medecin: medecinId, patient: patientId, actif: true, debut: { $gt: new Date() },
  });
  if (upcoming >= MAX_UPCOMING) {
    throw new ApiError(409, 'Maximum 2 rendez-vous à venir chez le même médecin');
  }

  const slot = await assertSlotFree(medecinId, debut);
  try {
    const rdv = await Appointment.create({
      medecin: medecinId, patient: patientId, debut: slot.debut, fin: slot.fin, motif,
      creePar: user.id, historique: [{ statut: 'RESERVE', par: user.id }],
    });
    return summary(rdv);
  } catch (e) {
    // La vraie protection anti double-réservation : l'index unique partiel
    if (e.code === 11000) throw new ApiError(409, 'Créneau déjà pris');
    throw e;
  }
}

export async function listMine(user) {
  const ids = (await Patient.find({ titulaire: user.id }).select('_id')).map((p) => p._id);
  return Appointment.find({ patient: { $in: ids } })
    .sort('-debut')
    .select('medecin patient debut fin statut motif')
    .populate({
      path: 'medecin', select: 'specialite cabinet user',
      populate: [{ path: 'user', select: 'nom' }, { path: 'cabinet', select: 'nom adresse ville' }],
    })
    .populate('patient', 'prenom')
    .lean();
}

export async function dayPlanning(user, date, medecinIdParam) {
  let medecinId;
  if (user.role === 'MEDECIN') {
    medecinId = await doctorIdOf(user.id);
  } else {
    if (!medecinIdParam) throw new ApiError(400, 'medecinId requis');
    const doctor = await Doctor.findById(medecinIdParam).select('cabinet');
    if (!doctor || !(await isSecretaryOf(user.id, doctor))) throw new ApiError(403, 'Accès interdit');
    medecinId = doctor._id;
  }
  const start = DateTime.fromISO(date, { zone: ZONE }).startOf('day');
  return Appointment.find({
    medecin: medecinId, actif: true,
    debut: { $gte: start.toJSDate(), $lte: start.endOf('day').toJSDate() },
  })
    .sort('debut')
    .select('patient debut fin statut motif') // jamais de notes, ni téléphone
    .populate('patient', 'prenom')
    .lean();
}

export async function cancel(user, id) {
  const rdv = await loadWithAccess(user, id);
  if (!rdv.actif || ['HONORE', 'ABSENT'].includes(rdv.statut)) {
    throw new ApiError(409, 'Rendez-vous non annulable');
  }
  const isPatient = user.role === 'PATIENT';
  if (isPatient && hoursBefore(rdv.debut) < CANCEL_LIMIT_HOURS) {
    throw new ApiError(403, 'Annulation impossible moins de 12 h avant le rendez-vous');
  }
  const statut = isPatient ? 'ANNULE_PATIENT' : 'ANNULE_CABINET';
  const r = await Appointment.updateOne(
    { _id: rdv._id, actif: true },
    { $set: { statut, actif: false }, $push: { historique: { statut, par: user.id } } }
  );
  if (!r.modifiedCount) throw new ApiError(409, 'Rendez-vous déjà annulé');
  // TODO (branche suivante) : notifier le premier de la liste d'attente
  return { id: rdv._id, statut };
}

export async function move(user, id, debut) {
  const rdv = await loadWithAccess(user, id);
  if (!rdv.actif || !['RESERVE', 'CONFIRME'].includes(rdv.statut)) {
    throw new ApiError(409, 'Rendez-vous non déplaçable');
  }
  if (user.role === 'PATIENT' && hoursBefore(rdv.debut) < CANCEL_LIMIT_HOURS) {
    throw new ApiError(403, 'Déplacement impossible moins de 12 h avant le rendez-vous');
  }
  const slot = await assertSlotFree(rdv.medecin._id, debut);
  try {
    await Appointment.updateOne(
      { _id: rdv._id, actif: true },
      { $set: { debut: slot.debut, fin: slot.fin, statut: 'RESERVE' },
        $push: { historique: { statut: 'RESERVE', par: user.id } } }
    );
  } catch (e) {
    if (e.code === 11000) throw new ApiError(409, 'Créneau déjà pris');
    throw e;
  }
  return { id: rdv._id, debut: slot.debut, fin: slot.fin, statut: 'RESERVE' };
}

export async function confirm(user, id) {
  const rdv = await loadWithAccess(user, id);
  if (!rdv.actif || rdv.statut !== 'RESERVE') throw new ApiError(409, 'Rendez-vous non confirmable');
  await Appointment.updateOne(
    { _id: rdv._id },
    { $set: { statut: 'CONFIRME' }, $push: { historique: { statut: 'CONFIRME', par: user.id } } }
  );
  return { id: rdv._id, statut: 'CONFIRME' };
}

async function registerAbsence(patientId) {
  const patient = await Patient.findByIdAndUpdate(patientId, { $push: { absences: new Date() } }, { new: true });
  const since = DateTime.now().minus({ months: 6 }).toJSDate();
  if (patient.absences.filter((d) => d >= since).length >= 3) {
    await Patient.updateOne({ _id: patientId }, { bloqueJusqua: DateTime.now().plus({ days: 30 }).toJSDate() });
  }
}

export async function setStatus(user, id, statut) {
  const rdv = await loadWithAccess(user, id); // la route impose le rôle MEDECIN
  if (!rdv.actif || !['RESERVE', 'CONFIRME'].includes(rdv.statut)) {
    throw new ApiError(409, 'Statut non modifiable');
  }
  await Appointment.updateOne(
    { _id: rdv._id },
    { $set: { statut }, $push: { historique: { statut, par: user.id } } }
  );
  if (statut === 'ABSENT') await registerAbsence(rdv.patient._id);
  return { id: rdv._id, statut };
}