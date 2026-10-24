// Backfills Pinecone with everything that existed before M3B shipped.
// Safe to run multiple times: TenantMemory/BusinessDNAEntry skip any document
// that already has an `embedding` saved; Asset/Vendor/CorrectiveAction have
// no local embedding field, but Pinecone upsert is idempotent by id, so
// re-running just overwrites the same vectors rather than duplicating them.
// Continues past individual failures so one bad document never stops the
// batch.
//
// Requires PINECONE_API_KEY to be set — exits early with a clear message if
// not, since there is nothing to backfill without it.
//
// Usage: node scripts/indexExistingData.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import TenantMemory from '../lib/TenantMemory.js';
import BusinessDNAEntry from '../lib/BusinessDNAEntry.js';
import Asset from '../lib/Asset.js';
import Vendor from '../lib/Vendor.js';
import CorrectiveAction from '../lib/CorrectiveAction.js';
import { upsertMemory, isVectorStoreConfigured } from '../lib/vectorStore.js';

const LOG_EVERY = 100;

async function indexCollection(name, cursor, buildText, buildMetadata, save) {
  let indexed = 0;
  let skipped = 0;
  let failed = 0;
  let seen = 0;

  for await (const doc of cursor) {
    seen++;
    try {
      if (doc.embedding && doc.embedding.length > 0) {
        skipped++;
        continue;
      }
      const text = buildText(doc);
      if (!text?.trim()) {
        skipped++;
        continue;
      }
      const embedding = await upsertMemory(doc.organizationId, doc._id, text, buildMetadata(doc));
      if (embedding && save) {
        doc.embedding = embedding;
        await doc.save();
      }
      indexed++;
    } catch (e) {
      failed++;
      console.error(`[indexExistingData] ${name} ${doc._id} failed:`, e.message);
    }

    if (seen % LOG_EVERY === 0) {
      console.log(`[indexExistingData] ${name}: ${seen} processed (${indexed} indexed, ${skipped} skipped, ${failed} failed)`);
    }
  }

  console.log(`[indexExistingData] ${name} DONE: ${seen} processed, ${indexed} indexed, ${skipped} skipped, ${failed} failed`);
  return { seen, indexed, skipped, failed };
}

async function run() {
  if (!process.env.PINECONE_API_KEY) {
    console.error('[indexExistingData] PINECONE_API_KEY is not set — nothing to backfill. Exiting.');
    process.exit(1);
  }
  if (!isVectorStoreConfigured()) {
    console.error('[indexExistingData] Vector store failed to initialize. Exiting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[indexExistingData] Connected to MongoDB. Starting backfill...\n');

  // 1. TenantMemory
  await indexCollection(
    'TenantMemory',
    TenantMemory.find({}).cursor(),
    (doc) => doc.content,
    (doc) => ({
      source: 'tenant_memory',
      type: doc.memoryType,
      locationId: doc.locationId,
      assetId: doc.metadata?.assetId,
      vendorId: doc.metadata?.vendorId,
      sourceNoteId: doc.metadata?.sourceNoteId,
      tags: doc.metadata?.tags,
    }),
    true
  );

  // 2. BusinessDNAEntry
  await indexCollection(
    'BusinessDNAEntry',
    BusinessDNAEntry.find({}).cursor(),
    (doc) => `${doc.title || ''} ${doc.content}`.trim(),
    (doc) => ({
      source: 'dna_entry',
      type: doc.entryType,
      locationId: doc.locationId,
      assetId: doc.assetId,
      vendorId: doc.vendorId,
      tags: doc.tags,
    }),
    true
  );

  // 3. Asset — active assets
  await indexCollection(
    'Asset',
    Asset.find({ isActive: { $ne: false } }).cursor(),
    (doc) => [doc.name, doc.manufacturer, doc.model, doc.category, doc.notes].filter(Boolean).join(' '),
    (doc) => ({ source: 'asset', type: 'asset', category: doc.category, locationId: doc.locationId }),
    false // Asset has no embedding field — indexed for search/recall only
  );

  // 4. Vendor — active vendors
  await indexCollection(
    'Vendor',
    Vendor.find({ isActive: { $ne: false } }).cursor(),
    (doc) => [doc.name, doc.category, doc.notes].filter(Boolean).join(' '),
    (doc) => ({ source: 'vendor', type: 'vendor', category: doc.category }),
    false // Vendor has no embedding field — indexed for search/recall only
  );

  // 5. CorrectiveAction — resolved ones
  await indexCollection(
    'CorrectiveAction',
    CorrectiveAction.find({ status: 'resolved' }).cursor(),
    (doc) =>
      [doc.sourceQuote, doc.actionTaken ? `Action: ${doc.actionTaken}` : null, doc.resolutionNote ? `Resolution: ${doc.resolutionNote}` : null]
        .filter(Boolean)
        .join(' '),
    (doc) => ({ source: 'corrective_action', type: 'corrective_action', assetId: doc.assetId, status: doc.status }),
    false // CorrectiveAction has no embedding field — indexed for search/recall only
  );

  console.log('\n[indexExistingData] Backfill complete.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error('[indexExistingData] Fatal error:', e.message);
  process.exit(1);
});
