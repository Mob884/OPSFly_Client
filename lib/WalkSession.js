import mongoose from 'mongoose';

// Background model — invisible to the manager. Exists so the system knows
// which notes came from a Four Corner Walk.
const WalkSessionSchema = new mongoose.Schema(
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
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    managerRole: String, // "gm" | "agm" | "department_manager" etc.
    managerDepartment: String, // "Kitchen" | "FOH" — for dept managers
    walkArea: String, // "full_restaurant" | "kitchen_boh"
    shiftType: String, // "opening" | "midshift" | "closing" — auto-detected
    status: {
      type: String,
      enum: ['active', 'completed', 'timed_out'],
      default: 'active',
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    timeoutAt: Date, // auto-close after 2 hours if not ended
    noteIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Note',
      },
    ],
    noteCount: { type: Number, default: 0 },
    endOfShiftAnswers: {
      opportunity: String, // #1 Opportunity answer
      strongPoint: String, // #1 Strong Point answer
    },
    endOfShiftAnsweredAt: Date,
  },
  { timestamps: true }
);

WalkSessionSchema.index({ organizationId: 1, locationId: 1, status: 1 });
WalkSessionSchema.index({ managerId: 1, status: 1 });

export default mongoose.models.WalkSession || mongoose.model('WalkSession', WalkSessionSchema);
