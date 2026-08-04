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
        suggestedTask: String,
        categoryKey: String,   // "staffing", "cost_risk", "maintenance"
        severityKey: String    // "high", "medium", "low"
      }
    ],
    analyzedAt: {
      type: Date
    },
    mediaFiles: [
      {
        fileKey: String,
        fileType: { type: String, enum: ['image', 'audio', 'document'] },
        mimeType: String,
        uploadedAt: Date,
        aiAnalysis: String,   // populated in M3
        s3Url: String
      }
    ],
    captureSource: {
      type: String,
      enum: ['mobile_ios', 'mobile_android', 'web', 'apple_watch', 'wearable'],
      default: 'web'
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
