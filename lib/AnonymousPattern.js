import mongoose from 'mongoose';

// Vault 2 — Anonymous Intelligence
// CRITICAL: NO organizationId field — intentionally anonymous
const AnonymousPatternSchema = new mongoose.Schema(
  {
    // NO organizationId — this is intentional and must never be added
    industryType: { type: String, required: true },
    patternType: {
      type: String,
      enum: ['equipment_failure', 'staffing', 'maintenance', 'cost', 'safety'],
      required: true,
    },
    patternText: { type: String, required: true },
    embedding: [Number],
    frequency: { type: Number, default: 1 },
    climateZone: String,
    contributingOrgCount: { type: Number, default: 1 },
    metadata: {
      equipmentCategory: String,
      seasonality: String,
      avgResolutionDays: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.models.AnonymousPattern || mongoose.model('AnonymousPattern', AnonymousPatternSchema);
