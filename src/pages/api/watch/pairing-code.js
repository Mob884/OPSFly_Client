import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Location from '@/lib/Location';
import WatchPairing from '@/lib/WatchPairing';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';
import { hashCode } from '@/lib/watchAuth';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L to avoid typos on a tiny screen
const TTL_MS = 10 * 60 * 1000;

function makeCode() {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`; // 31^8 combinations, valid for 10 minutes
}

/**
 * POST /api/watch/pairing-code
 * A signed-in manager asks for a one-time code to type on their Apple Watch.
 * The watch is bound to the location currently selected in the app.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;
  const access = await verifyLocationAccess(req, res, decoded);
  if (!access) return;

  const { selectedLocationId, organizationId, user } = access;
  const location = await Location.findById(selectedLocationId).select('name');

  // Only one live code per user: a new one replaces any older pending code.
  await WatchPairing.deleteMany({ userId: user._id, usedAt: { $exists: false } });
  const code = makeCode();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await WatchPairing.create({ codeHash: hashCode(code), userId: user._id, organizationId, locationId: selectedLocationId, expiresAt });

  return res.status(201).json({ code, expiresAt, locationName: location?.name || null });
}
