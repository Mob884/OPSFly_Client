import axios from 'axios';
import connectDB from './mongodb';
import TenantMemory from './TenantMemory';
import BusinessDNAEntry from './BusinessDNAEntry';
import CorrectiveAction from './CorrectiveAction';
import Asset from './Asset';
import Vendor from './Vendor';
import { queryMemory, mongoTextSearch, isVectorStoreConfigured } from './vectorStore';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = 'https://openrouter.ai/api/v1';
const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

const RELEVANCE_THRESHOLD = 0.75;
const MAX_PRIOR_INCIDENTS = 3;

function daysAgo(date) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Splits Pinecone matches by which collection they came from (tagged via
 * metadata.source at index time — see vectorStore.js callers) and fetches
 * the full, tenant-scoped documents.
 */
async function fetchMatchedDocs(organizationId, matches) {
  const idsBySource = { tenant_memory: [], dna_entry: [], corrective_action: [] };
  for (const m of matches) {
    const source = m.metadata?.source;
    if (source && idsBySource[source]) idsBySource[source].push(m.id);
  }

  const [memories, dnaEntries, correctiveActions] = await Promise.all([
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

  return { memories, dnaEntries, correctiveActions };
}

function correctiveActionToIncident(action) {
  const outcome = action.status === 'resolved' ? 'resolved' : action.isRepeat ? 'repeat' : 'pending';
  const date = action.resolvedAt || action.actionTakenAt || action.createdAt;
  return {
    date,
    description: action.sourceQuote || '(no description)',
    actionTaken: action.actionTaken || null,
    outcome,
    managerId: action.sourceManagerId || null,
    daysAgo: daysAgo(date),
    correctiveActionId: action._id,
  };
}

function memoryToIncident(doc) {
  return {
    date: doc.createdAt,
    description: doc.content || doc.title || '(no description)',
    actionTaken: null,
    outcome: 'pending',
    managerId: null,
    daysAgo: daysAgo(doc.createdAt),
    correctiveActionId: null,
  };
}

async function generateRecallSummary(priorIncidents) {
  const empty = '';
  const prompt = `Summarize this equipment history for a restaurant manager
in 2-3 sentences. Be direct. Tell them what happened before and
whether the fix held. Data: ${JSON.stringify(priorIncidents)}
Return only the plain text summary, no JSON.`;

  if (GEMINI_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
      );
      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content?.trim()) return content.trim();
    } catch (error) {
      console.error('[recallService] Gemini failed:', error.response?.data || error.message);
    }
  }

  for (const model of MODELS) {
    try {
      const response = await axios.post(
        `${BASE_URL}/chat/completions`,
        { model, messages: [{ role: 'user', content: prompt }] },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://ops-fly-client.vercel.app',
            'X-Title': 'OpsFly',
          },
          timeout: 25000,
        }
      );
      const content = response.data.choices[0].message.content;
      if (content?.trim()) return content.trim();
    } catch (error) {
      console.error(`[recallService] OpenRouter ${model} failed:`, error.response?.data?.error || error.message);
      continue;
    }
  }

  return empty;
}

/**
 * Surfaces relevant history at the moment a note is captured.
 * CRITICAL: every lookup below is scoped to organizationId — never returns
 * another org's data.
 */
export async function recallAtCapture(organizationId, locationId, noteContent, issues = [], assetId, vendorId) {
  await connectDB();

  const empty = { hasHistory: false, priorIncidents: [], relatedAsset: null, relatedVendor: null, recallSummary: '' };
  if (!organizationId) return empty;

  const queryText = [noteContent, ...(issues || []).map((i) => i.quote).filter(Boolean)].join(' ').trim();

  let memories = [];
  let dnaEntries = [];
  let correctiveActionsFromSearch = [];

  try {
    if (isVectorStoreConfigured()) {
      const filter = locationId ? { locationId: locationId.toString() } : {};
      const matches = (await queryMemory(organizationId, queryText, 8, filter)) || [];
      const relevant = matches.filter((m) => (m.score || 0) > RELEVANCE_THRESHOLD);
      const fetched = await fetchMatchedDocs(organizationId, relevant);
      memories = fetched.memories;
      dnaEntries = fetched.dnaEntries;
      correctiveActionsFromSearch = fetched.correctiveActions;
    } else {
      memories = await mongoTextSearch(TenantMemory, organizationId, queryText, 8, locationId ? { locationId } : {});
    }
  } catch (e) {
    console.error('[recallService] Search failed:', e.message);
  }

  // Corrective actions tied to this exact asset are always relevant,
  // regardless of semantic score.
  let assetCorrectiveActions = [];
  if (assetId) {
    try {
      assetCorrectiveActions = await CorrectiveAction.find({ organizationId, assetId }).sort({ createdAt: -1 }).lean();
    } catch (e) {
      console.error('[recallService] Asset corrective action lookup failed:', e.message);
    }
  }

  const seenCorrectiveIds = new Set();
  const priorIncidents = [];
  for (const action of [...assetCorrectiveActions, ...correctiveActionsFromSearch]) {
    const id = action._id.toString();
    if (seenCorrectiveIds.has(id)) continue;
    seenCorrectiveIds.add(id);
    priorIncidents.push(correctiveActionToIncident(action));
  }
  for (const doc of [...memories, ...dnaEntries]) {
    priorIncidents.push(memoryToIncident(doc));
  }

  priorIncidents.sort((a, b) => new Date(b.date) - new Date(a.date));
  const trimmedIncidents = priorIncidents.slice(0, MAX_PRIOR_INCIDENTS);

  const [relatedAsset, relatedVendor] = await Promise.all([
    assetId ? Asset.findOne({ _id: assetId, organizationId }).lean() : null,
    vendorId ? Vendor.findOne({ _id: vendorId, organizationId }).lean() : null,
  ]);

  const hasHistory = trimmedIncidents.length > 0;
  const recallSummary = hasHistory ? await generateRecallSummary(trimmedIncidents) : '';

  return {
    hasHistory,
    priorIncidents: trimmedIncidents,
    relatedAsset,
    relatedVendor,
    recallSummary,
  };
}
