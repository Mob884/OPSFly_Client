import connectDB from '@/lib/mongodb';
import WalkSession from '@/lib/WalkSession';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

/**
 * GET /api/walk/active
 * Returns the current manager's active walk session at their current
 * location, if one exists. Enforces the 2-hour timeout on read.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const access = await verifyLocationAccess(req, res, decoded);
  if (!access) return;

  const { selectedLocationId, user } = access;

  try {
    let session = await WalkSession.findOne({
      managerId: user._id,
      locationId: selectedLocationId,
      status: 'active',
    });

    if (session && session.timeoutAt && session.timeoutAt < new Date()) {
      session.status = 'timed_out';
      session.endedAt = session.timeoutAt;
      await session.save();
      session = null;
    }

    return res.status(200).json(session || null);
  } catch (error) {
    console.error('[GET /api/walk/active]', error);
    return res.status(500).json({ error: 'Failed to fetch active walk', detail: error.message });
  }
}
