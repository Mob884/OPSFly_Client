import connectDB from '@/lib/mongodb';
import MorningReport from '@/lib/MorningReport';
import { requireUser } from '@/lib/apiAuth';
import { checkRole } from '@/lib/auth';
import { generateMorningReport } from '@/lib/morningReportGenerator';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * POST /api/report/morning/generate
 * Force-regenerates today's report (e.g. after a busy morning). GM+ only.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  if (!checkRole(user, ['gm', 'agm', 'district_manager', 'owner'])) {
    return res.status(403).json({ error: 'Forbidden. Only managers and above can regenerate the morning report.' });
  }

  try {
    await connectDB();
    const today = startOfDay(new Date());

    await MorningReport.deleteOne({
      organizationId: user.organizationId,
      managerId: user._id,
      reportDate: today,
    });

    const report = await generateMorningReport(user);
    return res.status(200).json(report);
  } catch (error) {
    console.error('[POST /api/report/morning/generate]', error);
    return res.status(500).json({ error: 'Failed to regenerate morning report', detail: error.message });
  }
}
