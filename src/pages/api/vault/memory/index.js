import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import TenantMemory from '@/lib/TenantMemory';
import { authMiddleware } from '@/lib/auth';

/**
 * GET  /api/vault/memory  — Vault 1 (Tenant Memory)
 * POST /api/vault/memory
 *
 * organizationId is ALWAYS taken from the authenticated user — NEVER trust
 * organizationId from the request body or params.
 */
export default async function handler(req, res) {
  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  if (req.method === 'POST') {
    try {
      const { content, memoryType, locationId, metadata } = req.body;
      if (!content || !memoryType) {
        return res.status(400).json({ error: 'content and memoryType are required' });
      }

      const memory = await TenantMemory.create({
        organizationId: user.organizationId,
        locationId: locationId || undefined,
        memoryType,
        content,
        metadata: metadata || {},
      });

      return res.status(201).json(memory);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create memory', detail: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { locationId, memoryType, limit = 20, skip = 0 } = req.query;

      const query = { organizationId: user.organizationId };
      if (locationId) query.locationId = locationId;
      if (memoryType) query.memoryType = memoryType;

      const [memories, total] = await Promise.all([
        TenantMemory.find(query)
          .sort({ createdAt: -1 })
          .skip(parseInt(skip, 10) || 0)
          .limit(parseInt(limit, 10) || 20),
        TenantMemory.countDocuments(query),
      ]);

      return res.status(200).json({ memories, total });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch memories', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
