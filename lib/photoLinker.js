import Asset from '@/lib/Asset';
import Vendor from '@/lib/Vendor';

const STOP = new Set(['the', 'and', 'for', 'with', 'unit', 'machine', 'equipment']);

function tokens(s) {
  return (s || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
}

function score(name, haystack) {
  const lower = (name || '').toLowerCase().trim();
  if (!lower) return 0;
  if (haystack.includes(lower)) return 10 + lower.length;
  const parts = tokens(lower);
  if (!parts.length) return 0;
  const hits = parts.filter((p) => haystack.includes(p)).length;
  // single-word names need that word; multi-word names need at least half
  return hits >= Math.max(1, Math.ceil(parts.length / 2)) ? hits : 0;
}

/**
 * M5: links a photo to the Business DNA record it is about, automatically.
 * Matches the vision output (equipment hint, description, tags, issue quotes)
 * against this org's equipment, then resolves the vendor through the asset's
 * preferred vendor, falling back to a vendor-category match. Everything is
 * scoped to the caller's organization.
 *
 * @returns {{assetId, assetName, area, vendorId, vendorName} | null}
 */
export async function linkPhotoToDNA({ organizationId, locationId, analysis }) {
  if (!analysis) return null;
  const haystack = [
    analysis.equipmentHint,
    analysis.description,
    ...(analysis.tags || []),
    ...(analysis.issues || []).map((i) => i.quote),
  ].join(' ').toLowerCase();
  if (!haystack.trim()) return null;

  const assetQuery = { organizationId };
  if (locationId) assetQuery.$or = [{ locationId }, { locationId: null }, { locationId: { $exists: false } }];
  const [assets, vendors] = await Promise.all([
    Asset.find(assetQuery).lean(),
    Vendor.find({ organizationId }).lean(),
  ]);

  let bestAsset = null;
  let bestScore = 0;
  for (const a of assets) {
    const s = score(a.name, haystack);
    if (s > bestScore) { bestScore = s; bestAsset = a; }
  }

  let vendor = null;
  if (bestAsset?.preferredVendorId) {
    vendor = vendors.find((v) => String(v._id) === String(bestAsset.preferredVendorId)) || null;
  }
  if (!vendor) {
    let vs = 0;
    for (const v of vendors) {
      const s = Math.max(score(v.name, haystack), score(v.category, haystack));
      if (s > vs) { vs = s; vendor = v; }
    }
    // a vendor matched on category alone is only trusted when an asset matched too
    if (vendor && !bestAsset && vs < 10) vendor = null;
  }

  if (!bestAsset && !vendor) return null;
  return {
    assetId: bestAsset?._id || null,
    assetName: bestAsset?.name || null,
    area: bestAsset?.physicalLocation || null,
    vendorId: vendor?._id || null,
    vendorName: vendor?.name || null,
  };
}
