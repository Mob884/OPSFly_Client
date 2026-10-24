import connectDB from '@/lib/mongodb';
import WalkSession from '@/lib/WalkSession';
import { authMiddleware } from '@/lib/auth';

/**
 * PATCH /api/walk/:sessionId/end
 * Manually ends a walk session.
 */
export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  try {
    const { sessionId } = req.query;
    const session = await WalkSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Walk session not found' });

    if (session.managerId.toString() !== decoded.userId.toString()) {
      return res.status(403).json({ error: 'Forbidden. This walk session belongs to another manager.' });
    }

    if (session.status === 'active') {
      session.status = 'completed';
      session.endedAt = new Date();
      await session.save();
    }

    return res.status(200).json({
      session,
      noteCount: session.noteCount,
      endOfShiftPending: true,
    });
  } catch (error) {
    console.error('[PATCH /api/walk/:sessionId/end]', error);
    return res.status(500).json({ error: 'Failed to end walk', detail: error.message });
  }
}
