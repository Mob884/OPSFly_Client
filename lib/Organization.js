import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      enum: ['Restaurant', 'Hotel', 'Other'],
      default: 'Restaurant',
    },
    configTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IndustryConfig',
    },
    industryType: { type: String, default: 'restaurant' },
    vaultSettings: {
      contributeToAnonymousNetwork: { type: Boolean, default: true },
      allowPublicKnowledge: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent Next.js double registration errors
export default mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
