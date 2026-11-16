import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import User from '../models/User.js';

const email = process.env.ADMIN_EMAIL || 'admin@tabibi.tn';
const password = process.env.ADMIN_PASSWORD || 'Admin123!';

await mongoose.connect(env.MONGO_URI);
if (await User.exists({ email })) {
  console.log('Admin déjà existant :', email);
} else {
  await User.create({ nom: 'Administrateur', email, motDePasse: await bcrypt.hash(password, 12), role: 'ADMIN' });
  console.log('Admin créé :', email);
}
await mongoose.disconnect();