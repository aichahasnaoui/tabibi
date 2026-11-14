import mongoose from 'mongoose';
const { Schema } = mongoose;

const waitlistSchema = new Schema({
  medecin: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  jour: { type: Date, required: true }, // minuit Africa/Tunis, stocké en UTC
  rang: { type: Number, required: true },
  notifieLe: Date,
  expireLe: Date,
});

waitlistSchema.index({ medecin: 1, jour: 1, rang: 1 });

export default mongoose.model('Waitlist', waitlistSchema);