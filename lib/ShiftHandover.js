import mongoose from 'mongoose';

// Auto-drafted recap for the incoming manager.
const ShiftHandoverSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    generatedAt: { type: Date, default: Date.now },
    generatedForManagerId: mongoose.Schema.Types.ObjectId,
    previousWalkSessionId: mongoose.Schema.Types.ObjectId,
    // Handover content (AI generated)
    openItems: [
      {
        description: String,
        severity: String, // "high" | "medium" | "low"
        openSince: Date,
        sourceNoteId: mongoose.Schema.Types.ObjectId,
        correctiveActionId: mongoose.Schema.Types.ObjectId,
      },
    ],
    watchItems: [
      {
        description: String,
        reason: String, // why to watch this
      },
    ],
    changedLastShift: [
      {
        description: String,
      },
    ],
    lastShiftAnswers: {
      opportunity: String, // #1 Opportunity from last shift
      strongPoint: String, // #1 Strong Point from last shift
    },
    rawSummary: String, // full AI generated text
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);

ShiftHandoverSchema.index({ organizationId: 1, locationId: 1 });

export default mongoose.models.ShiftHandover || mongoose.model('ShiftHandover', ShiftHandoverSchema);
