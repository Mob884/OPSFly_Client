import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';

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

  // ── PATCH — complete or reopen ─────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { action } = req.body || {};

    if (action === 'complete') {
      try {
        const task = await Task.findByIdAndUpdate(
          id,
          { status: 'completed', completedAt: new Date() },
          { new: true }
        );
        if (!task) return res.status(404).json({ error: 'Task not found' });
        return res.json(task);
      } catch (err) {
        console.error('[PATCH complete]', err);
        return res.status(500).json({ error: 'Failed to complete task' });
      }
    }

    if (action === 'reopen') {
      try {
        const task = await Task.findByIdAndUpdate(
          id,
          { status: 'open', completedAt: null },
          { new: true }
        );
        if (!task) return res.status(404).json({ error: 'Task not found' });
        return res.json(task);
      } catch (err) {
        console.error('[PATCH reopen]', err);
        return res.status(500).json({ error: 'Failed to reopen task' });
      }
    }

    return res.status(400).json({ error: 'Invalid action. Use "complete" or "reopen".' });
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const task = await Task.findByIdAndDelete(id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json({ success: true });
    } catch (err) {
      console.error('[DELETE task]', err);
      return res.status(500).json({ error: 'Failed to delete task' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
