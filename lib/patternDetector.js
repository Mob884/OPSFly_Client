import connectDB from './mongodb';
import TenantMemory from './TenantMemory';
import CorrectiveAction from './CorrectiveAction';

const LOOKBACK_DAYS = 14;
const CLUSTER_SIMILARITY_THRESHOLD = 0.85;
const MIN_CLUSTER_SIZE = 3;

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Greedy single-pass clustering — fine at the volume one location produces
// in a 14-day window. Not a general-purpose clustering algorithm.
function clusterBySimilarity(docs) {
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < docs.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = [docs[i]];
    assigned.add(i);
    for (let j = i + 1; j < docs.length; j++) {
      if (assigned.has(j)) continue;
      if (cosineSimilarity(docs[i].embedding, docs[j].embedding) > CLUSTER_SIMILARITY_THRESHOLD) {
        cluster.push(docs[j]);
        assigned.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

function mostCommonTag(cluster) {
  const counts = {};
  for (const doc of cluster) {
    for (const tag of doc.metadata?.tags || []) {
      if (!tag) continue;
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

function themeFor(cluster) {
  const tag = mostCommonTag(cluster);
  if (tag) return tag.replace(/_/g, ' ');
  const first = cluster[0]?.content || '';
  return first.length > 60 ? `${first.slice(0, 60)}…` : first;
}

/**
 * Detects recurring themes across recent notes for a location by clustering
 * TenantMemory entries with similar embeddings. Requires embeddings to have
 * been populated (i.e. Pinecone/OpenAI configured) — returns no patterns
 * otherwise, which is a safe degrade for the Morning Report.
 */
export async function detectPatterns(organizationId, locationId) {
  await connectDB();
  if (!organizationId) return { patterns: [] };

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const query = {
    organizationId,
    createdAt: { $gte: since },
    memoryType: { $in: ['observation', 'incident'] },
    embedding: { $exists: true, $ne: [] },
  };
  if (locationId) query.locationId = locationId;

  const docs = await TenantMemory.find(query).select('content metadata embedding createdAt').lean();
  if (docs.length < MIN_CLUSTER_SIZE) return { patterns: [] };

  const clusters = clusterBySimilarity(docs).filter((c) => c.length >= MIN_CLUSTER_SIZE);

  const patterns = [];
  for (const cluster of clusters) {
    const dates = cluster.map((d) => new Date(d.createdAt).getTime());
    const assetIds = [...new Set(cluster.map((d) => d.metadata?.assetId).filter(Boolean).map(String))];
    const involvedAssetId = assetIds.length === 1 ? assetIds[0] : null;

    let hasOpenCorrectiveAction = false;
    if (involvedAssetId) {
      hasOpenCorrectiveAction = !!(await CorrectiveAction.exists({
        organizationId,
        assetId: involvedAssetId,
        status: { $ne: 'resolved' },
      }));
    }

    patterns.push({
      theme: themeFor(cluster),
      occurrenceCount: cluster.length,
      firstSeen: new Date(Math.min(...dates)),
      lastSeen: new Date(Math.max(...dates)),
      involvedAssetId,
      notes: cluster.map((d) => d.metadata?.sourceNoteId).filter(Boolean),
      hasOpenCorrectiveAction,
    });
  }

  patterns.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  return { patterns };
}
