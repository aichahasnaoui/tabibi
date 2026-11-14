import mongoose from 'mongoose';
const { Schema } = mongoose;

const doctorSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  specialite: { type: String, required: true, index: true },
  numeroOrdre: { type: String, required: true, unique: true },
  cabinet: { type: Schema.Types.ObjectId, ref: 'Cabinet' },
  tarif: Number,
  langues: [String],
  conventionne: { type: Boolean, default: false },
  valide: { type: Boolean, default: false }, // validé par l'administrateur
});

export default mongoose.model('Doctor', doctorSchema);