import mongoose from 'mongoose';

// One generated-and-cached morning report per manager per day.
const MorningReportSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null, // null for DM/Owner (multi-location roll-up)
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: String,
    reportDate: {
      type: Date,
      required: true,
      index: true,
    },
    findings: [
      {
        title: String,
        detail: String,
        recommendedAction: String,
        severity: { type: String, enum: ['high', 'medium', 'low'] },
        sourceManagerName: String,
        sourceTime: Date,
        sourceNoteId: mongoose.Schema.Types.ObjectId,
        priorHistory: String,
      },
    ],
    openItemsSummary: mongoose.Schema.Types.Mixed,
    whatWentRight: String,
    watchList: [String],
    rawJson: String,
    isRead: { type: Boolean, default: false },
    readAt: Date,
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

MorningReportSchema.index({ organizationId: 1, reportDate: -1 });
MorningReportSchema.index({ managerId: 1, reportDate: -1 });

export default mongoose.models.MorningReport || mongoose.model('MorningReport', MorningReportSchema);
