import mongoose from 'mongoose';

// The core restaurant identity — Phase 1 of Business DNA onboarding.
const BusinessProfileSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    // Restaurant Identity
    restaurantName: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String,
    email: String,
    website: String,
    // Operations
    cuisineType: String,
    numberOfLocations: Number,
    isIndependent: Boolean, // true = independent, false = franchise
    franchiseName: String, // if franchise
    // Hours
    operatingHours: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean },
    },
    // Team Structure
    numberOfEmployees: Number,
    numberOfManagers: Number,
    ownerInvolvedDaily: Boolean,
    generalManagerName: String,
    // Technology Stack
    posSystem: String, // "Toast" | "Square" | "Clover" | "Other"
    posSystemOther: String,
    schedulingSoftware: String,
    inventorySoftware: String,
    // Onboarding status
    onboardingCompleted: Boolean,
    onboardingStep: Number, // which step they're on (1-4)
    completedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.BusinessProfile || mongoose.model('BusinessProfile', BusinessProfileSchema);
