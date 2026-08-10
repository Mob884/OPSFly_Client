import BusinessDocument from '@/lib/BusinessDocument';
import { requireUser } from '@/lib/apiAuth';

/**
 * DELETE /api/dna/documents/:id  — soft delete (isActive: false).
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const document = await BusinessDocument.findById(id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (document.organizationId.toString() !== user.organizationId.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    document.isActive = false;
    await document.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete document', detail: error.message });
  }
}
