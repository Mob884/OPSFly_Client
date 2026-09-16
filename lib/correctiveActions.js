import CorrectiveAction from './CorrectiveAction';
import TenantMemory from './TenantMemory';

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
    await TenantMemory.create({
      organizationId,
      locationId,
      memoryType: 'incident',
      content: `Corrective action opened: ${sourceQuote || '(no quote)'}`,
      metadata: {
        sourceNoteId,
        assetId,
        vendorId,
        tags: ['corrective_action', isIncident ? 'incident' : 'standard'],
      },
    });
  } catch (e) {
    console.error('[correctiveActions] TenantMemory mirror failed:', e.message);
  }

  return action;
}
