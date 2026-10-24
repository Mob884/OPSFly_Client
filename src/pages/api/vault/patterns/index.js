import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import AnonymousPattern from '@/lib/AnonymousPattern';
import { authMiddleware } from '@/lib/auth';

/**
 * GET  /api/vault/patterns  — Vault 2 (Anonymous Intelligence), no org scoping.
 * POST /api/vault/patterns  — internal use only (M4), no direct client access yet.
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
      const { industryType = 'restaurant', patternType, limit = 10 } = req.query;

      const query = { industryType };
      if (patternType) query.patternType = patternType;

      const patterns = await AnonymousPattern.find(query)
        .sort({ frequency: -1 })
        .limit(parseInt(limit, 10) || 10);

      return res.status(200).json(patterns);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch patterns', detail: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      if (req.body && req.body.organizationId) {
        return res.status(400).json({ error: 'organizationId must never be present on an AnonymousPattern' });
      }

      const { industryType, patternType, patternText, climateZone, metadata } = req.body;
      if (!industryType || !patternType || !patternText) {
        return res.status(400).json({ error: 'industryType, patternType and patternText are required' });
      }

      const pattern = await AnonymousPattern.create({
        industryType,
        patternType,
        patternText,
        climateZone,
        metadata: metadata || {},
      });

      return res.status(201).json(pattern);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create pattern', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
