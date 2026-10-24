import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  try {
    const { token } = req.body;
    if (token === undefined) return res.status(400).json({ error: 'Token is required' });

    // token === null clears the stored FCM token (used on sign out so the
    // device stops receiving pushes for a session that's no longer active).
    await User.findByIdAndUpdate(decoded.userId || decoded.id, { fcmToken: token || null });

    return res.status(200).json({ success: true, message: token ? 'FCM token saved successfully' : 'FCM token cleared' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save FCM token', detail: error.message });
  }
}
