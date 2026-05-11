import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';

/**
 * GET  /api/tasks         — fetch all tasks (sorted High → Medium → Low)
 * POST /api/tasks         — create a new task
 */
export default async function handler(req, res) {
  await connectDB();

  // ── GET all tasks ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const tasks = await Task.find()
        .populate('sourceNoteId', 'transcript createdAt')
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
      const { title, priority = 'Medium', sourceNoteId, sourceIssueType } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

      const dueDate = new Date();
      dueDate.setHours(23, 59, 0, 0);

      const task = await Task.create({
        title: title.trim(),
        priority,
        sourceNoteId: sourceNoteId || null,
        sourceIssueType: sourceIssueType || null,
        dueDate,
      });
      return res.status(201).json(task);
    } catch (err) {
      console.error('[POST /api/tasks]', err);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
