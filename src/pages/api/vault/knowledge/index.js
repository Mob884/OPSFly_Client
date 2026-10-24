import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import PublicKnowledge from '@/lib/PublicKnowledge';
import { authMiddleware } from '@/lib/auth';

/**
 * GET  /api/vault/knowledge  — Vault 3 (Public Knowledge), no org scoping.
 * POST /api/vault/knowledge  — admin/seeding only.
 *
 * NOTE: this codebase has no dedicated "admin" role (see lib/User.js role
 * enum) — "owner" is treated as the admin-equivalent role for this endpoint.
 */
export default async function handler(req, res) {
  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  if (req.method === 'GET') {
    try {
      const { tags, sourceType, industryType = 'restaurant', limit = 10 } = req.query;

      const query = { industryType, isActive: true };
      if (sourceType) query.sourceType = sourceType;
      if (tags) {
        const tagList = Array.isArray(tags) ? tags : tags.split(',');
        query.tags = { $in: tagList };
      }

      const knowledge = await PublicKnowledge.find(query)
        .sort({ publishedDate: -1 })
        .limit(parseInt(limit, 10) || 10);

      return res.status(200).json(knowledge);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch public knowledge', detail: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      if (user.role !== 'owner') {
        return res.status(403).json({ error: 'Forbidden. Admin only.' });
      }

      const { sourceType, title, content, industryType, tags, sourceUrl, publishedDate } = req.body;
      if (!sourceType || !title || !content) {
        return res.status(400).json({ error: 'sourceType, title and content are required' });
      }

      const knowledge = await PublicKnowledge.create({
        sourceType,
        title,
        content,
        industryType: industryType || 'restaurant',
        tags: tags || [],
        sourceUrl,
        publishedDate,
      });

      return res.status(201).json(knowledge);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create public knowledge', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
