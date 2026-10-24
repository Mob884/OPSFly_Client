import connectDB from '@/lib/mongodb';
import Note from '@/lib/Note';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

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

    const access = await verifyLocationAccess(req, res, decoded);
    if (!access) return;

    const { selectedLocationId, user } = access;

    const note = await Note.findById(id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Enforce location matching
    if (note.locationId && note.locationId.toString() !== selectedLocationId.toString()) {
      return res.status(403).json({ error: 'Forbidden. Note belongs to a different location.' });
    }

    // Restrict deletion: only creator OR owner, district_manager, gm, agm
    const isCreator = note.userId?.toString() === user._id.toString();
    const isUpperManagement = ['owner', 'district_manager', 'gm', 'agm', 'Manager'].includes(user.role);
    if (!isCreator && !isUpperManagement) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to delete this note.' });
    }

    await note.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/notes/:id]', err);
    return res.status(500).json({ error: 'Delete failed' });
  }
}
