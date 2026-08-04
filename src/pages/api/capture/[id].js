import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import CaptureEvent from '@/lib/CaptureEvent';
import { authMiddleware } from '@/lib/auth';

// GET /api/capture/:id
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  try {
    const captureEvent = await CaptureEvent.findById(req.query.id);
    if (!captureEvent) return res.status(404).json({ error: 'CaptureEvent not found' });

    if (captureEvent.organizationId.toString() !== user.organizationId.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(200).json(captureEvent);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch capture event', detail: error.message });
  }
}
