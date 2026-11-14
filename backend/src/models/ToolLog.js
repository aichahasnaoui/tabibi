import mongoose from 'mongoose';
const { Schema } = mongoose;

const toolLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    role: String,
    outil: String,
    parametres: Schema.Types.Mixed,
    dureeMs: Number,
    resultat: Schema.Types.Mixed,
    erreur: String,
  },
  { timestamps: true }
);

export default mongoose.model('ToolLog', toolLogSchema);