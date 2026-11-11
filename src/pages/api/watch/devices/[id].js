import connectDB from '@/lib/mongodb';
import WatchDevice from '@/lib/WatchDevice';
import { authMiddleware } from '@/lib/auth';

// DELETE /api/watch/devices/:id  - unpair a watch (its token stops working at once)
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;
  const device = await WatchDevice.findOneAndUpdate(
    { _id: req.query.id, userId: decoded.userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );
  if (!device) return res.status(404).json({ error: 'Watch not found' });
  return res.status(200).json({ success: true });
}
