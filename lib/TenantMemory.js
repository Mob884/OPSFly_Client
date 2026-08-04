import mongoose from 'mongoose';

// Vault 1 — Private Operational Memory
const TenantMemorySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true, // always index for fast tenant queries
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    memoryType: {
      type: String,
      enum: ['observation', 'asset', 'vendor', 'sop', 'incident', 'lesson'],
      required: true,
    },
    content: { type: String, required: true },
    embedding: [Number], // populated in M3 by Pinecone
    metadata: {
      sourceNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' },
      sourceTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
      captureSource: String,
      tags: [String],
      assetId: mongoose.Schema.Types.ObjectId,
      vendorId: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

// compound index for fast tenant-scoped queries
TenantMemorySchema.index({ organizationId: 1, memoryType: 1 });
TenantMemorySchema.index({ organizationId: 1, locationId: 1 });

export default mongoose.models.TenantMemory || mongoose.model('TenantMemory', TenantMemorySchema);
