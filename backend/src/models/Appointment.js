import mongoose from 'mongoose';
const { Schema } = mongoose;

const appointmentSchema = new Schema(
  {
    medecin: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    debut: { type: Date, required: true },
    fin: { type: Date, required: true },
    motif: String,
    statut: {
      type: String,
      enum: ['RESERVE', 'CONFIRME', 'HONORE', 'ABSENT', 'ANNULE_PATIENT', 'ANNULE_CABINET'],
      default: 'RESERVE',
    },
    actif: { type: Boolean, default: true }, // false si annulé : libère le créneau
    creePar: { type: Schema.Types.ObjectId, ref: 'User' },
    historique: [
      {
        statut: String,
        date: { type: Date, default: Date.now },
        par: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

// Anti double-réservation : un seul rendez-vous actif par {medecin, debut}
appointmentSchema.index(
  { medecin: 1, debut: 1 },
  { unique: true, partialFilterExpression: { actif: true } }
);
appointmentSchema.index({ patient: 1, debut: 1 });

export default mongoose.model('Appointment', appointmentSchema);