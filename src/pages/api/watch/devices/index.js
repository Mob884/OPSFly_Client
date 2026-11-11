import connectDB from '@/lib/mongodb';
import WatchDevice from '@/lib/WatchDevice';
import { authMiddleware } from '@/lib/auth';

// GET /api/watch/devices  - the signed-in user's paired watches
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;
  const devices = await WatchDevice.find({ userId: decoded.userId, revokedAt: { $exists: false } })
    .select('name createdAt lastUsedAt locationId')
    .sort({ createdAt: -1 })
    .lean();
  return res.status(200).json(devices);
}
