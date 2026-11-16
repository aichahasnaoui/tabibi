import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Cabinet from '../models/Cabinet.js';
import { ApiError } from '../utils/ApiError.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PUBLIC_FIELDS = 'specialite tarif langues conventionne cabinet user';

export async function registerDoctor(data) {
  if (await Doctor.exists({ numeroOrdre: data.numeroOrdre })) {
    throw new ApiError(409, "Ce numéro d'ordre existe déjà");
  }
  const motDePasse = await bcrypt.hash(data.motDePasse, 12);
  const user = await User.create({
    nom: data.nom, email: data.email, telephone: data.telephone, motDePasse, role: 'MEDECIN',
  });
  try {
    const { nom, adresse, ville, coordinates } = data.cabinet;
    const cabinet = await Cabinet.create({
      nom, adresse, ville,
      location: { type: 'Point', coordinates: coordinates || [0, 0] },
    });
    const doctor = await Doctor.create({
      user: user._id, specialite: data.specialite, numeroOrdre: data.numeroOrdre,
      cabinet: cabinet._id, tarif: data.tarif, langues: data.langues,
      conventionne: data.conventionne, valide: false,
    });
    return { id: doctor._id, valide: false, message: "Compte en attente de validation par l'administrateur" };
  } catch (e) {
    await User.deleteOne({ _id: user._id }); // évite un compte orphelin
    throw e;
  }
}

export async function searchDoctors({ specialite, ville, langue, conventionne }) {
  const query = { valide: true };
  if (specialite) query.specialite = new RegExp(`^${escapeRegex(specialite)}$`, 'i');
  if (langue) query.langues = new RegExp(`^${escapeRegex(langue)}$`, 'i');
  if (conventionne !== undefined) query.conventionne = conventionne === 'true';
  if (ville) {
    query.cabinet = {
      $in: await Cabinet.find({ ville: new RegExp(`^${escapeRegex(ville)}$`, 'i') }).distinct('_id'),
    };
  }
  return Doctor.find(query)
    .select(PUBLIC_FIELDS) // projection : jamais numeroOrdre ni email
    .populate('cabinet', 'nom adresse ville location')
    .populate('user', 'nom')
    .lean();
}

export async function getDoctor(id) {
  const doctor = await Doctor.findOne({ _id: id, valide: true })
    .select(PUBLIC_FIELDS)
    .populate('cabinet', 'nom adresse ville location')
    .populate('user', 'nom')
    .lean();
  if (!doctor) throw new ApiError(404, 'Médecin introuvable');
  return doctor;
}

export async function updateMyProfile(userId, data) {
  const doctor = await Doctor.findOneAndUpdate({ user: userId }, data, { new: true })
    .select(PUBLIC_FIELDS)
    .lean();
  if (!doctor) throw new ApiError(404, 'Profil médecin introuvable');
  return doctor;
}

export async function listSpecialites() {
  return Doctor.distinct('specialite', { valide: true });
}

export async function validateDoctor(id, valide = true) {
  const doctor = await Doctor.findByIdAndUpdate(id, { valide }, { new: true }).select('specialite valide');
  if (!doctor) throw new ApiError(404, 'Médecin introuvable');
  return doctor;
}