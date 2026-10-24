import connectDB from '@/lib/mongodb';
import Location from '@/lib/Location';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';
import { getUserAccessibleLocationIds } from '@/lib/scopeByLocation';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId || decoded.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'GET') {
    try {
      const location = await Location.findById(id);
      if (!location) return res.status(404).json({ error: 'Location not found' });

      // Check if user has access to this location
      const accessibleIds = await getUserAccessibleLocationIds(user);
      if (!accessibleIds.includes(id.toString())) {
        return res.status(403).json({ error: 'Forbidden. You do not have access to this location.' });
      }

      return res.json(location);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch location details' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      if (user.role !== 'owner') {
        return res.status(403).json({ error: 'Forbidden. Owner only.' });
      }

      const { name, address, isActive } = req.body;
      const location = await Location.findById(id);
      if (!location) return res.status(404).json({ error: 'Location not found' });

      const updateFields = {};
      if (name) updateFields.name = name.trim();
      if (address !== undefined) updateFields.address = address.trim();
      if (isActive !== undefined) updateFields.isActive = isActive;

      // Use findByIdAndUpdate to reliably save boolean fields (avoids Mongoose change-detection issues)
      const updatedLocation = await Location.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );
      return res.json({ success: true, location: updatedLocation });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update location details', detail: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (user.role !== 'owner') {
        return res.status(403).json({ error: 'Forbidden. Owner only.' });
      }

      const location = await Location.findById(id);
      if (!location) return res.status(404).json({ error: 'Location not found' });

      // Soft delete location: use findByIdAndUpdate to avoid boolean change-detection issues
      const deletedLocation = await Location.findByIdAndUpdate(
        id,
        { $set: { deleted: true, isActive: false } },
        { new: true }
      );
      return res.json({ success: true, message: 'Location soft deleted successfully.', location: deletedLocation });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete location', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
