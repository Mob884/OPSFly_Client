import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'district_manager', 'gm', 'agm', 'department_manager', 'Manager', 'Staff'],
      default: 'Staff',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    locationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
      }
    ],
    department: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    fcmToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent Next.js double registration errors
export default mongoose.models.User || mongoose.model('User', userSchema);

