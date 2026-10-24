import CorrectiveAction from './CorrectiveAction';
import TenantMemory from './TenantMemory';
import { upsertMemory } from './vectorStore';

const SEVEN_YEARS_MS = 7 * 365 * 24 * 60 * 60 * 1000;

/**
 * Creates a CorrectiveAction (observation → action → resolution chain) and
 * mirrors it into TenantMemory (Vault 1). Shared by the manual
 * POST /api/corrective route and the automatic creation from a saved note
 * (high-severity / maintenance issues), so both paths stay identical.
 */
export async function createCorrectiveAction({
  organizationId,
  locationId,
  sourceNoteId,
  sourceTaskId,
  sourceQuote,
  sourceTimestamp,
  sourceManagerId,
  assetId,
  vendorId,
  isIncident,
}) {
  let isRepeat = false;
  let priorCorrectiveActionId = null;
  let repeatCount = 0;

  if (assetId) {
    const prior = await CorrectiveAction.findOne({ organizationId, assetId }).sort({ createdAt: -1 });
    if (prior) {
      isRepeat = true;
      priorCorrectiveActionId = prior._id;
      repeatCount = (prior.repeatCount || 0) + 1;
    }
  }

  const action = await CorrectiveAction.create({
    organizationId,
    locationId,
    sourceNoteId,
    sourceTaskId,
    sourceQuote,
    sourceTimestamp,
    sourceManagerId,
    assetId,
    vendorId,
    status: 'open',
    isIncident: !!isIncident,
    retentionUntil: isIncident ? new Date(Date.now() + SEVEN_YEARS_MS) : undefined,
    isRepeat,
    priorCorrectiveActionId,
    repeatCount,
    history: [{ action: 'opened', performedById: sourceManagerId, timestamp: new Date() }],
  });

  // Mirror into Vault 1 — best effort, never blocks the primary write.
  try {
    const memoryContent = `Corrective action opened: ${sourceQuote || '(no quote)'}`;
    const memory = await TenantMemory.create({
      organizationId,
      locationId,
      memoryType: 'incident',
      content: memoryContent,
      metadata: {
        sourceNoteId,
        assetId,
        vendorId,
        tags: ['corrective_action', isIncident ? 'incident' : 'standard'],
      },
    });

    try {
      const embedding = await upsertMemory(organizationId, memory._id, memoryContent, {
        source: 'tenant_memory',
        type: 'corrective_action',
        locationId,
        assetId,
        vendorId,
        status: action.status,
        correctiveActionId: action._id,
      });
      if (embedding) {
        memory.embedding = embedding;
        await memory.save();
      }
    } catch (e) {
      console.error('[correctiveActions] Pinecone indexing failed:', e.message);
    }
  } catch (e) {
    console.error('[correctiveActions] TenantMemory mirror failed:', e.message);
  }

  return action;
}

/**
 * Indexes a resolved corrective action into Pinecone under its own id, so
 * recall/search/pattern-detection can surface "here's what fixed it last
 * time" directly from the resolution text. Best-effort — never throws.
 */
export async function indexResolvedCorrectiveAction(action) {
  try {
    const text = [
      action.sourceQuote,
      action.actionTaken ? `Action: ${action.actionTaken}` : null,
      action.resolutionNote ? `Resolution: ${action.resolutionNote}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    if (!text.trim()) return;

    await upsertMemory(action.organizationId, action._id, text, {
      source: 'corrective_action',
      type: 'corrective_action',
      locationId: action.locationId,
      assetId: action.assetId,
      vendorId: action.vendorId,
      status: action.status,
    });
  } catch (e) {
    console.error('[correctiveActions] Pinecone indexing failed for resolution:', e.message);
  }
}
