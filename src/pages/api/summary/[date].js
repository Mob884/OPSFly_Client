import { generateDailySummary, startOfDay } from '@/lib/summaryGenerator';
import connectDB from '@/lib/mongodb';
import DailySummary from '@/lib/DailySummary';

/**
 * GET /api/summary/[date]
 * Fetch summary for a specific date (YYYY-MM-DD).
 * Generates it if it doesn't exist yet.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { date } = req.query;

  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    await connectDB();

    // Try to find existing summary first
    const existing = await DailySummary.findOne({ date: startOfDay(parsed) }).lean();
    if (existing) return res.status(200).json(existing);

    // Generate if missing
    const generated = await generateDailySummary(parsed);
    return res.status(200).json(generated);
  } catch (err) {
    console.error('[/api/summary/:date]', err);
    return res.status(500).json({ error: 'Failed to fetch summary', detail: err.message });
  }
}
