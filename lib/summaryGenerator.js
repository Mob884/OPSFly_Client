import axios from 'axios';
import connectDB from './mongodb.js';

// Models — imported here to register schemas before queries
// These are dynamically imported to avoid circular issues in serverless
const getModels = async () => {
  const [{ default: Note }, { default: Task }, { default: DailySummary }, { default: Location }] = await Promise.all([
    import('./Note.js'),
    import('./Task.js'),
    import('./DailySummary.js'),
    import('./Location.js'),
  ]);
  return { Note, Task, DailySummary, Location };
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

/**
 * Helper to safely extract and parse JSON from LLM response.
 */
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
    console.error(`[SummaryGenerator] Failed to parse JSON response:`, parseError.message);
    return null;
  }
}

// TODO: Replace with production API key when provided
const SUMMARY_SYSTEM_PROMPT = `You are an operations analyst for a hospitality business.
Given the following list of operational issues detected today,
generate a concise daily summary.

Return ONLY valid JSON, no markdown, no explanation:
{
  "keyConcerns": [
    "Short staffing impacted service during lunch and dinner",
    "Bar pour cost is above target"
  ],
  "recommendedActions": [
    "Adjust staffing schedule for tomorrow",
    "Monitor bar pours tonight",
    "Fix entrance presentation"
  ]
}

Keep keyConcerns to max 3 most critical points.
Keep recommendedActions to max 3 actionable items.
Be concise and direct.`;

/** Returns start of day (midnight) for a Date or date string */
export function startOfDay(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Returns end of day (23:59:59) for a Date or date string */
export function endOfDay(d) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Generate AI key concerns + recommended actions from issue list.
 * Falls back to empty arrays if AI fails.
 */
async function callAIForSummary(issues) {
  if (!issues.length) return { keyConcerns: [], recommendedActions: [] };

  const issueList = issues.map(i => `- [${i.severity}] ${i.type}: "${i.quote}"`).join('\n');
  const userPrompt = `${SUMMARY_SYSTEM_PROMPT}\n\nTODAY'S ISSUES:\n${issueList}`;

  // 1. Try Google Gemini API directly
  if (GEMINI_API_KEY) {
    try {
      console.log('[SummaryGenerator] Attempting summary generation with Google Gemini API (gemini-2.5-flash)...');
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000
        }
      );

      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        console.log('[SummaryGenerator] Raw Gemini response:', content);
        const parsed = parseJSONResponse(content);
        if (parsed) {
          console.log('[SummaryGenerator] Successfully generated summary using Google Gemini API');
          return {
            keyConcerns: parsed.keyConcerns || [],
            recommendedActions: parsed.recommendedActions || [],
          };
        }
      }
    } catch (error) {
      const errorData = error.response?.data || error.message;
      console.error('[SummaryGenerator] Google Gemini API failed:', errorData);
    }
  }

  // 2. Fallback to OpenRouter free models
  console.log('[SummaryGenerator] Falling back to OpenRouter free models...');
  for (const model of MODELS) {
    try {
      const response = await axios.post(`${BASE_URL}/chat/completions`, {
        model,
        messages: [{ role: 'user', content: userPrompt }],
      }, {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ops-fly-client.vercel.app',
          'X-Title': 'OpsFly',
        },
        timeout: 25000,
      });

      const content = response.data.choices[0].message.content;
      console.log(`[SummaryGenerator] Raw AI response from OpenRouter model ${model}:`, content);

      const parsed = parseJSONResponse(content);
      if (parsed) {
        console.log(`[SummaryGenerator] Successfully generated summary using OpenRouter ${model}`);
        return {
          keyConcerns: parsed.keyConcerns || [],
          recommendedActions: parsed.recommendedActions || [],
        };
      }
    } catch (error) {
      const errorData = error.response?.data?.error || error.message;
      console.error(`[SummaryGenerator] Error with OpenRouter model ${model}:`, errorData);
      continue;
    }
  }

  return { keyConcerns: [], recommendedActions: [] };
}

/**
 * Generate (or refresh) the daily summary for a given date and location.
 * Upserts into DailySummary collection.
 *
 * @param {Date|string} date - The day to summarise
 * @param {string} locationId - The active location ID
 * @returns {Promise<DailySummary>} The saved summary document
 */
export async function generateDailySummary(date = new Date(), locationId) {
  if (!locationId) {
    throw new Error('locationId is required for generateDailySummary');
  }

  await connectDB();
  const { Note, Task, DailySummary, Location } = await getModels();

  const location = await Location.findById(locationId);
  if (!location) {
    throw new Error('Location not found');
  }

  const dayStart = startOfDay(date);
  const dayEnd   = endOfDay(date);

  // 1. Fetch all notes created today at this location
  const notes = await Note.find({ locationId, createdAt: { $gte: dayStart, $lte: dayEnd } }).lean();

  // 2. Flatten all issues across notes
  const allIssues = notes.flatMap(n => n.issues || []);

  // 3. Count by type
  const counts = { staffing: 0, cost: 0, maintenance: 0, other: 0 };
  allIssues.forEach(issue => {
    const t = (issue.type || '').toLowerCase();
    if (t.includes('staffing'))    counts.staffing++;
    else if (t.includes('cost'))   counts.cost++;
    else if (t.includes('maint'))  counts.maintenance++;
    else                           counts.other++;
  });

  // 4. Count tasks created today at this location
  const allTasks     = await Task.find({ locationId, createdAt: { $gte: dayStart, $lte: dayEnd } }).lean();
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;

  // 5. Call AI for key concerns + actions (falls back gracefully)
  const { keyConcerns, recommendedActions } = await callAIForSummary(allIssues);

  // 6. Upsert — if summary for this day and location exists, replace it
  const summary = await DailySummary.findOneAndUpdate(
    { date: dayStart, locationId },
    {
      date: dayStart,
      locationId,
      organizationId: location.organizationId,
      totalIssues:       allIssues.length,
      staffingIssues:    counts.staffing,
      costRisks:         counts.cost,
      maintenanceIssues: counts.maintenance,
      otherIssues:       counts.other,
      totalTasks:        allTasks.length,
      completedTasks,
      keyConcerns,
      recommendedActions,
      rawNoteIds: notes.map(n => n._id),
      generatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return summary;
}
