import connectDB from '@/lib/mongodb';
import Organization from '@/lib/Organization';
import { authMiddleware } from '@/lib/auth';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }

  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  if (req.method === 'GET') {
    try {
      const org = await Organization.findById(id);
      if (!org) return res.status(404).json({ error: 'Organization not found' });
      
      // Ensure user belongs to this organization
      if (decoded.role !== 'owner' && decoded.organizationId?.toString() !== id.toString()) {
        // We will fetch full user document to verify
        const User = (await import('@/lib/User')).default;
        const user = await User.findById(decoded.userId || decoded.id);
        if (!user || user.organizationId?.toString() !== id.toString()) {
          return res.status(403).json({ error: 'Forbidden. You do not belong to this organization.' });
        }
      }

      return res.json(org);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch organization details' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      if (decoded.role !== 'owner') {
        return res.status(403).json({ error: 'Forbidden. Owner only.' });
      }

      const { name, industry } = req.body;
      const org = await Organization.findById(id);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      if (name) org.name = name.trim();
      if (industry) org.industry = industry;

      await org.save();
      return res.json({ success: true, organization: org });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update organization details', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
