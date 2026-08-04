import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import Organization from '@/lib/Organization';
import IndustryConfig from '@/lib/IndustryConfig';
import { authMiddleware } from '@/lib/auth';

// GET /api/config — used by frontend to get dynamic categories/labels/colors.
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
    const org = await Organization.findById(user.organizationId).populate('configTemplateId');

    if (!org || !org.configTemplateId) {
      // Fall back to the default restaurant config so callers always get
      // something usable, even for an org that hasn't been migrated yet.
      const fallback = await IndustryConfig.findOne({ industryType: 'restaurant' });
      if (!fallback) return res.status(404).json({ error: 'No IndustryConfig available' });
      return res.status(200).json(fallback);
    }

    return res.status(200).json(org.configTemplateId);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch industry config', detail: error.message });
  }
}
