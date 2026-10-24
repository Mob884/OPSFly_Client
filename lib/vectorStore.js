import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Pinecone is optional until Fred provisions an account/index. Every function
// below degrades gracefully to `null` when it's not configured — callers
// fall back to MongoDB text search (see mongoTextSearch below).
const pinecone = process.env.PINECONE_API_KEY
  ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  : null;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function isVectorStoreConfigured() {
  return !!pinecone;
}

/**
 * Generates an embedding for arbitrary text using OpenAI.
 */
export async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    input: (text || '').slice(0, 8000), // token limit safety
  });
  return response.data[0].embedding;
}

/**
 * Upserts a memory into Pinecone.
 * CRITICAL: namespace is always organizationId — strict tenant isolation.
 * Returns the embedding on success, null when Pinecone isn't configured.
 */
export async function upsertMemory(organizationId, id, text, metadata = {}) {
  if (!pinecone) {
    console.warn('[vectorStore] Pinecone not configured — skipping vector upsert');
    return null;
  }
  if (!organizationId || !id || !text?.trim()) return null;

  const embedding = await generateEmbedding(text);
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

  await index.namespace(organizationId.toString()).upsert([
    {
      id: id.toString(),
      values: embedding,
      metadata: {
        organizationId: organizationId.toString(),
        ...sanitizeMetadata(metadata),
      },
    },
  ]);

  return embedding;
}

/**
 * Queries Pinecone for memories similar to queryText.
 * CRITICAL: always queried within the organizationId namespace.
 * Returns null (caller must fall back to Mongo) when not configured.
 */
export async function queryMemory(organizationId, queryText, topK = 5, filter = {}) {
  if (!pinecone) {
    console.warn('[vectorStore] Pinecone not configured — caller should use MongoDB fallback');
    return null;
  }
  if (!organizationId || !queryText?.trim()) return [];

  const queryEmbedding = await generateEmbedding(queryText);
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

  const results = await index.namespace(organizationId.toString()).query({
    vector: queryEmbedding,
    topK,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    includeMetadata: true,
  });

  return results.matches || [];
}

/**
 * Deletes a memory from Pinecone. No-op when not configured.
 */
export async function deleteMemory(organizationId, id) {
  if (!pinecone || !organizationId || !id) return null;
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
  await index.namespace(organizationId.toString()).deleteOne(id.toString());
  return true;
}

/**
 * MongoDB $text fallback search, used whenever Pinecone isn't configured.
 * `Model` must have a text index (see TenantMemory/BusinessDNAEntry).
 */
export async function mongoTextSearch(Model, organizationId, queryText, limit = 5, extraQuery = {}) {
  if (!queryText?.trim()) return [];
  return Model.find({
    organizationId,
    ...extraQuery,
    $text: { $search: queryText },
  })
    .select({ score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
}

// Pinecone metadata values must be string | number | boolean | string[].
// Strips undefined/null/ObjectId-shaped values down to plain strings.
function sanitizeMetadata(metadata) {
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      clean[key] = value.map((v) => v.toString());
    } else if (typeof value === 'object') {
      clean[key] = value.toString();
    } else {
      clean[key] = value;
    }
  }
  return clean;
}
