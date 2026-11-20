import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import Doctor from '../models/Doctor.js';
import Schedule from '../models/Schedule.js';
import Patient from '../models/Patient.js';
import Waitlist from '../models/Waitlist.js';
import Appointment from '../models/Appointment.js';
import { book, cancel } from '../services/appointment.service.js';
import { join } from '../services/waitlist.service.js';
import { ZONE } from '../services/slot.service.js';

const URI = process.env.MONGO_URI_TEST_WL || 'mongodb://localhost:27017/tabibi_wl_test';
let doctor;
let lundi;

const newPatient = () => Patient.create({ titulaire: new mongoose.Types.ObjectId(), prenom: 'T' });
const asUser = (p) => ({ id: String(p.titulaire), role: 'PATIENT' });

beforeAll(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Appointment.syncIndexes();
  doctor = await Doctor.create({
    user: new mongoose.Types.ObjectId(), specialite: 'Dentiste', numeroOrdre: 'W-1',
    cabinet: new mongoose.Types.ObjectId(), valide: true,
  });
  // Une seule plage : le jour devient complet dès qu'elle est réservée
  await Schedule.create({
    medecin: doctor._id, jourSemaine: 1, heureDebut: '09:00', heureFin: '09:30', dureeConsultation: 30,
  });
  lundi = DateTime.now().setZone(ZONE).plus({ weeks: 2 }).startOf('week').set({ hour: 9 });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('liste d\'attente', () => {
  it('refuse l\'inscription si le jour a encore des créneaux', async () => {
    const p = await newPatient();
    await expect(
      join({ user: asUser(p), medecinId: String(doctor._id), patientId: String(p._id), jour: lundi.toISODate() })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('inscrit sur un jour complet, puis notifie le premier à l\'annulation', async () => {
    const p1 = await newPatient();
    const p2 = await newPatient();
    const p3 = await newPatient();
    const base = { medecinId: String(doctor._id), jour: lundi.toISODate() };

    const rdv = await book({ user: asUser(p1), medecinId: base.medecinId, patientId: String(p1._id), debut: lundi.toJSDate() });
    const w2 = await join({ user: asUser(p2), ...base, patientId: String(p2._id) });
    const w3 = await join({ user: asUser(p3), ...base, patientId: String(p3._id) });
    expect([w2.rang, w3.rang]).toEqual([1, 2]);

    await cancel(asUser(p1), rdv.id);

    const first = await Waitlist.findOne({ patient: p2._id });
    const second = await Waitlist.findOne({ patient: p3._id });
    expect(first.notifieLe).toBeTruthy();
    expect(first.expireLe.getTime() - first.notifieLe.getTime()).toBe(30 * 60 * 1000);
    expect(second.notifieLe).toBeUndefined();
  });
});