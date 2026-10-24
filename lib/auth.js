import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'opsfly_premium_secure_jwt_secret_2026';

/**
 * Sign a JWT token for a given user.
 */
export function signToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify a JWT token. Returns decoded payload if valid, otherwise null.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Standard Next.js API Route authorization middleware.
 * If authorized, returns the decoded user token payload.
 * If not authorized, sets 401 response and returns null.
 */
export async function authMiddleware(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Authorization header missing or invalid.' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return null;
  }

  return decoded;
}

/**
 * Restricts access to specific roles. Returns true if allowed, otherwise false.
 */
export function checkRole(user, allowedRoles = []) {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}
