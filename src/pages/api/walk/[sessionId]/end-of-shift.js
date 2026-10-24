import connectDB from '@/lib/mongodb';
import WalkSession from '@/lib/WalkSession';
import { authMiddleware } from '@/lib/auth';
import { generateShiftHandover } from '@/lib/handoverGenerator';

/**
 * POST /api/walk/:sessionId/end-of-shift
 * Records end-of-shift answers and triggers handover generation for the
 * next manager. Handover generation runs before responding — Vercel's
 * serverless functions don't support reliable fire-and-forget background
 * work, so a "best effort, don't fail the primary save" pattern is used
 * instead (same as the TenantMemory/BusinessDNAEntry mirrors elsewhere).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  try {
    const { sessionId } = req.query;
    const { opportunity, strongPoint } = req.body || {};

    const session = await WalkSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Walk session not found' });

    if (session.managerId.toString() !== decoded.userId.toString()) {
      return res.status(403).json({ error: 'Forbidden. This walk session belongs to another manager.' });
    }

    session.endOfShiftAnswers = { opportunity, strongPoint };
    session.endOfShiftAnsweredAt = new Date();
    if (session.status === 'active') {
      session.status = 'completed';
      session.endedAt = new Date();
    }
    await session.save();

    try {
      await generateShiftHandover(session.locationId, session.organizationId, session._id);
    } catch (e) {
      console.error('[end-of-shift] Handover generation failed:', e.message);
    }

    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('[POST /api/walk/:sessionId/end-of-shift]', error);
    return res.status(500).json({ error: 'Failed to save end-of-shift answers', detail: error.message });
  }
}
