import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';

/**
 * GET /api/auth/me
 * Returns current user's profile details.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    // 1. Authenticate Request
    const decoded = await authMiddleware(req, res);
    if (!decoded) return; // authMiddleware automatically sets 401 response

    // 2. Fetch User from DB (in case of dynamic role updates)
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        locationIds: user.locationIds,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('[Get Profile Error]', error);
    return res.status(500).json({ error: 'Failed to fetch profile', detail: error.message });
  }
}
