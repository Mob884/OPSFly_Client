import { requireUser } from '@/lib/apiAuth';
import { search } from '@/lib/searchService';

/**
 * GET /api/search?q=searchText&type=all|note|asset|vendor|corrective&limit=10
 * organizationId is always taken from the JWT — never the query string.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { q, type = 'all', limit = 10 } = req.query;
    if (!q?.trim()) return res.status(400).json({ error: 'q is required' });

    const results = await search(user.organizationId, q, type, Math.min(parseInt(limit, 10) || 10, 50));
    return res.status(200).json(results);
  } catch (error) {
    console.error('[GET /api/search]', error);
    return res.status(500).json({ error: 'Search failed', detail: error.message });
  }
}
