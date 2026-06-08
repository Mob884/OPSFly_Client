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
  },
  {
    timestamps: true,
  }
);

// Prevent Next.js double registration errors
export default mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
