import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';
import User from '@/lib/User';
import Notification from '@/lib/Notification';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

/**
 * Single handler for all task-specific operations.
 *
 * PATCH /api/tasks/[id]  body: { action: "complete" | "reopen" | "assign" }
 * DELETE /api/tasks/[id]
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Task ID is required' });

  try {
    await connectDB();
  } catch (err) {
    console.error('[DB connect]', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const access = await verifyLocationAccess(req, res, decoded);
  if (!access) return;

  const { selectedLocationId, user } = access;

  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Enforce location access
    if (task.locationId && task.locationId.toString() !== selectedLocationId.toString()) {
      return res.status(403).json({ error: 'Forbidden. Task is in a different location.' });
    }

    // Restrict access for department managers
    if (user.role === 'department_manager') {
      const isOwner = task.userId?.toString() === user._id.toString();
      const isAssigned = task.assignedTo?.toString() === user._id.toString();
      if (!isOwner && !isAssigned) {
        return res.status(403).json({ error: 'Forbidden. You do not have permission to manage this task.' });
      }
    }

    // ── PATCH — complete, reopen, or assign ─────────────────────────────────────
    if (req.method === 'PATCH') {
      const { action, assignedTo } = req.body || {};

      if (action === 'complete') {
        task.status = 'completed';
        task.completedAt = new Date();
        await task.save();

        // Trigger notification: task_completed
        try {
          const recipients = new Set();
          if (task.assignedBy) recipients.add(task.assignedBy.toString());
          if (task.userId) recipients.add(task.userId.toString());
          
          const managers = await User.find({
            locationIds: selectedLocationId,
            role: { $in: ['owner', 'gm', 'Manager'] },
            isActive: { $ne: false },
            deleted: { $ne: true }
          }).select('_id');
          managers.forEach(m => recipients.add(m._id.toString()));
          
          recipients.delete(user._id.toString());
          
          if (recipients.size > 0) {
            const notifications = Array.from(recipients).map(uid => ({
              userId: uid,
              type: 'task_completed',
              message: `${user.name} completed: ${task.title}`,
              relatedTaskId: task._id
            }));
            await Notification.insertMany(notifications);
          }
        } catch (nErr) {
          console.error('Failed to create task completion notification', nErr);
        }

        const updated = await Task.findById(task._id)
          .populate('assignedTo', 'name email role department')
          .populate('assignedBy', 'name email role department');
        return res.json(updated);
      }

      if (action === 'reopen') {
        task.status = 'open';
        task.completedAt = null;
        await task.save();
        const updated = await Task.findById(task._id)
          .populate('assignedTo', 'name email role department')
          .populate('assignedBy', 'name email role department');
        return res.json(updated);
      }

      if (action === 'assign') {
        if (!['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(user.role)) {
          return res.status(403).json({ error: 'Forbidden. You do not have permission to assign tasks.' });
        }
        if (!assignedTo) {
          task.assignedTo = null;
          task.assignedBy = null;
        } else {
          const targetUser = await User.findById(assignedTo);
          if (!targetUser) {
            return res.status(404).json({ error: 'Assigned user not found.' });
          }

          // Enforce role hierarchy check
          const assignerRole = user.role;
          const assigneeRole = targetUser.role;
          let allowed = false;
          if (assignerRole === 'owner') allowed = true;
          else if (assignerRole === 'district_manager' && (assigneeRole === 'gm' || assigneeRole === 'district_manager')) allowed = true;
          else if ((assignerRole === 'gm' || assignerRole === 'Manager') && ['agm', 'department_manager', 'Staff'].includes(assigneeRole)) allowed = true;
          else if (assignerRole === 'agm' && ['department_manager', 'Staff'].includes(assigneeRole)) allowed = true;

          if (!allowed && targetUser._id.toString() !== user._id.toString()) {
            return res.status(403).json({ error: `Forbidden. As a ${assignerRole.replace('_', ' ')}, you cannot assign tasks to a ${assigneeRole.replace('_', ' ')}.` });
          }

          // Owner can assign across locations (same org), others must assign at same location
          if (user.role === 'owner') {
            if (targetUser.organizationId?.toString() !== user.organizationId?.toString()) {
              return res.status(400).json({ error: 'Assigned user must belong to your organization.' });
            }
          } else {
            const targetLocs = targetUser.locationIds.map(locId => locId.toString());
            if (!targetLocs.includes(selectedLocationId.toString())) {
              return res.status(400).json({ error: 'Assigned user must be assigned to the current location.' });
            }
          }

          task.assignedTo = targetUser._id;
          task.assignedBy = user._id;
        }
        await task.save();

        if (assignedTo && task.assignedTo) {
          try {
            await Notification.create({
              userId: task.assignedTo,
              type: 'task_assigned',
              message: `New task assigned: ${task.title}`,
              relatedTaskId: task._id
            });
          } catch (nErr) {
            console.error('Failed to create assignment notification', nErr);
          }
        }

        const updated = await Task.findById(task._id)
          .populate('assignedTo', 'name email role department')
          .populate('assignedBy', 'name email role department');
        return res.json(updated);
      }

      return res.status(400).json({ error: 'Invalid action. Use "complete", "reopen", or "assign".' });
    }

    // ── DELETE ─────────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      await task.deleteOne();
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[task operation error]', err);
    return res.status(500).json({ error: 'Failed to process task operation' });
  }
}
