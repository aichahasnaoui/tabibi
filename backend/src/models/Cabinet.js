import mongoose from 'mongoose';
const { Schema } = mongoose;

const cabinetSchema = new Schema({
  nom: { type: String, required: true },
  adresse: String,
  ville: { type: String, index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },
  secretaires: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

cabinetSchema.index({ location: '2dsphere' });

export default mongoose.model('Cabinet', cabinetSchema);