import BusinessProfile from '@/lib/BusinessProfile';
import { requireUser } from '@/lib/apiAuth';

/**
 * PATCH /api/dna/onboarding/step  — body: { step: 1-5 }
 * Updates BusinessProfile.onboardingStep. step === 5 marks onboarding complete.
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const organizationId = user.organizationId;
  const { step } = req.body || {};
  if (!step || typeof step !== 'number') {
    return res.status(400).json({ error: 'step (number) is required' });
  }

  try {
    const update = { onboardingStep: step };
    if (step >= 5) {
      update.onboardingCompleted = true;
      update.completedAt = new Date();
    }

    const profile = await BusinessProfile.findOneAndUpdate(
      { organizationId },
      { $set: { ...update, organizationId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      step: profile.onboardingStep,
      completed: !!profile.onboardingCompleted,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update onboarding step', detail: error.message });
  }
}
