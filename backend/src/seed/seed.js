import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { DateTime } from 'luxon';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Cabinet from '../models/Cabinet.js';
import Patient from '../models/Patient.js';
import Schedule from '../models/Schedule.js';
import Absence from '../models/Absence.js';
import Appointment from '../models/Appointment.js';
import Waitlist from '../models/Waitlist.js';
import ConsultationNote from '../models/ConsultationNote.js';
import ToolLog from '../models/ToolLog.js';
import { computeSlots, ZONE } from '../services/slot.service.js';

const PASSWORD = 'Passw0rd123';
const ADMIN_PASSWORD = 'Admin123!';
const SPECIALITES = ['Dentiste', 'Généraliste', 'Pédiatre', 'Cardiologue', 'Dermatologue', 'Ophtalmologue'];
const VILLES = [
  { nom: 'Tunis', coordinates: [10.18, 36.8] },
  { nom: 'Sfax', coordinates: [10.76, 34.74] },
  { nom: 'Sousse', coordinates: [10.64, 35.83] },
  { nom: 'Gabès', coordinates: [10.1, 33.88] },
  { nom: 'Bizerte', coordinates: [9.87, 37.27] },
];
const NOMS = ['Ben Salah', 'Trabelsi', 'Jebali', 'Mansour', 'Gharbi', 'Hamdi', 'Bouazizi', 'Chaabane',
  'Sassi', 'Karray', 'Zouari', 'Ayari', 'Khemiri', 'Mejri', 'Dridi', 'Haddad'];
const PRENOMS = ['Adam', 'Yasmine', 'Mohamed', 'Salma', 'Ali', 'Nour', 'Rim', 'Omar', 'Lina', 'Youssef'];
const LANGUES = [['arabe', 'français'], ['arabe'], ['arabe', 'français', 'anglais']];

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];

await mongoose.connect(env.MONGO_URI);
for (const m of [User, Doctor, Cabinet, Patient, Schedule, Absence, Appointment, Waitlist, ConsultationNote, ToolLog]) {
  await m.deleteMany({});
}
await Appointment.syncIndexes();

const hash = await bcrypt.hash(PASSWORD, 10);
const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

// Admin
await User.create({ nom: 'Administrateur', email: 'admin@tabibi.tn', motDePasse: adminHash, role: 'ADMIN' });

// Cabinets (1 par ville) et secrétaires
const cabinetIds = VILLES.map(() => new mongoose.Types.ObjectId());
const secretaires = await User.insertMany(VILLES.map((v, i) => ({
  nom: `Secrétaire ${v.nom}`, email: `secretaire${i + 1}@tabibi.tn`, motDePasse: hash, role: 'SECRETAIRE',
})));
await Cabinet.insertMany(VILLES.map((v, i) => ({
  _id: cabinetIds[i], nom: `Cabinet médical ${v.nom}`, adresse: `${10 + i} Avenue Habib Bourguiba`,
  ville: v.nom, location: { type: 'Point', coordinates: v.coordinates }, secretaires: [secretaires[i]._id],
})));

// Médecins : 16 (15 validés, 1 en attente), 6 spécialités, 5 villes
const docUsers = await User.insertMany(Array.from({ length: 16 }, (_, i) => ({
  nom: `Dr ${NOMS[i]}`, email: `medecin${i + 1}@tabibi.tn`, telephone: `7100${1000 + i}`,
  motDePasse: hash, role: 'MEDECIN',
})));
const doctors = await Doctor.insertMany(docUsers.map((u, i) => ({
  user: u._id, specialite: SPECIALITES[i % 6], numeroOrdre: `TN-${1000 + i}`, cabinet: cabinetIds[i % 5],
  tarif: 30 + 10 * rnd(5), langues: LANGUES[i % 3], conventionne: i % 2 === 0, valide: i < 15,
})));
const validDoctors = doctors.filter((d) => d.valide);

// Agendas : lundi-vendredi, 09:00-12:00 et 14:00-17:00
const scheduleDocs = [];
const schedulesByDoctor = new Map();
validDoctors.forEach((d, i) => {
  const duree = i % 3 === 0 ? 20 : 30;
  const list = [];
  for (let jour = 1; jour <= 5; jour += 1) {
    list.push({ medecin: d._id, jourSemaine: jour, heureDebut: '09:00', heureFin: '12:00', dureeConsultation: duree });
    list.push({ medecin: d._id, jourSemaine: jour, heureDebut: '14:00', heureFin: '17:00', dureeConsultation: duree });
  }
  scheduleDocs.push(...list);
  schedulesByDoctor.set(String(d._id), list);
});
await Schedule.insertMany(scheduleDocs);

// Absences : quelques médecins absents dans 10 à 12 jours
const today = DateTime.now().setZone(ZONE).startOf('day');
const absenceDocs = validDoctors
  .filter((_, i) => i % 5 === 0)
  .map((d) => ({
    medecin: d._id, debut: today.plus({ days: 10 }).toUTC().toJSDate(),
    fin: today.plus({ days: 12 }).toUTC().toJSDate(), motif: 'Congrès',
  }));
await Absence.insertMany(absenceDocs);
const absencesByDoctor = new Map(absenceDocs.map((a) => [String(a.medecin), [a]]));

// Patients : 40 comptes (chacun est son propre patient) + 10 proches
const patUsers = await User.insertMany(Array.from({ length: 40 }, (_, i) => ({
  nom: `Patient ${i + 1}`, email: `patient${i + 1}@tabibi.tn`, telephone: `2000${1000 + i}`,
  motDePasse: hash, role: 'PATIENT',
})));
const patients = await Patient.insertMany([
  ...patUsers.map((u) => ({ user: u._id, titulaire: u._id, prenom: u.nom })),
  ...Array.from({ length: 10 }, (_, i) => ({
    titulaire: patUsers[i]._id, prenom: PRENOMS[i], dateNaissance: new Date(2015 + (i % 6), i, 10),
  })),
]);

// Rendez-vous : 2 semaines passées + 2 semaines à venir
const now = new Date();
const from = today.minus({ days: 14 }).toISODate();
const to = today.plus({ days: 14 }).toISODate();
const rows = [];
const absentsParPatient = new Map();

for (const d of validDoctors) {
  const slots = computeSlots({
    schedules: schedulesByDoctor.get(String(d._id)),
    absences: absencesByDoctor.get(String(d._id)) || [],
    fromDate: from, toDate: to, now: new Date(0),
  });
  for (const s of slots) {
    if (Math.random() > 0.45) continue;
    const p = pick(patients);
    const past = s.debut < now;
    const statut = past
      ? (Math.random() < 0.15 ? 'ABSENT' : 'HONORE')
      : (Math.random() < 0.5 ? 'CONFIRME' : 'RESERVE');
    if (statut === 'ABSENT') absentsParPatient.set(String(p._id), [...(absentsParPatient.get(String(p._id)) || []), s.debut]);
    rows.push({
      medecin: d._id, patient: p._id, debut: s.debut, fin: s.fin, motif: 'Consultation', statut,
      creePar: p.titulaire, historique: [{ statut, par: p.titulaire }],
    });
  }
}
await Appointment.insertMany(rows, { ordered: false });

// Absences des patients (et blocage à 3 absences en 6 mois)
await Patient.bulkWrite([...absentsParPatient].map(([id, dates]) => ({
  updateOne: {
    filter: { _id: id },
    update: {
      $set: {
        absences: dates,
        ...(dates.length >= 3 ? { bloqueJusqua: today.plus({ days: 30 }).toJSDate() } : {}),
      },
    },
  },
})));

console.log('Seed terminé :');
console.log(`  ${doctors.length} médecins (${validDoctors.length} validés), ${VILLES.length} villes, ${SPECIALITES.length} spécialités`);
console.log(`  ${patUsers.length} comptes patients, ${patients.length} patients (avec proches)`);
console.log(`  ${rows.length} rendez-vous sur 4 semaines`);
console.log('Comptes de démonstration :');
console.log(`  admin@tabibi.tn / ${ADMIN_PASSWORD}`);
console.log(`  medecin1@tabibi.tn ... medecin16@tabibi.tn / ${PASSWORD}  (medecin16 : en attente de validation)`);
console.log(`  secretaire1@tabibi.tn ... secretaire5@tabibi.tn / ${PASSWORD}`);
console.log(`  patient1@tabibi.tn ... patient40@tabibi.tn / ${PASSWORD}`);

await mongoose.disconnect();