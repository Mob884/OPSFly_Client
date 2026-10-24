import mongoose from 'mongoose';

// Document Uploads — Phase 4 of Business DNA onboarding.
const BusinessDocumentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    locationId: mongoose.Schema.Types.ObjectId,
    // Document Info
    title: { type: String, required: true },
    documentType: String, // from predefined list
    customType: String,
    description: String,
    // File
    fileKey: String, // S3 key
    fileName: String,
    mimeType: String,
    fileSize: Number,
    // Status
    isActive: { type: Boolean, default: true },
    expiryDate: Date, // for things like health inspection
    tags: [String],
    uploadedBy: mongoose.Schema.Types.ObjectId,
    // AI Analysis (populated in M3)
    aiSummary: String,
    aiKeyPoints: [String],
  },
  { timestamps: true }
);

BusinessDocumentSchema.index({ organizationId: 1, documentType: 1 });

export default mongoose.models.BusinessDocument || mongoose.model('BusinessDocument', BusinessDocumentSchema);
