import { DateTime } from 'luxon';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Cabinet from '../models/Cabinet.js';
import Schedule from '../models/Schedule.js';
import { ZONE, getAvailableSlots } from './slot.service.js';
import { doctorIdOf } from './agenda.service.js';

const ANNULES = ['ANNULE_PATIENT', 'ANNULE_CABINET'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Admin : nombre de RDV par spécialité et par ville ($match, $lookup, $group)
export async function appointmentsBySpecialiteVille() {
  return Appointment.aggregate([
    { $match: { statut: { $nin: ANNULES } } },
    { $lookup: { from: 'doctors', localField: 'medecin', foreignField: '_id', as: 'd' } },
    { $unwind: '$d' },
    { $lookup: { from: 'cabinets', localField: 'd.cabinet', foreignField: '_id', as: 'c' } },
    { $unwind: '$c' },
    { $group: { _id: { specialite: '$d.specialite', ville: '$c.ville' }, total: { $sum: 1 } } },
    { $project: { _id: 0, specialite: '$_id.specialite', ville: '$_id.ville', total: 1 } },
    { $sort: { specialite: 1, ville: 1 } },
  ]);
}

// Admin : délai moyen avant le premier créneau libre, par spécialité (filtre ville optionnel)
export async function averageWaitBySpecialite({ ville } = {}) {
  const filter = { valide: true };
  if (ville) {
    filter.cabinet = {
      $in: await Cabinet.find({ ville: new RegExp(`^${escapeRegex(ville)}$`, 'i') }).distinct('_id'),
    };
  }
  const doctors = await Doctor.find(filter).select('specialite').lean();
  const today = DateTime.now().setZone(ZONE);
  const from = today.toISODate();
  const to = today.plus({ days: 30 }).toISODate();

  const groups = {};
  await Promise.all(doctors.map(async (d) => {
    const slots = await getAvailableSlots(d._id, from, to);
    if (!slots.length) return;
    (groups[d.specialite] ||= []).push((slots[0].debut.getTime() - Date.now()) / 86_400_000);
  }));

  return Object.entries(groups)
    .map(([specialite, jours]) => ({
      specialite,
      medecins: jours.length,
      delaiMoyenJours: Math.round((jours.reduce((a, b) => a + b, 0) / jours.length) * 10) / 10,
    }))
    .sort((a, b) => b.delaiMoyenJours - a.delaiMoyenJours);
}

export async function adminDashboard(query) {
  const [parSpecialiteVille, delaiMoyen] = await Promise.all([
    appointmentsBySpecialiteVille(),
    averageWaitBySpecialite(query),
  ]);
  return { parSpecialiteVille, delaiMoyen };
}

// Médecin : taux de remplissage par semaine ($dateTrunc) et taux d'absentéisme
export async function doctorDashboard(userId) {
  const medecin = await doctorIdOf(userId);
  const [schedules, parSemaine, parStatut] = await Promise.all([
    Schedule.find({ medecin }).lean(),
    Appointment.aggregate([
      { $match: { medecin, actif: true } },
      {
        $group: {
          _id: { $dateTrunc: { date: '$debut', unit: 'week', timezone: ZONE, startOfWeek: 'monday' } },
          rdv: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      { $match: { medecin, statut: { $in: ['HONORE', 'ABSENT'] } } },
      { $group: { _id: '$statut', n: { $sum: 1 } } },
    ]),
  ]);

  const capacite = schedules.reduce(
    (sum, s) => sum + Math.floor((toMinutes(s.heureFin) - toMinutes(s.heureDebut)) / s.dureeConsultation),
    0
  );
  const remplissage = parSemaine.map((w) => ({
    semaine: DateTime.fromJSDate(w._id, { zone: ZONE }).toISODate(),
    rdv: w.rdv,
    capacite,
    taux: capacite ? Math.round((w.rdv / capacite) * 1000) / 10 : 0,
  }));

  const n = Object.fromEntries(parStatut.map((s) => [s._id, s.n]));
  const vus = (n.HONORE || 0) + (n.ABSENT || 0);
  return {
    remplissage,
    absenteisme: { absents: n.ABSENT || 0, total: vus, taux: vus ? Math.round(((n.ABSENT || 0) / vus) * 1000) / 10 : 0 },
  };
}