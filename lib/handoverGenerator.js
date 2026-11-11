import axios from 'axios';
import connectDB from './mongodb.js';

// Models — dynamically imported to avoid circular issues in serverless,
// matching the convention in summaryGenerator.js.
const getModels = async () => {
  const [
    { default: CorrectiveAction },
    { default: Task },
    { default: WalkSession },
    { default: ShiftHandover },
  ] = await Promise.all([
    import('./CorrectiveAction.js'),
    import('./Task.js'),
    import('./WalkSession.js'),
    import('./ShiftHandover.js'),
  ]);
  return { CorrectiveAction, Task, WalkSession, ShiftHandover };
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = 'https://openrouter.ai/api/v1';
const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

function parseJSONResponse(content) {
  try {
    let jsonStr = content.replace(/<think>[\s\S]*?<\/think>/g, '');
    jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();

    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('[HandoverGenerator] Failed to parse JSON response:', parseError.message);
    return null;
  }
}

function buildPrompt({ correctiveActions, openTasks, lastShiftAnswers }) {
  const correctiveList = correctiveActions.length
    ? correctiveActions.map((c) => `- [${c.status}] ${c.sourceQuote || '(no quote)'} (opened ${c.createdAt?.toISOString?.() || c.createdAt})`).join('\n')
    : '(none)';
  const taskList = openTasks.length
    ? openTasks.map((t) => `- [${t.priority}] ${t.title}`).join('\n')
    : '(none)';

  return `You are OpsFly, an operations assistant for restaurant managers.
Generate a shift handover recap for the incoming manager.
Be concise — 2-3 items maximum per section. Plain language.
Use this data:

Open corrective actions:
${correctiveList}

Open tasks:
${taskList}

Last shift end-of-shift answers:
  Opportunity: ${lastShiftAnswers.opportunity || '(none recorded)'}
  Strong Point: ${lastShiftAnswers.strongPoint || '(none recorded)'}

Return ONLY valid JSON, no markdown, no explanation:
{
  "openItems": [
    { "description": "string", "severity": "high"|"medium"|"low", "openSince": "ISO date string" }
  ],
  "watchItems": [
    { "description": "string", "reason": "string" }
  ],
  "changedLastShift": [
    { "description": "string" }
  ],
  "rawSummary": "2-3 sentence plain text summary"
}`;
}

async function callAIForHandover(promptData) {
  const prompt = buildPrompt(promptData);
  const empty = { openItems: [], watchItems: [], changedLastShift: [], rawSummary: '' };

  if (GEMINI_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
      );
      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        const parsed = parseJSONResponse(content);
        if (parsed) {
          console.log('[HandoverGenerator] Generated via Gemini');
          return { ...empty, ...parsed };
        }
      }
    } catch (error) {
      console.error('[HandoverGenerator] Gemini failed:', error.response?.data || error.message);
    }
  }

  console.log('[HandoverGenerator] Falling back to OpenRouter free models...');
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
      const parsed = parseJSONResponse(content);
      if (parsed) {
        console.log(`[HandoverGenerator] Generated via OpenRouter ${model}`);
        return { ...empty, ...parsed };
      }
    } catch (error) {
      console.error(`[HandoverGenerator] OpenRouter ${model} failed:`, error.response?.data?.error || error.message);
      continue;
    }
  }

  // Every AI provider failed. Flag it so the caller builds the recap from the
  // data instead of handing the next manager a falsely empty handover.
  return { ...empty, _aiFailed: true };
}

/**
 * Deterministic recap built straight from the open records, used only when
 * every AI provider fails. Plainer than the AI version but never claims
 * "nothing open" while issues are open.
 */
function buildFallbackHandover({ correctiveActions, openTasks }) {
  const openItems = correctiveActions
    .map((c) => ({
      description: c.sourceQuote || '(no description)',
      severity: c.isIncident || c.isRepeat ? 'high' : 'medium',
      openSince: c.createdAt,
    }))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1))
    .slice(0, 8);
  const watchItems = openTasks
    .filter((t) => String(t.priority || '').toLowerCase() === 'high')
    .slice(0, 5)
    .map((t) => ({ description: t.title, reason: 'High priority task still open' }));
  return {
    openItems,
    watchItems,
    changedLastShift: [],
    rawSummary: `${correctiveActions.length} open issue(s) and ${openTasks.length} open task(s) carried over from the last shift.`,
  };
}

/**
 * Generates (and saves) a ShiftHandover for a location — the recap the next
 * manager sees when they open the app. Falls back to an empty-but-valid
 * handover if the AI call fails, so the save always succeeds.
 */
export async function generateShiftHandover(locationId, organizationId, previousWalkSessionId) {
  await connectDB();
  const { CorrectiveAction, Task, WalkSession, ShiftHandover } = await getModels();

  const [correctiveActions, openTasks, lastWalk] = await Promise.all([
    CorrectiveAction.find({ organizationId, locationId, status: { $ne: 'resolved' } }).lean(),
    Task.find({ organizationId, locationId, status: { $in: ['open', 'in_progress'] } }).lean(),
    WalkSession.findOne({ organizationId, locationId, status: 'completed' }).sort({ endedAt: -1 }).lean(),
  ]);

  const lastShiftAnswers = {
    opportunity: lastWalk?.endOfShiftAnswers?.opportunity || '',
    strongPoint: lastWalk?.endOfShiftAnswers?.strongPoint || '',
  };

  let ai = await callAIForHandover({ correctiveActions, openTasks, lastShiftAnswers });
  if (ai._aiFailed) {
    console.error('[HandoverGenerator] All AI providers failed; using deterministic fallback handover');
    ai = buildFallbackHandover({ correctiveActions, openTasks });
  }

  // Link openItems back to their source records where we can match by
  // description containment — best-effort, not required for the handover
  // to be useful.
  const openItems = (ai.openItems || []).map((item) => {
    const match = correctiveActions.find((c) => c.sourceQuote && item.description?.includes(c.sourceQuote.slice(0, 20)));
    return {
      description: item.description,
      severity: item.severity || 'medium',
      openSince: item.openSince ? new Date(item.openSince) : match?.createdAt || new Date(),
      sourceNoteId: match?.sourceNoteId,
      correctiveActionId: match?._id,
    };
  });

  const handover = await ShiftHandover.create({
    organizationId,
    locationId,
    generatedAt: new Date(),
    previousWalkSessionId,
    outgoingManagerId: lastWalk?.managerId,
    openItems,
    watchItems: ai.watchItems || [],
    changedLastShift: ai.changedLastShift || [],
    lastShiftAnswers,
    rawSummary: ai.rawSummary || '',
    isRead: false,
  });

  return handover;
}
