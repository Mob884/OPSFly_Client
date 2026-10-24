import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';
import { getUserAccessibleLocationIds } from '@/lib/scopeByLocation';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  try {
    const user = await User.findById(decoded.userId || decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let query = { organizationId: user.organizationId };

    if (user.role !== 'owner') {
      const accessibleLocationIds = await getUserAccessibleLocationIds(user);
      query.locationIds = { $in: accessibleLocationIds };
    }

    const users = await User.find(query).select('-password');
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch users', detail: error.message });
  }
}
