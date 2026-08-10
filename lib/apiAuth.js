import connectDB from './mongodb';
import User from './User';
import { authMiddleware } from './auth';

/**
 * Resolves the authenticated user document for an API route.
 *
 * Connects to the DB, verifies the JWT, and loads the full User (so callers
 * get organizationId, role, locationIds, etc.). On any failure it sets the
 * response itself and returns null — callers should do:
 *
 *   const user = await requireUser(req, res);
 *   if (!user) return;
 *
 * organizationId is ALWAYS taken from this user (the token), never from the
 * request body or params.
 */
export async function requireUser(req, res) {
  await connectDB();
  const decoded = await authMiddleware(req, res); // sets 401 + returns null on failure
  if (!decoded) return null;

  const user = await User.findById(decoded.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    res.status(401).json({ error: 'User not found or deactivated' });
    return null;
  }
  return user;
}
