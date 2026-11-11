import mongoose from 'mongoose';

// M5: a paired Apple Watch. The watch token carries only `jti`; revoking the
// device here cuts the token off immediately.
const WatchDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, default: 'Apple Watch' },
    jti: { type: String, required: true, unique: true },
    lastUsedAt: Date,
    revokedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.WatchDevice || mongoose.model('WatchDevice', WatchDeviceSchema);
