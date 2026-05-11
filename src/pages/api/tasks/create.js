import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';

/**
 * POST /api/tasks
 * Creates a new task (manual or auto-created from note).
 * Body: { title, priority, sourceNoteId?, sourceIssueType? }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await connectDB();
    const { title, priority = 'Medium', sourceNoteId, sourceIssueType } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Default dueDate = end of today (11:59 PM)
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
