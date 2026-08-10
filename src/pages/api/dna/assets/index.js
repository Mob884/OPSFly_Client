import Asset from '@/lib/Asset';
import Vendor from '@/lib/Vendor';
import { requireUser } from '@/lib/apiAuth';
import { recordDNAEntry } from '@/lib/businessDNA';

/**
 * GET  /api/dna/assets  — list assets for this org (query: locationId, category, isActive).
 * POST /api/dna/assets  — create an asset (+ Business DNA entry).
 */
export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const organizationId = user.organizationId;

  if (req.method === 'GET') {
    try {
      const { locationId, category, isActive = 'true' } = req.query;
      const query = { organizationId };
      if (locationId) query.locationId = locationId;
      if (category) query.category = category;
      if (isActive === 'true') query.isActive = { $ne: false };
      else if (isActive === 'false') query.isActive = false;

      const assets = await Asset.find(query).sort({ createdAt: -1 }).lean();

      // Populate preferred vendor name (lightweight, org-scoped).
      const vendorIds = assets.map((a) => a.preferredVendorId).filter(Boolean);
      if (vendorIds.length) {
        const vendors = await Vendor.find({ _id: { $in: vendorIds }, organizationId }).select('name').lean();
        const nameById = Object.fromEntries(vendors.map((v) => [v._id.toString(), v.name]));
        for (const a of assets) {
          if (a.preferredVendorId) a.preferredVendorName = nameById[a.preferredVendorId.toString()] || null;
        }
      }

      return res.status(200).json(assets);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch assets', detail: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { organizationId: _ignore, _id, ...data } = req.body || {};
      if (!data.name?.trim()) return res.status(400).json({ error: 'name is required' });

      const asset = await Asset.create({ ...data, organizationId });

      const content = `${asset.name} - ${[asset.manufacturer, asset.model].filter(Boolean).join(' ')}`.trim()
        + (asset.physicalLocation ? `, located in ${asset.physicalLocation}` : '');

      await recordDNAEntry({
        organizationId,
        locationId: asset.locationId,
        entryType: 'asset',
        title: asset.name,
        content,
        sourceType: 'onboarding',
        sourceId: asset._id,
        assetId: asset._id,
        tags: ['asset', asset.category].filter(Boolean),
      });

      return res.status(201).json(asset);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create asset', detail: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
