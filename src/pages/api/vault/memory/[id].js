import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import TenantMemory from '@/lib/TenantMemory';
import { authMiddleware } from '@/lib/auth';

// DELETE /api/vault/memory/:id
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  try {
    const memory = await TenantMemory.findById(req.query.id);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });

    if (memory.organizationId.toString() !== user.organizationId.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await memory.deleteOne();
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete memory', detail: error.message });
  }
}
