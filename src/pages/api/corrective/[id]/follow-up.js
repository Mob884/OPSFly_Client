import CorrectiveAction from '@/lib/CorrectiveAction';
import TenantMemory from '@/lib/TenantMemory';
import { requireUser } from '@/lib/apiAuth';

/**
 * PATCH /api/corrective/:id/follow-up
 * Body: { answer } — "yes_fixed" | "no_repeat"
 *
 * If the fix didn't hold ("no_repeat"), this action is marked "repeat" and
 * a brand-new CorrectiveAction is opened, linked back to this one — so the
 * failed-fix history is never overwritten, only extended.
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id } = req.query;
    const action = await CorrectiveAction.findById(id);
    if (!action) return res.status(404).json({ error: 'Corrective action not found' });
    if (action.organizationId.toString() !== user.organizationId.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { answer } = req.body || {};
    if (!['yes_fixed', 'no_repeat'].includes(answer)) {
      return res.status(400).json({ error: 'answer must be "yes_fixed" or "no_repeat"' });
    }

    action.followUpAnswer = answer;
    action.followUpAnsweredAt = new Date();
    action.followUpAsked = true;

    let newAction = null;
    if (answer === 'no_repeat') {
      action.status = 'repeat';
      action.isRepeat = true;
      action.history.push({ action: 'repeat_detected', performedById: user._id, timestamp: new Date() });

      newAction = await CorrectiveAction.create({
        organizationId: action.organizationId,
        locationId: action.locationId,
        sourceNoteId: action.sourceNoteId,
        sourceQuote: action.sourceQuote,
        sourceTimestamp: new Date(),
        sourceManagerId: user._id,
        assetId: action.assetId,
        vendorId: action.vendorId,
        status: 'open',
        isIncident: action.isIncident,
        retentionUntil: action.retentionUntil,
        isRepeat: true,
        priorCorrectiveActionId: action._id,
        repeatCount: (action.repeatCount || 0) + 1,
        history: [{ action: 'opened', performedById: user._id, note: 'Re-opened: issue returned after being marked resolved.', timestamp: new Date() }],
      });

      try {
        await TenantMemory.create({
          organizationId: action.organizationId,
          locationId: action.locationId,
          memoryType: 'incident',
          content: `Repeat issue: ${action.sourceQuote || '(no quote)'} — previous fix did not hold.`,
          metadata: {
            sourceNoteId: action.sourceNoteId,
            assetId: action.assetId,
            tags: ['corrective_action', 'repeat'],
          },
        });
      } catch (e) {
        console.error('[follow-up] TenantMemory mirror failed:', e.message);
      }
    } else {
      action.history.push({ action: 'follow_up_asked', performedById: user._id, note: 'Confirmed fixed.', timestamp: new Date() });
    }

    await action.save();
    return res.status(200).json({ action, newAction });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to record follow-up', detail: error.message });
  }
}
