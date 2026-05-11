import connectDB from '@/lib/mongodb';
import Task from '@/lib/Task';

/**
 * DELETE /api/tasks/[id]/delete
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const { id } = req.query;
  try {
    await connectDB();
    await Task.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete task' });
  }
}
