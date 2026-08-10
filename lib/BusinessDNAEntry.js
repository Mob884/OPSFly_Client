import mongoose from 'mongoose';

// CRITICAL MODEL — flexible, expandable knowledge store.
// This is what makes Business DNA live and grow forever. There is no fixed
// schema for the knowledge itself: `content` is free text, `tags` and
// `customFields` (Mixed) let each entry carry whatever structure it needs.
const BusinessDNAEntrySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    locationId: mongoose.Schema.Types.ObjectId,
    // Entry Classification
    entryType: {
      type: String,
      enum: [
        'profile', // restaurant profile info
        'asset', // equipment
        'vendor', // supplier/service provider
        'document', // SOP, manual, checklist
        'building', // physical building info
        'utility', // utility shutoffs, panels
        'emergency', // emergency contacts, procedures
        'maintenance', // maintenance history
        'observation', // from voice notes
        'lesson', // lessons learned
        'procedure', // operating procedures
        'custom', // anything else
      ],
      required: true,
    },
    // The actual knowledge — flexible
    title: String,
    content: { type: String, required: true },
    // Source of this knowledge
    sourceType: String, // "onboarding" | "voice_note" | "manual" | "task"
    sourceId: mongoose.Schema.Types.ObjectId,
    // Links to structured data
    assetId: mongoose.Schema.Types.ObjectId,
    vendorId: mongoose.Schema.Types.ObjectId,
    documentId: mongoose.Schema.Types.ObjectId,
    // Searchable metadata
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed,
    // Vector embedding — populated in M3
    embedding: [Number],
    // Visibility
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for fast retrieval
BusinessDNAEntrySchema.index({ organizationId: 1, entryType: 1 });
BusinessDNAEntrySchema.index({ organizationId: 1, locationId: 1 });
BusinessDNAEntrySchema.index({ organizationId: 1, tags: 1 });

export default mongoose.models.BusinessDNAEntry || mongoose.model('BusinessDNAEntry', BusinessDNAEntrySchema);
