import axios from 'axios';
import connectDB from './mongodb.js';

// Models — imported here to register schemas before queries
// These are dynamically imported to avoid circular issues in serverless
const getModels = async () => {
  const [{ default: Note }, { default: Task }, { default: DailySummary }] = await Promise.all([
    import('./Note.js'),
    import('./Task.js'),
    import('./DailySummary.js'),
  ]);
  return { Note, Task, DailySummary };
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = 'https://openrouter.ai/api/v1';
const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

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

      let content = response.data.choices[0].message.content;
      // Strip <think>...</think> tags (some models include reasoning)
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
      content = content.replace(/```json\n?|\n?```/g, '').trim();
      const first = content.indexOf('{');
      const last = content.lastIndexOf('}');
      if (first !== -1 && last !== -1) {
        const parsed = JSON.parse(content.substring(first, last + 1));
        return {
          keyConcerns: parsed.keyConcerns || [],
          recommendedActions: parsed.recommendedActions || [],
        };
      }
    } catch {
      continue;
    }
  }

  return { keyConcerns: [], recommendedActions: [] };
}

/**
 * Generate (or refresh) the daily summary for a given date.
 * Upserts into DailySummary collection.
 * // M4: aggregate tasks for daily summary
 *
 * @param {Date|string} date - The day to summarise
 * @returns {Promise<DailySummary>} The saved summary document
 */
export async function generateDailySummary(date = new Date()) {
  await connectDB();
  const { Note, Task, DailySummary } = await getModels();

  const dayStart = startOfDay(date);
  const dayEnd   = endOfDay(date);

  // 1. Fetch all notes created today
  const notes = await Note.find({ createdAt: { $gte: dayStart, $lte: dayEnd } }).lean();

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

  // 4. Count tasks created today
  const allTasks     = await Task.find({ createdAt: { $gte: dayStart, $lte: dayEnd } }).lean();
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;

  // 5. Call AI for key concerns + actions (falls back gracefully)
  const { keyConcerns, recommendedActions } = await callAIForSummary(allIssues);

  // 6. Upsert — if summary for this day exists, replace it
  const summary = await DailySummary.findOneAndUpdate(
    { date: dayStart },
    {
      date: dayStart,
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
