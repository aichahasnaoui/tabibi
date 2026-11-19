import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Cabinet from '../models/Cabinet.js';
import { ApiError } from '../utils/ApiError.js';

export async function createSecretary({ nom, email, telephone, motDePasse, cabinetId }) {
  const cabinet = await Cabinet.findById(cabinetId);
  if (!cabinet) throw new ApiError(404, 'Cabinet introuvable');
  const user = await User.create({
    nom, email, telephone, motDePasse: await bcrypt.hash(motDePasse, 12), role: 'SECRETAIRE',
  });
  await Cabinet.updateOne({ _id: cabinetId }, { $addToSet: { secretaires: user._id } });
  return { id: user._id, nom: user.nom, email: user.email, role: user.role };
}