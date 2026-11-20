import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app.js';
import User from '../models/User.js';

const URI = process.env.MONGO_URI_TEST_API || 'mongodb://localhost:27017/tabibi_api_test';
let adminToken;
let patToken;
let docToken;
let docId;
let cabinetId;

const login = async (email, motDePasse) =>
  (await request(app).post('/api/auth/login').send({ email, motDePasse })).body.accessToken;

beforeAll(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await User.create({
    nom: 'Admin', email: 'admin@t.tn', role: 'ADMIN', motDePasse: await bcrypt.hash('Passw0rd123', 4),
  });
  adminToken = await login('admin@t.tn', 'Passw0rd123');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('authentification', () => {
  it('inscrit un patient sans renvoyer le mot de passe', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ nom: 'Pat Test', email: 'pat@t.tn', motDePasse: 'Passw0rd123' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('PATIENT');
    expect(JSON.stringify(res.body)).not.toMatch(/motDePasse|\$2b\$/);
  });

  it('refuse un e-mail déjà utilisé', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ nom: 'Pat Test', email: 'pat@t.tn', motDePasse: 'Passw0rd123' });
    expect(res.status).toBe(409);
  });

  it('refuse un mot de passe trop court (400)', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ nom: 'Pat', email: 'x@t.tn', motDePasse: '123' });
    expect(res.status).toBe(400);
  });

  it('refuse un mauvais mot de passe (401)', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'pat@t.tn', motDePasse: 'mauvais1234' });
    expect(res.status).toBe(401);
  });

  it('renvoie un access token et un cookie refresh à la connexion', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'pat@t.tn', motDePasse: 'Passw0rd123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=.*HttpOnly/);
    patToken = res.body.accessToken;
  });
});

describe('médecins', () => {
  it('inscrit un médecin non validé, invisible dans la recherche', async () => {
    const res = await request(app).post('/api/doctors/register').send({
      nom: 'Dr Test', email: 'dr@t.tn', motDePasse: 'Passw0rd123', specialite: 'Dentiste',
      numeroOrdre: 'TN-1', langues: ['arabe'], conventionne: true,
      cabinet: { nom: 'Cabinet T', adresse: 'Rue 1', ville: 'Sfax' },
    });
    expect(res.status).toBe(201);
    docId = res.body.id;
    const list = await request(app).get('/api/doctors?ville=Sfax');
    expect(list.body).toHaveLength(0);
  });

  it("l'admin valide le médecin, qui devient visible sans données sensibles", async () => {
    const v = await request(app).patch(`/api/admin/doctors/${docId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(v.status).toBe(200);
    const list = await request(app).get('/api/doctors?specialite=dentiste&ville=sfax&langue=arabe&conventionne=true');
    expect(list.body).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toMatch(/numeroOrdre|dr@t\.tn/);
    cabinetId = list.body[0].cabinet._id;
  });

  it('refuse la validation par un patient (403)', async () => {
    const res = await request(app).patch(`/api/admin/doctors/${docId}/validate`)
      .set('Authorization', `Bearer ${patToken}`);
    expect(res.status).toBe(403);
  });

  it('refuse un identifiant invalide (400)', async () => {
    const res = await request(app).get('/api/doctors/pasunid');
    expect(res.status).toBe(400);
  });

  it('un médecin gère son agenda ; le chevauchement est refusé', async () => {
    docToken = await login('dr@t.tn', 'Passw0rd123');
    const body = { jourSemaine: 1, heureDebut: '09:00', heureFin: '12:00', dureeConsultation: 30 };
    const a = await request(app).post('/api/schedules').set('Authorization', `Bearer ${docToken}`).send(body);
    expect(a.status).toBe(201);
    const b = await request(app).post('/api/schedules').set('Authorization', `Bearer ${docToken}`).send(body);
    expect(b.status).toBe(409);
  });

  it('un patient ne peut pas gérer un agenda (403)', async () => {
    const res = await request(app).get('/api/schedules').set('Authorization', `Bearer ${patToken}`);
    expect(res.status).toBe(403);
  });
});

describe('patients, secrétaires et planning', () => {
  it('liste le patient lui-même puis ajoute un proche', async () => {
    const l = await request(app).get('/api/patients').set('Authorization', `Bearer ${patToken}`);
    expect(l.status).toBe(200);
    expect(l.body).toHaveLength(1);
    const a = await request(app).post('/api/patients').set('Authorization', `Bearer ${patToken}`)
      .send({ prenom: 'Adam', dateNaissance: '2018-05-01' });
    expect(a.status).toBe(201);
    const l2 = await request(app).get('/api/patients').set('Authorization', `Bearer ${patToken}`);
    expect(l2.body).toHaveLength(2);
  });

  it("l'admin crée une secrétaire ; elle voit le planning de son cabinet, pas un patient", async () => {
    const s = await request(app).post('/api/admin/secretaires').set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Secretaire', email: 'sec@t.tn', motDePasse: 'Passw0rd123', cabinetId });
    expect(s.status).toBe(201);
    const secToken = await login('sec@t.tn', 'Passw0rd123');
    const ok = await request(app).get(`/api/appointments/day?date=2026-12-07&medecinId=${docId}`)
      .set('Authorization', `Bearer ${secToken}`);
    expect(ok.status).toBe(200);
    const ko = await request(app).get(`/api/appointments/day?date=2026-12-07&medecinId=${docId}`)
      .set('Authorization', `Bearer ${patToken}`);
    expect(ko.status).toBe(403);
  });
});