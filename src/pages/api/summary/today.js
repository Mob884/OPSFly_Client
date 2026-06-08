import { generateDailySummary } from '@/lib/summaryGenerator';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

/**
 * GET  /api/summary/today  — fetch (or generate) today's summary
 * POST /api/summary/today  — force-regenerate today's summary
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    const access = await verifyLocationAccess(req, res, decoded);
    if (!access) return;

    const { selectedLocationId, user } = access;

    // Allowed for all management roles
    const allowedRoles = ['owner', 'district_manager', 'gm', 'agm', 'department_manager', 'Manager'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied. Management only.' });
    }

    const summary = await generateDailySummary(new Date(), selectedLocationId);
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[/api/summary/today]', err);
    return res.status(500).json({ error: 'Failed to generate summary', detail: err.message });
  }
}
