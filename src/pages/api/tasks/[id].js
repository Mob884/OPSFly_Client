import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';
import { authMiddleware } from '@/lib/auth';

/**
 * Single handler for all task-specific operations.
 *
 * PATCH /api/tasks/[id]  body: { action: "complete" | "reopen" }
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

  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Restrict access: non-Managers can only modify/delete their own tasks
    if (decoded.role !== 'Manager' && String(task.userId) !== String(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to manage this task.' });
    }

    // ── PATCH — complete or reopen ─────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const { action } = req.body || {};

      if (action === 'complete') {
        task.status = 'completed';
        task.completedAt = new Date();
        await task.save();
        return res.json(task);
      }

      if (action === 'reopen') {
        task.status = 'open';
        task.completedAt = null;
        await task.save();
        return res.json(task);
      }

      return res.status(400).json({ error: 'Invalid action. Use "complete" or "reopen".' });
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
