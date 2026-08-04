import mongoose from 'mongoose';

const IndustryConfigSchema = new mongoose.Schema(
  {
    industryType: {
      type: String,
      required: true,
      unique: true,
    },
    issueCategories: [
      {
        key: String, // "staffing", "cost_risk", "maintenance", "other"
        label: String, // "Staffing Issue", "Cost Risk", etc.
        icon: String, // "users", "dollar", "wrench", "info"
        color: String, // "#EF4444", "#FF8A00", "#22C55E", "#64748B"
      },
    ],
    severityLevels: [
      {
        key: String, // "high", "medium", "low"
        label: String, // "High", "Medium", "Low"
        color: String, // "#EF4444", "#FF8A00", "#22C55E"
      },
    ],
    departmentTypes: [String],
    assetCategories: [String],
    vendorCategories: [String],
    onboardingPrompts: {
      issueDetection: String,
      dailySummary: String,
      patternRecognition: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.IndustryConfig || mongoose.model('IndustryConfig', IndustryConfigSchema);
