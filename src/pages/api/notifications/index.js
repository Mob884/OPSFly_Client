import connectDB from '@/lib/mongodb';
import Notification from '@/lib/Notification';
import { authMiddleware } from '@/lib/auth';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const userId = decoded.userId || decoded.id;

  // GET /api/notifications — fetch user's notifications
  if (req.method === 'GET') {
    try {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);
      return res.status(200).json(notifications);
    } catch (error) {
      console.error('[GET /api/notifications]', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  // PATCH /api/notifications — mark all or specific notifications as read
  if (req.method === 'PATCH') {
    try {
      const { ids } = req.body || {};
      
      let query = { userId };
      if (ids && Array.isArray(ids)) {
        query._id = { $in: ids };
      }

      await Notification.updateMany(query, { $set: { read: true } });
      
      const updated = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
      return res.status(200).json(updated);
    } catch (error) {
      console.error('[PATCH /api/notifications]', error);
      return res.status(500).json({ error: 'Failed to update notifications' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
