import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    transcript: {
      type: String,
      required: true,
      trim: true,
    },
    rawAudio: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ['voice', 'text'],
      default: 'voice',
    },
    issues: [
      {
        type: { type: String },
        severity: String,
        quote: String,
        suggestedTask: String
      }
    ],
    analyzedAt: {
      type: Date
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

// Check if model exists to avoid OverwriteModelError in Next.js dev mode
export default mongoose.models.Note || mongoose.model('Note', noteSchema);
