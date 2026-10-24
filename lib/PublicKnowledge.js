import mongoose from 'mongoose';

// Vault 3 — Public Knowledge
const PublicKnowledgeSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ['manual', 'regulation', 'best_practice', 'fda', 'osha'],
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    embedding: [Number],
    industryType: { type: String, default: 'restaurant' },
    tags: [String],
    sourceUrl: String,
    publishedDate: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PublicKnowledgeSchema.index({ tags: 1, industryType: 1 });

export default mongoose.models.PublicKnowledge || mongoose.model('PublicKnowledge', PublicKnowledgeSchema);
