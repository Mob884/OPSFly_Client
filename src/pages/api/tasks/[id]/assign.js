import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';
import User from '@/lib/User';
import Notification from '@/lib/Notification';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

/**
 * PATCH /api/tasks/[id]/assign
 * Accepts: { assignedTo: userId }
 * Validates assignedTo user is in same location.
 * Only allowed by gm, agm, district_manager, owner.
 * Returns: updated task.
 */
export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Task ID is required' });

  try {
    await connectDB();
  } catch (err) {
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

    // Ensure user has access to task's location
    if (task.locationId && task.locationId.toString() !== selectedLocationId.toString()) {
      return res.status(403).json({ error: 'Forbidden. Task is in a different location.' });
    }

    // Role check: Only gm, agm, district_manager, owner
    if (!['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to assign tasks.' });
    }

    const { assignedTo } = req.body;
    if (!assignedTo) {
      // Unassign task
      task.assignedTo = null;
      task.assignedBy = null;
    } else {
      // Validate assignedTo user is in same location
      const targetUser = await User.findById(assignedTo);
      if (!targetUser) return res.status(404).json({ error: 'User to assign not found' });
      
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

    const updatedTask = await Task.findById(task._id)
      .populate('sourceNoteId', 'transcript createdAt')
      .populate('assignedTo', 'name email role department')
      .populate('assignedBy', 'name email role department');

    return res.json(updatedTask);
  } catch (error) {
    console.error('[PATCH /api/tasks/:id/assign]', error);
    return res.status(500).json({ error: 'Failed to assign task', detail: error.message });
  }
}
