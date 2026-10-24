import CorrectiveAction from '@/lib/CorrectiveAction';
import { requireUser } from '@/lib/apiAuth';

/**
 * GET /api/corrective/:id — full detail for one corrective action.
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id } = req.query;
    const action = await CorrectiveAction.findById(id);
    if (!action) return res.status(404).json({ error: 'Corrective action not found' });
    if (action.organizationId.toString() !== user.organizationId.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let priorAction = null;
    if (action.priorCorrectiveActionId) {
      priorAction = await CorrectiveAction.findById(action.priorCorrectiveActionId).select('sourceQuote status resolvedAt resolutionNote');
    }

    const result = action.toObject();
    result.priorAction = priorAction;
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch corrective action', detail: error.message });
  }
}
