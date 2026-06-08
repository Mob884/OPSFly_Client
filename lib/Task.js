import mongoose from 'mongoose';

/**
 * Task — M3 core model.
 * Tasks are auto-created from AI-detected issues when a note is confirmed & saved.
 * They can also be added manually from the Tasks screen.
 *
 * // M4: aggregate tasks for daily summary
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['open', 'completed'],
      default: 'open',
    },
    sourceNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      default: null,
    },
    sourceIssueType: {
      type: String,
      default: null,
    },
    dueDate: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setHours(23, 59, 0, 0);
        return d;
      },
    },
    completedAt: {
      type: Date,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
