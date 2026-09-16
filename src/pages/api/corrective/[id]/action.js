import CorrectiveAction from '@/lib/CorrectiveAction';
import { requireUser } from '@/lib/apiAuth';

const FOLLOW_UP_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * PATCH /api/corrective/:id/action
 * Body: { actionTaken, vendorId }
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

    const { actionTaken, vendorId } = req.body || {};

    action.status = 'action_taken';
    action.actionTaken = actionTaken;
    action.actionTakenAt = new Date();
    action.actionTakenById = user._id;
    if (vendorId) action.vendorId = vendorId;
    action.followUpAt = new Date(Date.now() + FOLLOW_UP_DELAY_MS);
    action.history.push({ action: 'action_taken', performedById: user._id, note: actionTaken, timestamp: new Date() });

    await action.save();
    return res.status(200).json(action);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update corrective action', detail: error.message });
  }
}
