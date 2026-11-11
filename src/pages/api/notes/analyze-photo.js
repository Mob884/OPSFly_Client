import multer from 'multer';
import connectDB from '@/lib/mongodb';
import User from '@/lib/User';
import { authMiddleware } from '@/lib/auth';
import { verifyLocationAccess } from '@/lib/scopeByLocation';
import { uploadFile, getSignedFileUrl } from '@/lib/storage';
import { analyzePhoto } from '@/lib/visionAnalyzer';
import { linkPhotoToDNA } from '@/lib/photoLinker';

export const config = { api: { bodyParser: false } };

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Vercel rejects request bodies over ~4.5MB, so clients compress first and the
// limit here stays just under it.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new Error(`Unsupported image type: ${file.mimetype}`)),
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => fn(req, res, (r) => (r instanceof Error ? reject(r) : resolve(r))));
}

/**
 * POST /api/notes/analyze-photo   (multipart: file, transcript?)
 * M5: stores the photo (tenant-isolated S3), has GPT-4o Vision read it together
 * with the note text, auto-links it to the right equipment / vendor / area from
 * Business DNA, and returns the extra issues it found. Nothing is attached to a
 * note until /api/notes/save receives the returned fileKey.
 */
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
  if (!req.file) return res.status(400).json({ error: 'file is required' });

  const access = await verifyLocationAccess(req, res, decoded);
  if (!access) return;
  const { selectedLocationId, organizationId } = access;

  try {
    const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.slice(0, 4000) : '';
    const { buffer, mimetype } = req.file;

    // Upload and vision run in parallel; neither depends on the other.
    const [stored, analysis] = await Promise.all([
      uploadFile(organizationId, selectedLocationId, 'notes', buffer, mimetype, ALLOWED[mimetype]),
      analyzePhoto({ buffer, mimeType: mimetype, transcript }),
    ]);
    const [signedUrl, link] = await Promise.all([
      getSignedFileUrl(stored.fileKey, 3600),
      linkPhotoToDNA({ organizationId, locationId: selectedLocationId, analysis }).catch((e) => {
        console.error('[analyze-photo] DNA link failed:', e.message);
        return null;
      }),
    ]);

    return res.status(200).json({
      fileKey: stored.fileKey,
      mimeType: mimetype,
      signedUrl,
      mocked: !!stored.mocked,
      analysis: analysis
        ? { description: analysis.description, equipmentHint: analysis.equipmentHint, tags: analysis.tags, model: analysis.model }
        : null,
      // Issues found by vision are marked so the UI can show where they came from.
      issues: (analysis?.issues || []).map((i) => ({ ...i, fromPhoto: true })),
      link,
    });
  } catch (error) {
    console.error('[POST /api/notes/analyze-photo]', error);
    return res.status(500).json({ error: 'Photo analysis failed', detail: error.message });
  }
}
