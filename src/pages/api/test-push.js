// Trigger rebuild
import connectDB from '@/lib/mongodb';
import { authMiddleware } from '@/lib/auth';
import { sendToToken, isFirebaseReady } from '@/lib/pushNotifications';

// POST /api/test-push
// body: { fcmToken: string, title?: string, body?: string }
//
// Sends a single test push notification directly to the given FCM token,
// bypassing the user/task/note flows. Used for QA to verify the Firebase
// Admin SDK is configured correctly on this deployment and that a real
// device token can receive a push end-to-end.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const { fcmToken, title, body } = req.body || {};
  if (!fcmToken) return res.status(400).json({ error: 'fcmToken is required' });

  const result = await sendToToken(
    fcmToken,
    title || 'OpsFly Test Notification',
    body || 'This is a test push sent from /api/test-push.',
    { type: 'test_push' }
  );

  return res.status(200).json({
    firebaseConfigured: isFirebaseReady(),
    ...result,
  });
}
