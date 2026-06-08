import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';
import User from '@/lib/User';
import Notification from '@/lib/Notification';
import '@/lib/Note'; // register Note schema so Task.populate('sourceNoteId') works
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

/**
 * GET  /api/tasks         — fetch all tasks (sorted High → Medium → Low)
 * POST /api/tasks         — create a new task
 */
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const access = await verifyLocationAccess(req, res, decoded);
  if (!access) return;

  const { selectedLocationId, organizationId, user } = access;

  // ── GET all tasks ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      let query = {
        locationId: selectedLocationId
      };

      if (user.role === 'department_manager') {
        const deptUsers = await User.find({
          locationIds: selectedLocationId,
          department: user.department
        }).select('_id');
        const deptUserIds = deptUsers.map(u => u._id);
        query.$or = [
          { userId: { $in: deptUserIds } },
          { assignedTo: { $in: deptUserIds } }
        ];
      }

      const tasks = await Task.find(query)
        .populate('sourceNoteId', 'transcript createdAt')
        .populate('assignedTo', 'name email role department')
        .populate('assignedBy', 'name email role department')
        .lean();

      const order = { High: 0, Medium: 1, Low: 2 };
      tasks.sort((a, b) =>
        (order[a.priority] ?? 3) - (order[b.priority] ?? 3) ||
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      return res.status(200).json(tasks);
    } catch (err) {
      console.error('[GET /api/tasks]', err);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  // ── POST create task ───────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { title, priority = 'Medium', sourceNoteId, sourceIssueType, assignedTo } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

      const dueDate = new Date();
      dueDate.setHours(23, 59, 0, 0);

      // Validate assignment if assignedTo is provided
      let finalAssignedTo = null;
      let finalAssignedBy = null;
      if (assignedTo) {
        // Only allow owner, dm, gm, agm to assign
        if (!['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(user.role)) {
          return res.status(403).json({ error: 'Forbidden. You do not have permission to assign tasks.' });
        }
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
          return res.status(404).json({ error: 'Assigned user not found.' });
        }

        // Enforce role hierarchy check
        const assignerRole = user.role;
        const assigneeRole = assignedUser.role;
        let allowed = false;
        if (assignerRole === 'owner') allowed = true;
        else if (assignerRole === 'district_manager' && (assigneeRole === 'gm' || assigneeRole === 'district_manager')) allowed = true;
        else if ((assignerRole === 'gm' || assignerRole === 'Manager') && ['agm', 'department_manager', 'Staff'].includes(assigneeRole)) allowed = true;
        else if (assignerRole === 'agm' && ['department_manager', 'Staff'].includes(assigneeRole)) allowed = true;

        if (!allowed && assignedUser._id.toString() !== user._id.toString()) {
          return res.status(403).json({ error: `Forbidden. As a ${assignerRole.replace('_', ' ')}, you cannot assign tasks to a ${assigneeRole.replace('_', ' ')}.` });
        }

        // Owner can assign across locations (same org), others must assign at same location
        if (user.role === 'owner') {
          if (assignedUser.organizationId?.toString() !== user.organizationId?.toString()) {
            return res.status(400).json({ error: 'Assigned user must belong to your organization.' });
          }
        } else {
          const targetLocs = assignedUser.locationIds.map(locId => locId.toString());
          if (!targetLocs.includes(selectedLocationId.toString())) {
            return res.status(400).json({ error: 'Assigned user must be assigned to the current location.' });
          }
        }

        finalAssignedTo = assignedTo;
        finalAssignedBy = user._id;
      }

      const task = await Task.create({
        title: title.trim(),
        priority,
        sourceNoteId: sourceNoteId || null,
        sourceIssueType: sourceIssueType || null,
        dueDate,
        userId: decoded.userId,
        locationId: selectedLocationId,
        organizationId: organizationId,
        assignedTo: finalAssignedTo,
        assignedBy: finalAssignedBy,
      });

      // Trigger notification: task_assigned
      if (task.assignedTo) {
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

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'name email role department')
        .populate('assignedBy', 'name email role department');

      return res.status(201).json(populatedTask);
    } catch (err) {
      console.error('[POST /api/tasks]', err);
      return res.status(500).json({ error: 'Failed to create task', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
