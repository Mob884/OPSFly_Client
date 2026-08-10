import BusinessProfile from '@/lib/BusinessProfile';
import { requireUser } from '@/lib/apiAuth';
import { recordDNAEntry } from '@/lib/businessDNA';

/**
 * GET  /api/dna/profile  — returns this org's BusinessProfile, or { exists: false }.
 * POST /api/dna/profile  — create/update (upsert) this org's BusinessProfile.
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const organizationId = user.organizationId;

  if (req.method === 'GET') {
    try {
      const profile = await BusinessProfile.findOne({ organizationId });
      if (!profile) return res.status(200).json({ exists: false });
      return res.status(200).json(profile);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch profile', detail: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      // organizationId always from the token; strip any client-supplied value.
      const { organizationId: _ignore, _id, ...data } = req.body || {};

      const profile = await BusinessProfile.findOneAndUpdate(
        { organizationId },
        { $set: { ...data, organizationId } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      // Mirror the profile into Business DNA (+ Vault 1).
      const summary = [
        profile.restaurantName,
        profile.cuisineType && `${profile.cuisineType} cuisine`,
        [profile.city, profile.state].filter(Boolean).join(', '),
        profile.numberOfEmployees != null && `${profile.numberOfEmployees} employees`,
        profile.posSystem && `POS: ${profile.posSystem}`,
      ].filter(Boolean).join('. ');

      await recordDNAEntry({
        organizationId,
        locationId: profile.locationId,
        entryType: 'profile',
        title: profile.restaurantName || 'Restaurant profile',
        content: summary || 'Restaurant profile saved.',
        sourceType: 'onboarding',
        sourceId: profile._id,
        tags: ['profile'],
      });

      return res.status(200).json(profile);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save profile', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
