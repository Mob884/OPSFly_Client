import connectDB from './mongodb';
import TenantMemory from './TenantMemory';
import BusinessDNAEntry from './BusinessDNAEntry';
import CorrectiveAction from './CorrectiveAction';
import Note from './Note';
import Asset from './Asset';
import Vendor from './Vendor';
import { queryMemory, mongoTextSearch, isVectorStoreConfigured } from './vectorStore';

const TYPE_FILTERS = {
  asset: { type: 'asset' },
  vendor: { type: 'vendor' },
  corrective: { type: 'corrective_action' },
};

/**
 * Cross-shift memory search. CRITICAL: every read below is scoped to
 * organizationId — never returns another org's data.
 */
export async function search(organizationId, queryText, type = 'all', limit = 10) {
  await connectDB();
  const empty = { notes: [], assets: [], vendors: [], correctiveActions: [], dnaEntries: [] };
  if (!organizationId || !queryText?.trim()) return empty;

  let memories = [];
  let dnaEntries = [];
  let correctiveActions = [];
  let directNotes = [];
  let directAssets = [];

  if (isVectorStoreConfigured()) {
    const filter = type !== 'all' ? TYPE_FILTERS[type] : undefined;
    const matches = (await queryMemory(organizationId, queryText, limit * 2, filter || {})) || [];

    const idsBySource = { tenant_memory: [], dna_entry: [], corrective_action: [] };
    for (const m of matches) {
      const source = m.metadata?.source;
      if (source && idsBySource[source]) idsBySource[source].push(m.id);
    }

    [memories, dnaEntries, correctiveActions] = await Promise.all([
      idsBySource.tenant_memory.length
        ? TenantMemory.find({ _id: { $in: idsBySource.tenant_memory }, organizationId }).lean()
        : [],
      idsBySource.dna_entry.length
        ? BusinessDNAEntry.find({ _id: { $in: idsBySource.dna_entry }, organizationId }).lean()
        : [],
      idsBySource.corrective_action.length
        ? CorrectiveAction.find({ _id: { $in: idsBySource.corrective_action }, organizationId }).lean()
        : [],
    ]);
  } else {
    [memories, dnaEntries, directNotes, directAssets] = await Promise.all([
      mongoTextSearch(TenantMemory, organizationId, queryText, limit),
      mongoTextSearch(BusinessDNAEntry, organizationId, queryText, limit),
      mongoTextSearch(Note, organizationId, queryText, limit),
      mongoTextSearch(Asset, organizationId, queryText, limit),
    ]);
  }

  // Resolve notes/assets/vendors referenced by whatever matched above, so
  // results come back as real records the UI can link to, not raw vectors.
  const noteIds = new Set(directNotes.map((n) => n._id.toString()));
  const assetIds = new Set(directAssets.map((a) => a._id.toString()));
  const vendorIds = new Set();

  for (const doc of [...memories, ...dnaEntries]) {
    const sourceNoteId = doc.metadata?.sourceNoteId || (doc.sourceType === 'voice_note' ? doc.sourceId : null);
    if (sourceNoteId) noteIds.add(sourceNoteId.toString());
    const assetId = doc.metadata?.assetId || doc.assetId;
    if (assetId) assetIds.add(assetId.toString());
    const vendorId = doc.metadata?.vendorId || doc.vendorId;
    if (vendorId) vendorIds.add(vendorId.toString());
  }
  for (const action of correctiveActions) {
    if (action.assetId) assetIds.add(action.assetId.toString());
    if (action.vendorId) vendorIds.add(action.vendorId.toString());
  }

  const [notes, assets, vendors] = await Promise.all([
    noteIds.size ? Note.find({ _id: { $in: [...noteIds] }, organizationId }).limit(limit).lean() : [],
    assetIds.size ? Asset.find({ _id: { $in: [...assetIds] }, organizationId }).limit(limit).lean() : [],
    vendorIds.size ? Vendor.find({ _id: { $in: [...vendorIds] }, organizationId }).limit(limit).lean() : [],
  ]);

  return {
    notes: notes.slice(0, limit),
    assets: assets.slice(0, limit),
    vendors: vendors.slice(0, limit),
    correctiveActions: correctiveActions.slice(0, limit),
    dnaEntries: dnaEntries.slice(0, limit),
  };
}
