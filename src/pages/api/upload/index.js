import multer from 'multer';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';
import { getUserAccessibleLocationIds } from '@/lib/scopeByLocation';
import { uploadFile, getSignedFileUrl } from '@/lib/storage';

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mp4',
  'audio/m4a',
  'audio/webm',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

function extensionFor(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'audio/mp4': 'mp4',
    'audio/m4a': 'm4a',
    'audio/webm': 'webm',
    'application/pdf': 'pdf',
  };
  return map[mimeType] || 'bin';
}

// POST /api/upload
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();
  const decoded = await authMiddleware(req, res);
  if (!decoded) return;

  const user = await User.findById(decoded.userId);
  if (!user || user.isActive === false || user.deleted === true) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  try {
    await runMiddleware(req, res, upload.single('file'));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    const { folder = 'notes', locationId } = req.body;

    // Validate the user actually has access to the location, if provided.
    if (locationId) {
      const accessibleIds = await getUserAccessibleLocationIds(user);
      if (!accessibleIds.includes(locationId.toString())) {
        return res.status(403).json({ error: 'Forbidden. You do not have access to this location.' });
      }
    }

    // organizationId always comes from the auth token, never the request body.
    const { fileKey } = await uploadFile(
      user.organizationId,
      locationId || null,
      folder,
      req.file.buffer,
      req.file.mimetype,
      extensionFor(req.file.mimetype)
    );

    const signedUrl = await getSignedFileUrl(fileKey, 3600);

    return res.status(201).json({ fileKey, signedUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to upload file', detail: error.message });
  }
}
