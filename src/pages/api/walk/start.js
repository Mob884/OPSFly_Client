import connectDB from '@/lib/mongodb';
import WalkSession from '@/lib/WalkSession';
import IndustryConfig from '@/lib/IndustryConfig';
import Organization from '@/lib/Organization';
import Location from '@/lib/Location';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';
import { detectWalkArea, detectShiftType } from '@/lib/walkHelpers';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * POST /api/walk/start
 * Starts a Four Corner Walk session for the current manager. If one is
 * already active for this manager at this location, returns it instead of
 * creating a duplicate.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const access = await verifyLocationAccess(req, res, decoded);
  if (!access) return;

  const { selectedLocationId, organizationId, user } = access;

  try {
    const existing = await WalkSession.findOne({
      managerId: user._id,
      locationId: selectedLocationId,
      status: 'active',
    });

    let session = existing;
    if (session && session.timeoutAt && session.timeoutAt < new Date()) {
      session.status = 'timed_out';
      session.endedAt = session.timeoutAt;
      await session.save();
      session = null;
    }

    let promptSource;
    try {
      const org = await Organization.findById(organizationId).populate('configTemplateId');
      promptSource = org?.configTemplateId?.walkPrompts;
    } catch {
      promptSource = null;
    }
    if (!promptSource) {
      const fallback = await IndustryConfig.findOne({ industryType: 'restaurant' });
      promptSource = fallback?.walkPrompts;
    }

    if (!session) {
      const walkArea = detectWalkArea(user.role, user.department);
      const location = await Location.findById(selectedLocationId).select('timezone');
      const shiftType = detectShiftType(location?.timezone);

      session = await WalkSession.create({
        organizationId,
        locationId: selectedLocationId,
        managerId: user._id,
        managerRole: user.role,
        managerDepartment: user.department || undefined,
        walkArea,
        shiftType,
        status: 'active',
        startedAt: new Date(),
        timeoutAt: new Date(Date.now() + TWO_HOURS_MS),
      });
    }

    return res.status(201).json({
      walkSessionId: session._id,
      walkArea: session.walkArea,
      shiftType: session.shiftType,
      startedAt: session.startedAt,
      prompt: promptSource?.walkActiveMessage || 'Walk is active. Tap to record when something needs attention.',
    });
  } catch (error) {
    console.error('[POST /api/walk/start]', error);
    return res.status(500).json({ error: 'Failed to start walk', detail: error.message });
  }
}
