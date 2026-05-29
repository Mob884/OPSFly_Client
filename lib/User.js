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
      enum: ['Manager', 'Staff'],
      default: 'Staff',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent Next.js double registration errors
export default mongoose.models.User || mongoose.model('User', userSchema);
