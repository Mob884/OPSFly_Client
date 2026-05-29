import connectDB from '@/lib/mongodb';
import Note from '@/lib/Note';
import { authMiddleware } from '@/lib/auth';

/**
 * DELETE /api/notes/[id]  — delete a single note by ID
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const { id } = req.query;
  try {
    await connectDB();
    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    const note = await Note.findById(id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Restrict deletion: non-Managers can only delete their own notes
    if (decoded.role !== 'Manager' && String(note.userId) !== String(decoded.userId)) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to delete this note.' });
    }

    await note.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/notes/:id]', err);
    return res.status(500).json({ error: 'Delete failed' });
  }
}
