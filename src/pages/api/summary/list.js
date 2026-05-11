import connectDB from '@/lib/mongodb';
import DailySummary from '@/lib/DailySummary';

/**
 * GET /api/summary/list
 * Returns all dates that have summaries, newest first.
 * Each item: { _id, date, totalIssues, totalTasks, completedTasks }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await connectDB();
    const summaries = await DailySummary.find()
      .select('date totalIssues totalTasks completedTasks generatedAt')
      .sort({ date: -1 })
      .lean();
    return res.status(200).json(summaries);
  } catch (err) {
    console.error('[/api/summary/list]', err);
    return res.status(500).json({ error: 'Failed to fetch summaries' });
  }
}
