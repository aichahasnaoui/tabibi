import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

function signTokens(user) {
  const accessToken = jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id),
    expiresIn: env.ACCESS_TTL,
  });
  const refreshToken = jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: String(user._id),
    expiresIn: env.REFRESH_TTL,
  });
  return { accessToken, refreshToken };
}

const publicUser = (u) => ({ id: u._id, nom: u.nom, email: u.email, role: u.role });

export async function register({ nom, email, telephone, motDePasse }) {
  const motDePasseHash = await bcrypt.hash(motDePasse, 12);
  const user = await User.create({
    nom, email, telephone, motDePasse: motDePasseHash, role: 'PATIENT',
  });
  return publicUser(user);
}

export async function login({ email, motDePasse }) {
  const user = await User.findOne({ email }).select('+motDePasse');
  const ok = user && (await bcrypt.compare(motDePasse, user.motDePasse));
  if (!ok || !user.actif) throw new ApiError(401, 'Identifiants invalides');
  const tokens = signTokens(user);
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hash(tokens.refreshToken) });
  return { user: publicUser(user), ...tokens };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new ApiError(401, 'Refresh token manquant');
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Refresh token invalide');
  }
  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.actif || user.refreshTokenHash !== hash(refreshToken)) {
    throw new ApiError(401, 'Refresh token invalide');
  }
  const tokens = signTokens(user);
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hash(tokens.refreshToken) });
  return { user: publicUser(user), ...tokens };
}

export async function logout(userId) {
  await User.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } });
}