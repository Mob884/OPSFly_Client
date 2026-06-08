import { generateDailySummary, startOfDay } from '@/lib/summaryGenerator';
import connectDB from '@/lib/mongodb';
import DailySummary from '@/lib/DailySummary';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

/**
 * GET /api/summary/[date]
 * Fetch summary for a specific date (YYYY-MM-DD).
 * Generates it if it doesn't exist yet.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { date } = req.query;

  try {
    await connectDB();
    const decoded = await authMiddleware(req, res);
    if (!decoded) return;

    const access = await verifyLocationAccess(req, res, decoded);
    if (!access) return;

    const { selectedLocationId, user } = access;

    const allowedRoles = ['owner', 'district_manager', 'gm', 'agm', 'department_manager', 'Manager'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied. Management only.' });
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Try to find existing summary first for this location
    const existing = await DailySummary.findOne({ date: startOfDay(parsed), locationId: selectedLocationId }).lean();
    if (existing) return res.status(200).json(existing);

    // Generate if missing for this location
    const generated = await generateDailySummary(parsed, selectedLocationId);
    return res.status(200).json(generated);
  } catch (err) {
    console.error('[/api/summary/:date]', err);
    return res.status(500).json({ error: 'Failed to fetch summary', detail: err.message });
  }
}
