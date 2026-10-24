import mongoose from 'mongoose';

// Vendor Directory — Phase 3 of Business DNA onboarding.
const VendorSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    // Vendor Identity
    name: { type: String, required: true },
    category: String, // from IndustryConfig.vendorCategories
    customCategory: String,
    // Contact
    primaryContact: String,
    phone: String,
    email: String,
    website: String,
    address: String,
    // Service Details
    serviceAreas: [String], // which locations they serve
    contractStartDate: Date,
    contractEndDate: Date,
    contractValue: Number,
    paymentTerms: String,
    // Performance
    rating: Number, // 1-5
    preferredVendor: Boolean,
    emergencyContact: Boolean, // available 24/7?
    averageResponseTime: String, // "2 hours" | "same day" | "next day"
    // Account Details
    accountNumber: String,
    notes: String,
    customFields: mongoose.Schema.Types.Mixed, // expandable
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VendorSchema.index({ organizationId: 1, category: 1 });

export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
