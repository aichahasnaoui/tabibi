import mongoose from 'mongoose';
const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    medecin: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    contenu: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('ConsultationNote', noteSchema);