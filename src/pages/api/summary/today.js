import { generateDailySummary } from '@/lib/summaryGenerator';

/**
 * GET  /api/summary/today  — fetch (or generate) today's summary
 * POST /api/summary/today  — force-regenerate today's summary
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const summary = await generateDailySummary(new Date());
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[/api/summary/today]', err);
    return res.status(500).json({ error: 'Failed to generate summary', detail: err.message });
  }
}
