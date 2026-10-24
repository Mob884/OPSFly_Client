import connectDB from '@/lib/mongodb';
import MorningReport from '@/lib/MorningReport';
import { requireUser } from '@/lib/apiAuth';
import { generateMorningReport } from '@/lib/morningReportGenerator';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/report/morning
 * Returns today's cached report for this manager, generating it on first
 * request of the day. organizationId/managerId always come from the JWT.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    await connectDB();
    const today = startOfDay(new Date());

    let report = await MorningReport.findOne({
      organizationId: user.organizationId,
      managerId: user._id,
      reportDate: today,
    });

    if (!report) {
      report = await generateMorningReport(user);
    }

    if (!report.isRead) {
      report.isRead = true;
      report.readAt = new Date();
      await report.save();
    }

    return res.status(200).json(report);
  } catch (error) {
    console.error('[GET /api/report/morning]', error);
    return res.status(500).json({ error: 'Failed to load morning report', detail: error.message });
  }
}
