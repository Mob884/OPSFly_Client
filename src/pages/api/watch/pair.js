import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import Location from '@/lib/Location';
import WatchPairing from '@/lib/WatchPairing';
import WatchDevice from '@/lib/WatchDevice';
import { signWatchToken, hashCode } from '@/lib/watchAuth';

/**
 * POST /api/watch/pair   { code, deviceName? }   (no login: the code is the credential)
 * Exchanges a one-time code for a 30-day watch token. The code is single-use.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await connectDB();

  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  if (code.replace(/[^A-Za-z0-9]/g, '').length !== 8) {
    return res.status(400).json({ error: 'Enter the 8 character code from the app' });
  }

  // findOneAndUpdate makes "use once" atomic: two watches cannot redeem the same code.
  const pairing = await WatchPairing.findOneAndUpdate(
    { codeHash: hashCode(code), usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
  if (!pairing) {
    // Small delay slows down guessing without breaking a real user.
    await new Promise((r) => setTimeout(r, 600));
    return res.status(400).json({ error: 'That code is wrong or has expired. Generate a new one in the app.' });
  }

  const user = await User.findById(pairing.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    return res.status(403).json({ error: 'Account is inactive' });
  }
  const location = await Location.findById(pairing.locationId).select('name');

  const jti = crypto.randomUUID();
  await WatchDevice.create({
    userId: pairing.userId,
    organizationId: pairing.organizationId,
    locationId: pairing.locationId,
    name: typeof req.body?.deviceName === 'string' ? req.body.deviceName.slice(0, 60) : 'Apple Watch',
    jti,
  });
  const token = signWatchToken({ userId: pairing.userId, organizationId: pairing.organizationId, locationId: pairing.locationId, jti });

  return res.status(201).json({ token, user: { name: user.name }, location: { name: location?.name || '' } });
}
