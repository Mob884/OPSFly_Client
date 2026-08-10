import Vendor from '@/lib/Vendor';
import { requireUser } from '@/lib/apiAuth';
import { recordDNAEntry } from '@/lib/businessDNA';

/**
 * GET  /api/dna/vendors  — list vendors for this org (query: category, isActive).
 * POST /api/dna/vendors  — create a vendor (+ Business DNA entry).
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const organizationId = user.organizationId;

  if (req.method === 'GET') {
    try {
      const { category, isActive = 'true' } = req.query;
      const query = { organizationId };
      if (category) query.category = category;
      if (isActive === 'true') query.isActive = { $ne: false };
      else if (isActive === 'false') query.isActive = false;

      const vendors = await Vendor.find(query).sort({ createdAt: -1 }).lean();
      return res.status(200).json(vendors);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch vendors', detail: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { organizationId: _ignore, _id, ...data } = req.body || {};
      if (!data.name?.trim()) return res.status(400).json({ error: 'name is required' });

      const vendor = await Vendor.create({ ...data, organizationId });

      const content = `${vendor.name} - ${vendor.category || 'general'} vendor. Contact: ${[vendor.primaryContact, vendor.phone].filter(Boolean).join(' ')}`.trim();

      await recordDNAEntry({
        organizationId,
        entryType: 'vendor',
        title: vendor.name,
        content,
        sourceType: 'onboarding',
        sourceId: vendor._id,
        vendorId: vendor._id,
        tags: ['vendor', vendor.category].filter(Boolean),
      });

      return res.status(201).json(vendor);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create vendor', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
