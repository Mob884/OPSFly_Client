import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';

/**
 * GET /api/tasks
 * Returns all tasks sorted: High → Medium → Low, then by createdAt desc.
 * Populates a short transcript preview from the source note.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await connectDB();
    const tasks = await Task.find()
      .populate('sourceNoteId', 'transcript createdAt')
      .lean();

    // Sort by priority order then createdAt
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    tasks.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.status(200).json(tasks);
  } catch (err) {
    console.error('[GET /api/tasks]', err);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}
