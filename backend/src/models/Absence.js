import mongoose from 'mongoose';
const { Schema } = mongoose;

const absenceSchema = new Schema({
  medecin: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  debut: { type: Date, required: true },
  fin: { type: Date, required: true },
  motif: String,
});

export default mongoose.model('Absence', absenceSchema);