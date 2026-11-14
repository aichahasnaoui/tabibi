import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    telephone: String,
    motDePasse: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['PATIENT', 'MEDECIN', 'SECRETAIRE', 'ADMIN'],
      required: true,
    },
    actif: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);