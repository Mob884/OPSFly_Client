import Asset from '@/lib/Asset';
import { requireUser } from '@/lib/apiAuth';

/**
 * PUT    /api/dna/assets/:id  — update an asset (org-scoped).
 * DELETE /api/dna/assets/:id  — soft delete (isActive: false).
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const organizationId = user.organizationId;
  const { id } = req.query;

  // Ownership check up front for both verbs.
  const asset = await Asset.findById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  if (asset.organizationId.toString() !== organizationId.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'PUT') {
    try {
      const { organizationId: _ignore, _id, ...data } = req.body || {};
      Object.assign(asset, data);
      await asset.save();
      return res.status(200).json(asset);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update asset', detail: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      asset.isActive = false;
      await asset.save();
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete asset', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
