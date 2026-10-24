import Vendor from '@/lib/Vendor';
import { requireUser } from '@/lib/apiAuth';

/**
 * PUT    /api/dna/vendors/:id  — update a vendor (org-scoped).
 * DELETE /api/dna/vendors/:id  — soft delete (isActive: false).
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const organizationId = user.organizationId;
  const { id } = req.query;

  const vendor = await Vendor.findById(id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  if (vendor.organizationId.toString() !== organizationId.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'PUT') {
    try {
      const { organizationId: _ignore, _id, ...data } = req.body || {};
      Object.assign(vendor, data);
      await vendor.save();
      return res.status(200).json(vendor);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update vendor', detail: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      vendor.isActive = false;
      await vendor.save();
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete vendor', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
