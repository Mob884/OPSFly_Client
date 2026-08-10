import BusinessProfile from '@/lib/BusinessProfile';
import Asset from '@/lib/Asset';
import Vendor from '@/lib/Vendor';
import BusinessDocument from '@/lib/BusinessDocument';
import { requireUser } from '@/lib/apiAuth';

/**
 * GET /api/dna/onboarding/status — onboarding progress summary for this org.
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const organizationId = user.organizationId;

  try {
    const [profile, assetsCount, vendorsCount, documentsCount] = await Promise.all([
      BusinessProfile.findOne({ organizationId }),
      Asset.countDocuments({ organizationId, isActive: { $ne: false } }),
      Vendor.countDocuments({ organizationId, isActive: { $ne: false } }),
      BusinessDocument.countDocuments({ organizationId, isActive: { $ne: false } }),
    ]);

    const profileComplete = !!(profile && profile.restaurantName);

    return res.status(200).json({
      step: profile?.onboardingStep || 1,
      completed: !!profile?.onboardingCompleted,
      profileComplete,
      assetsCount,
      vendorsCount,
      documentsCount,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch onboarding status', detail: error.message });
  }
}
