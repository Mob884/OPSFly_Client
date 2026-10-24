import connectDB from '@/lib/mongodb';
import MorningReport from '@/lib/MorningReport';
import { requireUser } from '@/lib/apiAuth';

/**
 * GET /api/report/morning/history?limit=7
 * Returns this manager's most recent morning reports, newest first.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    await connectDB();
    const limit = Math.min(parseInt(req.query.limit, 10) || 7, 30);

    const reports = await MorningReport.find({
      organizationId: user.organizationId,
      managerId: user._id,
    })
      .sort({ reportDate: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ reports });
  } catch (error) {
    console.error('[GET /api/report/morning/history]', error);
    return res.status(500).json({ error: 'Failed to load report history', detail: error.message });
  }
}
