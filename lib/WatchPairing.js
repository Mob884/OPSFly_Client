import mongoose from 'mongoose';

// M5: one-time code a manager generates in the app and types on the Apple Watch.
const WatchPairingSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true, index: true }, // sha256 of the code, never the code itself
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: true }
);

// MongoDB removes expired codes on its own.
WatchPairingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.WatchPairing || mongoose.model('WatchPairing', WatchPairingSchema);
