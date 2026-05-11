import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';

/**
 * PATCH /api/tasks/[id]/complete  → mark as completed
 * PATCH /api/tasks/[id]/reopen   → reopen a completed task
 * DELETE /api/tasks/[id]         → delete a task
 */
export default async function handler(req, res) {
  const { id, action } = req.query;
  await connectDB();

  // ── COMPLETE ──────────────────────────────────────────────────────────────
  if (req.method === 'PATCH' && action === 'complete') {
    try {
      const task = await Task.findByIdAndUpdate(
        id,
        { status: 'completed', completedAt: new Date() },
        { new: true }
      );
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(task);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to complete task' });
    }
  }

  // ── REOPEN ────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH' && action === 'reopen') {
    try {
      const task = await Task.findByIdAndUpdate(
        id,
        { status: 'open', completedAt: null },
        { new: true }
      );
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(task);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reopen task' });
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const task = await Task.findByIdAndDelete(id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete task' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
