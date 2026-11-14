import mongoose from 'mongoose';
const { Schema } = mongoose;

const scheduleSchema = new Schema({
  medecin: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  jourSemaine: { type: Number, min: 1, max: 7, required: true }, // 1 = lundi ... 7 = dimanche
  heureDebut: { type: String, required: true }, // "09:00"
  heureFin: { type: String, required: true }, // "17:00"
  dureeConsultation: { type: Number, required: true, min: 5 }, // en minutes
});

export default mongoose.model('Schedule', scheduleSchema);