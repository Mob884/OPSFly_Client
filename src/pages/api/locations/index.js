import connectDB from '@/lib/mongodb';
import Location from '@/lib/Location';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';
import { getUserAccessibleLocationIds } from '@/lib/scopeByLocation';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  // Allow public location creation if onboarding or checking (optional),
  // but for actual endpoints, let's authenticate.
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId || decoded.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // POST /api/locations — create location (owner only)
  if (req.method === 'POST') {
    try {
      if (user.role !== 'owner' && user.role !== 'Manager') { // allow manager for initial setup/transition fallbacks
        return res.status(403).json({ error: 'Forbidden. Only owners can create locations.' });
      }

      const { name, address } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Location name is required' });
      }

      const location = await Location.create({
        organizationId: user.organizationId,
        name: name.trim(),
        address: address?.trim() || '',
      });

      // Automatically add this new location to the owner's locationIds
      user.locationIds.push(location._id);
      await user.save();

      return res.status(201).json(location);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create location', detail: error.message });
    }
  }

  // GET /api/locations — get locations for current user based on role
  if (req.method === 'GET') {
    try {
      const accessibleIds = await getUserAccessibleLocationIds(user);
      
      // Fetch all locations in org if owner, or filter by accessible IDs
      let query = { _id: { $in: accessibleIds } };
      if (user.role === 'owner') {
        query = { organizationId: user.organizationId };
      }

      const locations = await Location.find(query);
      return res.json(locations);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch locations' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
