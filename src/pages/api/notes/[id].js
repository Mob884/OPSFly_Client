import connectDB from '@/lib/mongodb';
import Note from '@/lib/Note';

/**
 * DELETE /api/notes/[id]  — delete a single note by ID
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const { id } = req.query;
  try {
    await connectDB();
    const note = await Note.findByIdAndDelete(id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/notes/:id]', err);
    return res.status(500).json({ error: 'Delete failed' });
  }
}
