import BusinessDNAEntry from './BusinessDNAEntry';
import TenantMemory from './TenantMemory';

// Maps a BusinessDNAEntry.entryType to the closest TenantMemory.memoryType
// (Vault 1 enum: observation | asset | vendor | sop | incident | lesson).
const MEMORY_TYPE_MAP = {
  profile: 'observation',
  asset: 'asset',
  vendor: 'vendor',
  document: 'sop',
  building: 'observation',
  utility: 'observation',
  emergency: 'observation',
  maintenance: 'incident',
  observation: 'observation',
  lesson: 'lesson',
  procedure: 'sop',
  custom: 'observation',
};

/**
 * Records one piece of Business DNA.
 *
 * Creates the flexible BusinessDNAEntry AND mirrors it into TenantMemory
 * (Vault 1), honoring the M2 rule that every piece of Business DNA is stored
 * as operational memory. TenantMemory mirroring never blocks the primary
 * write — if it fails we log and continue.
 *
 * @returns {Promise<object>} the created BusinessDNAEntry
 */
export async function recordDNAEntry({
  organizationId,
  locationId,
  entryType,
  title,
  content,
  sourceType,
  sourceId,
  assetId,
  vendorId,
  documentId,
  tags = [],
  customFields,
}) {
  const entry = await BusinessDNAEntry.create({
    organizationId,
    locationId: locationId || undefined,
    entryType,
    title,
    content,
    sourceType,
    sourceId,
    assetId,
    vendorId,
    documentId,
    tags,
    customFields,
  });

  // Mirror into Vault 1 (TenantMemory). Best-effort — never fail the entry.
  try {
    await TenantMemory.create({
      organizationId,
      locationId: locationId || undefined,
      memoryType: MEMORY_TYPE_MAP[entryType] || 'observation',
      content: title ? `${title}. ${content}` : content,
      metadata: {
        sourceNoteId: sourceType === 'voice_note' ? sourceId : undefined,
        assetId,
        vendorId,
        tags,
      },
    });
  } catch (e) {
    console.error('[businessDNA] TenantMemory mirror failed:', e.message);
  }

  return entry;
}
