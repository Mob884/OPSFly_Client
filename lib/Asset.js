import mongoose from 'mongoose';

// Digital Asset Register — Phase 2 of Business DNA onboarding.
const AssetSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      index: true,
    },
    // Asset Identity
    name: { type: String, required: true },
    category: String, // from IndustryConfig.assetCategories
    customCategory: String, // if category is "Other"
    // Equipment Details
    manufacturer: String,
    model: String,
    serialNumber: String,
    purchaseYear: Number,
    purchasePrice: Number,
    // Service History
    lastServiceDate: Date,
    nextServiceDue: Date,
    serviceIntervalDays: Number,
    warrantyExpiry: Date,
    // Location within restaurant
    physicalLocation: String, // "Kitchen", "Walk-in", "Bar", "Front"
    // Vendor Link
    preferredVendorId: mongoose.Schema.Types.ObjectId,
    // Photos
    photoFileKeys: [String], // S3 keys
    // Additional flexible info
    notes: String,
    customFields: mongoose.Schema.Types.Mixed, // expandable key-value
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AssetSchema.index({ organizationId: 1, category: 1 });
AssetSchema.index({ organizationId: 1, locationId: 1 });

export default mongoose.models.Asset || mongoose.model('Asset', AssetSchema);
