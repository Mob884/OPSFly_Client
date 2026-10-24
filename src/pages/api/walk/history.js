import connectDB from '@/lib/mongodb';
import WalkSession from '@/lib/WalkSession';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

const ALLOWED_ROLES = ['owner', 'district_manager', 'gm', 'agm', 'Manager'];

/**
 * GET /api/walk/history
 * Returns walk session history for this location. GM+ only.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const access = await verifyLocationAccess(req, res, decoded);
  if (!access) return;

  const { selectedLocationId, organizationId, user } = access;

  if (!ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden. Manager access required.' });
  }

  try {
    const { limit = 10, skip = 0 } = req.query;

    const sessions = await WalkSession.find({ organizationId, locationId: selectedLocationId })
      .sort({ startedAt: -1 })
      .skip(parseInt(skip, 10) || 0)
      .limit(parseInt(limit, 10) || 10);

    return res.status(200).json(sessions);
  } catch (error) {
    console.error('[GET /api/walk/history]', error);
    return res.status(500).json({ error: 'Failed to fetch walk history', detail: error.message });
  }
}
