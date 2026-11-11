import connectDB from '@/lib/mongodb';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';
import { saveCapturedNote } from '@/lib/noteCapture';

/**
 * POST /api/notes/save
 * Saves the note, then auto-creates a Task for each detected issue.
 * The pipeline itself lives in lib/noteCapture.js (shared with the Apple Watch).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    await connectDB();

    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    const access = await verifyLocationAccess(req, res, decoded);
    if (!access) return;

    const result = await saveCapturedNote({ decoded, access, body: req.body });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[POST /api/notes/save]', error);
    return res.status(500).json({ error: 'Save failed', detail: error.message });
  }
}
