import mongoose from 'mongoose';

// Structured observation → action → resolution chain. Source record is
// always preserved, never deleted.
const CorrectiveActionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    locationId: mongoose.Schema.Types.ObjectId,
    // Source — always preserved, never deleted
    sourceNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: true,
    },
    sourceTaskId: mongoose.Schema.Types.ObjectId,
    sourceQuote: String, // exact quote from the original note
    sourceTimestamp: Date, // when original observation was made
    sourceManagerId: mongoose.Schema.Types.ObjectId,
    // Links to DNA
    assetId: mongoose.Schema.Types.ObjectId, // equipment involved
    vendorId: mongoose.Schema.Types.ObjectId, // vendor called
    // Corrective chain
    status: {
      type: String,
      enum: ['open', 'action_taken', 'resolved', 'held', 'repeat'],
      default: 'open',
    },
    actionTaken: String, // what was done
    actionTakenAt: Date,
    actionTakenById: mongoose.Schema.Types.ObjectId,
    resolvedAt: Date,
    resolvedById: mongoose.Schema.Types.ObjectId,
    resolutionNote: String, // how it was resolved
    // Outcome follow-up
    followUpAt: Date, // when to ask "still fixed?"
    followUpAsked: Boolean,
    followUpAnswer: String, // "yes_fixed" | "no_repeat"
    followUpAnsweredAt: Date,
    // If repeat — link to prior failed fix
    priorCorrectiveActionId: mongoose.Schema.Types.ObjectId,
    isRepeat: { type: Boolean, default: false },
    repeatCount: { type: Number, default: 0 },
    // Retention — incidents kept longer
    isIncident: { type: Boolean, default: false },
    retentionUntil: Date, // null = standard, set = extended retention
    // History preserved
    history: [
      {
        action: String, // "opened" | "action_taken" | "resolved" | "follow_up_asked" | "repeat_detected"
        performedById: mongoose.Schema.Types.ObjectId,
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

CorrectiveActionSchema.index({ organizationId: 1, status: 1 });
CorrectiveActionSchema.index({ organizationId: 1, assetId: 1 });
CorrectiveActionSchema.index({ sourceNoteId: 1 });

export default mongoose.models.CorrectiveAction || mongoose.model('CorrectiveAction', CorrectiveActionSchema);
