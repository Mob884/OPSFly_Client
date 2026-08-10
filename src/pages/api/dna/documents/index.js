import BusinessDocument from '@/lib/BusinessDocument';
import { requireUser } from '@/lib/apiAuth';
import { recordDNAEntry } from '@/lib/businessDNA';
import { getSignedFileUrl, validateFileOwnership } from '@/lib/storage';

/**
 * GET  /api/dna/documents  — list documents for this org (query: documentType, locationId).
 * POST /api/dna/documents  — register an already-uploaded document (+ Business DNA entry).
 *
 * The binary is uploaded first via POST /api/upload (which returns a fileKey);
 * this route records the metadata and links it into Business DNA.
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const organizationId = user.organizationId;

  if (req.method === 'GET') {
    try {
      const { documentType, locationId } = req.query;
      const query = { organizationId, isActive: { $ne: false } };
      if (documentType) query.documentType = documentType;
      if (locationId) query.locationId = locationId;

      const documents = await BusinessDocument.find(query).sort({ createdAt: -1 }).lean();

      // Attach a fresh signed URL for each document the org owns.
      for (const doc of documents) {
        if (doc.fileKey && validateFileOwnership(doc.fileKey, organizationId)) {
          try {
            doc.signedUrl = await getSignedFileUrl(doc.fileKey, 3600);
          } catch {
            doc.signedUrl = null;
          }
        }
      }

      return res.status(200).json(documents);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch documents', detail: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { organizationId: _ignore, _id, ...data } = req.body || {};
      if (!data.title?.trim()) return res.status(400).json({ error: 'title is required' });

      // If a fileKey is supplied, it must belong to this org.
      if (data.fileKey && !validateFileOwnership(data.fileKey, organizationId)) {
        return res.status(403).json({ error: 'Forbidden. File does not belong to your organization.' });
      }

      const document = await BusinessDocument.create({
        ...data,
        organizationId,
        uploadedBy: user._id,
      });

      await recordDNAEntry({
        organizationId,
        locationId: document.locationId,
        entryType: 'document',
        title: document.title,
        content: `${document.title}${document.documentType ? ` (${document.documentType})` : ''}${document.description ? `: ${document.description}` : ''}`,
        sourceType: 'onboarding',
        sourceId: document._id,
        documentId: document._id,
        tags: ['document', document.documentType, ...(document.tags || [])].filter(Boolean),
      });

      const result = document.toObject();
      if (document.fileKey) {
        try {
          result.signedUrl = await getSignedFileUrl(document.fileKey, 3600);
        } catch {
          result.signedUrl = null;
        }
      }

      return res.status(201).json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create document', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
