import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import Doctor from '../models/Doctor.js';
import Cabinet from '../models/Cabinet.js';
import Schedule from '../models/Schedule.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import { adminDashboard, doctorDashboard } from '../services/stats.service.js';
import User from '../models/User.js';

const URI = process.env.MONGO_URI_TEST_STATS || 'mongodb://localhost:27017/tabibi_stats_test';
let doctor;
let doctorUser;

beforeAll(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Appointment.syncIndexes();
  doctorUser = await User.create({ nom: 'Dr S', email: 's@t.tn', motDePasse: 'x', role: 'MEDECIN' });
  const cabinet = await Cabinet.create({ nom: 'C', ville: 'Gabès' });
  doctor = await Doctor.create({
    user: doctorUser._id, specialite: 'Dentiste', numeroOrdre: 'S-1', cabinet: cabinet._id, valide: true,
  });
  await Schedule.create({
    medecin: doctor._id, jourSemaine: 1, heureDebut: '09:00', heureFin: '11:00', dureeConsultation: 30,
  });
  const p = await Patient.create({ titulaire: new mongoose.Types.ObjectId(), prenom: 'P' });
  const base = DateTime.now().minus({ days: 3 }).toJSDate();
  const mk = (i, statut) => ({
    medecin: doctor._id, patient: p._id, debut: new Date(base.getTime() + i * 1_800_000),
    fin: new Date(base.getTime() + (i + 1) * 1_800_000), statut,
  });
  await Appointment.insertMany([mk(0, 'HONORE'), mk(1, 'HONORE'), mk(2, 'HONORE'), mk(3, 'ABSENT')]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('tableau de bord', () => {
  it('admin : compte les RDV par spécialité et ville', async () => {
    const d = await adminDashboard({});
    expect(d.parSpecialiteVille).toEqual([{ specialite: 'Dentiste', ville: 'Gabès', total: 4 }]);
    expect(d.delaiMoyen[0].specialite).toBe('Dentiste');
  });

  it('admin : le filtre ville exclut les autres villes', async () => {
    const d = await adminDashboard({ ville: 'Sfax' });
    expect(d.delaiMoyen).toHaveLength(0);
  });

  it('médecin : taux d\'absentéisme = 1 absent sur 4', async () => {
    const d = await doctorDashboard(doctorUser._id);
    expect(d.absenteisme).toEqual({ absents: 1, total: 4, taux: 25 });
    expect(d.remplissage.length).toBeGreaterThan(0);
  });
});