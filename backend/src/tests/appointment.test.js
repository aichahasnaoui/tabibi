import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import Doctor from '../models/Doctor.js';
import Schedule from '../models/Schedule.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import { book, cancel } from '../services/appointment.service.js';
import { ZONE } from '../services/slot.service.js';

const URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/tabibi_test';
let doctor;
let lundi; // lundi de la semaine prochaine à 09:00 (Tunis) : toujours dans le futur

const slotAt = (i) => lundi.plus({ minutes: 30 * i }).toJSDate();
const newPatient = () => Patient.create({ titulaire: new mongoose.Types.ObjectId(), prenom: 'Test' });
const asUser = (p) => ({ id: String(p.titulaire), role: 'PATIENT' });
const args = (p, debut) => ({
  user: asUser(p), medecinId: String(doctor._id), patientId: String(p._id), debut,
});

beforeAll(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Appointment.syncIndexes(); // recrée l'index unique partiel
  doctor = await Doctor.create({
    user: new mongoose.Types.ObjectId(), specialite: 'Dentiste', numeroOrdre: 'T-1',
    cabinet: new mongoose.Types.ObjectId(), valide: true,
  });
    await Schedule.create({
    medecin: doctor._id, jourSemaine: 1, heureDebut: '09:00', heureFin: '14:00', dureeConsultation: 30,
  });
  lundi = DateTime.now().setZone(ZONE).plus({ weeks: 1 }).startOf('week').set({ hour: 9 });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('réservation', () => {
  it('10 réservations simultanées sur le même créneau : une seule réussit', async () => {
    const patients = await Promise.all(Array.from({ length: 10 }, () => newPatient()));
    const debut = slotAt(0);
    const results = await Promise.allSettled(patients.map((p) => book(args(p, debut))));

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await Appointment.countDocuments({ medecin: doctor._id, debut, actif: true })).toBe(1);
  });

  it('refuse un 3e rendez-vous à venir chez le même médecin', async () => {
    const p = await newPatient();
    await book(args(p, slotAt(1)));
    await book(args(p, slotAt(2)));
    await expect(book(args(p, slotAt(3)))).rejects.toMatchObject({ status: 409 });
  });

  it('refuse un patient bloqué', async () => {
    const p = await Patient.create({
      titulaire: new mongoose.Types.ObjectId(), prenom: 'Bloque',
      bloqueJusqua: DateTime.now().plus({ days: 10 }).toJSDate(),
    });
    await expect(book(args(p, slotAt(4)))).rejects.toMatchObject({ status: 403 });
  });

  it("refuse la réservation pour le proche d'un autre compte", async () => {
    const p = await newPatient();
    const autre = { id: String(new mongoose.Types.ObjectId()), role: 'PATIENT' };
    await expect(
      book({ user: autre, medecinId: String(doctor._id), patientId: String(p._id), debut: slotAt(5) })
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('annulation', () => {
  it('refuse une annulation patient à moins de 12 h', async () => {
    const p = await newPatient();
    const debut = DateTime.now().plus({ hours: 5 }).toJSDate();
    const rdv = await Appointment.create({
      medecin: doctor._id, patient: p._id, debut, fin: new Date(debut.getTime() + 1_800_000),
    });
    await expect(cancel(asUser(p), rdv._id)).rejects.toMatchObject({ status: 403 });
  });

  it('libère le créneau après annulation : un autre patient peut le reprendre', async () => {
    const p1 = await newPatient();
    const p2 = await newPatient();
    const rdv = await book(args(p1, slotAt(6)));
    await cancel(asUser(p1), rdv.id);
    const rdv2 = await book(args(p2, slotAt(6)));
    expect(rdv2.statut).toBe('RESERVE');
  });
});