import mongoose from 'mongoose';

// Device-agnostic ingestion pipeline
const CaptureEventSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    locationId: mongoose.Schema.Types.ObjectId,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    deviceType: {
      type: String,
      enum: ['mobile_ios', 'mobile_android', 'web', 'apple_watch', 'wearable'],
      required: true,
    },
    captureType: {
      type: String,
      enum: ['voice', 'text', 'photo', 'combined'],
      required: true,
    },
    rawPayload: {
      audioFileKey: String,
      textContent: String,
      photoFileKeys: [String],
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'transcribing', 'analyzing', 'complete', 'failed'],
      default: 'pending',
    },
    resultNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' },
    capturedAt: { type: Date, default: Date.now },
    processedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.CaptureEvent || mongoose.model('CaptureEvent', CaptureEventSchema);
