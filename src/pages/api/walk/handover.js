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

    // Per-user read tracking. The recap is for the incoming manager, so the
    // manager who ended the shift never consumes it, and one person opening
    // it does not hide it from the next. `wasUnread` is true once per user.
    const userId = String(decoded.userId);
    const isOutgoing = handover.outgoingManagerId && String(handover.outgoingManagerId) === userId;
    const alreadyRead = (handover.readBy || []).some((id) => String(id) === userId);
    const wasUnread = !isOutgoing && !alreadyRead;

    if (wasUnread) {
      await ShiftHandover.updateOne(
        { _id: handover._id },
        { $addToSet: { readBy: decoded.userId }, $set: { isRead: true, readAt: new Date() } }
      );
    }

    const result = handover.toObject();
    result.wasUnread = wasUnread;
    return res.status(200).json(result);
  } catch (error) {
    console.error('[GET /api/walk/handover]', error);
    return res.status(500).json({ error: 'Failed to fetch handover', detail: error.message });
  }
}
