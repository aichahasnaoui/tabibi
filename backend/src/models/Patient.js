import mongoose from 'mongoose';
const { Schema } = mongoose;

const patientSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' }, // compte propre (optionnel pour un enfant)
  titulaire: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // compte qui gère ce proche
  prenom: { type: String, required: true },
  dateNaissance: Date,
  absences: [Date],
  bloqueJusqua: Date,
});

export default mongoose.model('Patient', patientSchema);