import Patient from '../models/Patient.js';
import User from '../models/User.js';

export async function listMyPatients(user) {
  if (!(await Patient.exists({ user: user.id }))) {
    const u = await User.findById(user.id).select('nom');
    await Patient.create({ user: user.id, titulaire: user.id, prenom: u.nom });
  }
  return Patient.find({ titulaire: user.id }).select('prenom dateNaissance').lean();
}

export async function addRelative(user, { prenom, dateNaissance }) {
  const p = await Patient.create({ titulaire: user.id, prenom, dateNaissance });
  return { _id: p._id, prenom: p.prenom, dateNaissance: p.dateNaissance };
}