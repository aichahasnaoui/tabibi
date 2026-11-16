import { DateTime } from 'luxon';
import Doctor from '../models/Doctor.js';
import Schedule from '../models/Schedule.js';
import Absence from '../models/Absence.js';
import Appointment from '../models/Appointment.js';
import { ApiError } from '../utils/ApiError.js';

export const ZONE = 'Africa/Tunis';

const overlaps = (aDebut, aFin, bDebut, bFin) => aDebut < bFin && aFin > bDebut;

/**
 * Fonction pure : agenda type - absences - rendez-vous existants.
 * fromDate / toDate : 'YYYY-MM-DD' (jours Africa/Tunis, bornes incluses).
 * Retourne des créneaux { debut, fin } en UTC (Date).
 */
export function computeSlots({ schedules, absences = [], appointments = [], fromDate, toDate, now = new Date() }) {
  const start = DateTime.fromISO(fromDate, { zone: ZONE }).startOf('day');
  const end = DateTime.fromISO(toDate, { zone: ZONE }).startOf('day');
  const slots = [];

  for (let day = start; day <= end; day = day.plus({ days: 1 })) {
    for (const s of schedules.filter((x) => x.jourSemaine === day.weekday)) {
      const [hd, md] = s.heureDebut.split(':').map(Number);
      const [hf, mf] = s.heureFin.split(':').map(Number);
      const limit = day.set({ hour: hf, minute: mf });
      let cursor = day.set({ hour: hd, minute: md });

      while (cursor.plus({ minutes: s.dureeConsultation }) <= limit) {
        const next = cursor.plus({ minutes: s.dureeConsultation });
        const debut = cursor.toUTC().toJSDate();
        const fin = next.toUTC().toJSDate();

        const enAbsence = absences.some((a) => overlaps(debut, fin, a.debut, a.fin));
        const pris = appointments.some((r) => overlaps(debut, fin, r.debut, r.fin));
        if (debut > now && !enAbsence && !pris) slots.push({ debut, fin });

        cursor = next;
      }
    }
  }
  return slots.sort((a, b) => a.debut - b.debut);
}

export async function getAvailableSlots(medecinId, fromDate, toDate) {
  const doctor = await Doctor.findById(medecinId).select('valide');
  if (!doctor || !doctor.valide) throw new ApiError(404, 'Médecin introuvable');

  const start = DateTime.fromISO(fromDate, { zone: ZONE }).startOf('day');
  const end = DateTime.fromISO(toDate, { zone: ZONE }).endOf('day');
  if (!start.isValid || !end.isValid || end < start) throw new ApiError(400, 'Période invalide');
  if (end.diff(start, 'days').days > 31) throw new ApiError(400, 'Période maximale : 31 jours');

  const rangeStart = start.toUTC().toJSDate();
  const rangeEnd = end.toUTC().toJSDate();

  const [schedules, absences, appointments] = await Promise.all([
    Schedule.find({ medecin: medecinId }).lean(),
    Absence.find({ medecin: medecinId, debut: { $lt: rangeEnd }, fin: { $gt: rangeStart } }).lean(),
    Appointment.find({ medecin: medecinId, actif: true, debut: { $gte: rangeStart, $lt: rangeEnd } })
      .select('debut fin')
      .lean(),
  ]);

  return computeSlots({ schedules, absences, appointments, fromDate, toDate });
}