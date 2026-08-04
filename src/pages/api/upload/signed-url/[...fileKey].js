import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';
import { getSignedFileUrl, validateFileOwnership } from '@/lib/storage';

// GET /api/upload/signed-url/orgs/<id>/locations/<id>/<folder>/<uuid>.<ext>
//
// fileKeys contain slashes, so this uses a Next.js catch-all route
// ([...fileKey]) to keep the full key intact.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  try {
    const { fileKey } = req.query;
    const key = Array.isArray(fileKey) ? fileKey.join('/') : fileKey;
    if (!key) return res.status(400).json({ error: 'fileKey is required' });

    if (!validateFileOwnership(key, user.organizationId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const signedUrl = await getSignedFileUrl(key, 3600);
    return res.status(200).json({ fileKey: key, signedUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate signed URL', detail: error.message });
  }
}
