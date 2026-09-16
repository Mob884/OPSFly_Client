import connectDB from '@/lib/mongodb';
import ShiftHandover from '@/lib/ShiftHandover';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';

/**
 * GET /api/walk/handover
 * Returns the latest ShiftHandover for this location and marks it read.
 * Called when a manager opens the app at shift start.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const access = await verifyLocationAccess(req, res, decoded);
  if (!access) return;

  const { selectedLocationId, organizationId } = access;

  try {
    const handover = await ShiftHandover.findOne({
      organizationId,
      locationId: selectedLocationId,
    }).sort({ generatedAt: -1 });

    if (!handover) return res.status(200).json(null);

    // Capture the pre-fetch read state: the response always reflects
    // isRead:true after this call (we mark it read below), so the client
    // needs `wasUnread` to know whether to surface the card THIS load —
    // showing it once on discovery, not on every subsequent Home load.
    const wasUnread = !handover.isRead;

    if (wasUnread) {
      handover.isRead = true;
      handover.readAt = new Date();
      await handover.save();
    }

    const result = handover.toObject();
    result.wasUnread = wasUnread;
    return res.status(200).json(result);
  } catch (error) {
    console.error('[GET /api/walk/handover]', error);
    return res.status(500).json({ error: 'Failed to fetch handover', detail: error.message });
  }
}
