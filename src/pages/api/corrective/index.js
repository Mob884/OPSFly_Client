import Note from '@/lib/Note';
import CorrectiveAction from '@/lib/CorrectiveAction';
import { requireUser } from '@/lib/apiAuth';
import { createCorrectiveAction } from '@/lib/correctiveActions';

/**
 * GET  /api/corrective  — list corrective actions for this org
 *                         (query: status, locationId, limit)
 * POST /api/corrective  — create a corrective action from a note/issue
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const organizationId = user.organizationId;

  if (req.method === 'GET') {
    try {
      const { status, locationId, limit = 20 } = req.query;
      const query = { organizationId };
      if (status) query.status = status;
      if (locationId) query.locationId = locationId;

      const actions = await CorrectiveAction.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit, 10) || 20);

      return res.status(200).json(actions);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch corrective actions', detail: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { sourceNoteId, sourceTaskId, isIncident, assetId, vendorId, sourceQuote: bodyQuote } = req.body || {};
      if (!sourceNoteId) return res.status(400).json({ error: 'sourceNoteId is required' });

      const note = await Note.findById(sourceNoteId);
      if (!note) return res.status(404).json({ error: 'Source note not found' });
      if (note.organizationId.toString() !== organizationId.toString()) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const sourceQuote = bodyQuote || note.issues?.[0]?.quote || note.transcript;
      const sourceTimestamp = note.analyzedAt || note.createdAt;

      const action = await createCorrectiveAction({
        organizationId,
        locationId: note.locationId,
        sourceNoteId,
        sourceTaskId,
        sourceQuote,
        sourceTimestamp,
        sourceManagerId: user._id,
        assetId,
        vendorId,
        isIncident,
      });

      return res.status(201).json(action);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create corrective action', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
