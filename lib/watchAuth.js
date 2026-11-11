import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import WatchDevice from '@/lib/WatchDevice';
import User from '@/lib/User';
import { getUserAccessibleLocationIds } from '@/lib/scopeByLocation';

// Watch tokens are signed with a DIFFERENT secret from user sessions, so a
// token that leaks from a watch cannot be used on any other API route
// (authMiddleware verifies with the session secret and rejects it).
function watchSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return `${process.env.JWT_SECRET}:watch`;
}

/** sha256 of the pairing code (separators and case ignored); only the hash is stored. */
export function hashCode(code) {
  return crypto.createHash('sha256').update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
}

export function signWatchToken({ userId, organizationId, locationId, jti }) {
  return jwt.sign(
    { userId: String(userId), organizationId: String(organizationId), locationId: String(locationId), jti, scope: 'watch' },
    watchSecret(),
    { expiresIn: '30d' }
  );
}

/**
 * Authenticates a request made by a paired watch. On success returns
 * { device, user, locationId }; on failure sends the 401/403 and returns null.
 * Checks, every time: token signature + scope, device not revoked, user still
 * active, and the user still has access to the paired location.
 */
export async function requireWatchDevice(req, res) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Watch token required' });
    return null;
  }
  let payload;
  try {
    payload = jwt.verify(header.slice(7), watchSecret());
  } catch {
    res.status(401).json({ error: 'Watch session expired. Pair the watch again.' });
    return null;
  }
  if (payload.scope !== 'watch') {
    res.status(401).json({ error: 'Not a watch token' });
    return null;
  }

  const device = await WatchDevice.findOne({ jti: payload.jti });
  if (!device || device.revokedAt) {
    res.status(401).json({ error: 'This watch was unpaired. Pair it again.' });
    return null;
  }
  const user = await User.findById(device.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    res.status(403).json({ error: 'Account is inactive' });
    return null;
  }
  const accessible = await getUserAccessibleLocationIds(user);
  if (!accessible.includes(String(device.locationId))) {
    res.status(403).json({ error: 'No access to the paired location any more' });
    return null;
  }

  device.lastUsedAt = new Date();
  await device.save();
  return { device, user, locationId: device.locationId };
}
