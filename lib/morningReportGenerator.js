import axios from 'axios';
import connectDB from './mongodb.js';
import { getUserAccessibleLocationIds } from './scopeByLocation.js';
import { detectPatterns } from './patternDetector.js';

const getModels = async () => {
  const [
    { default: CorrectiveAction },
    { default: Task },
    { default: WalkSession },
    { default: Note },
    { default: Location },
    { default: User },
    { default: Organization },
    { default: MorningReport },
  ] = await Promise.all([
    import('./CorrectiveAction.js'),
    import('./Task.js'),
    import('./WalkSession.js'),
    import('./Note.js'),
    import('./Location.js'),
    import('./User.js'),
    import('./Organization.js'),
    import('./MorningReport.js'),
  ]);
  return { CorrectiveAction, Task, WalkSession, Note, Location, User, Organization, MorningReport };
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
    console.error('[MorningReportGenerator] Failed to parse JSON response:', parseError.message);
    return null;
  }
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Gathers the raw signal for one location: open corrective actions, notes
 * from the last 24h, tasks due, yesterday's walk/end-of-shift answers, and
 * recurring patterns (Pinecone-backed clustering, degrades to none).
 */
async function gatherLocationData(organizationId, locationId, models) {
  const { CorrectiveAction, Task, WalkSession, Note } = models;
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [openCorrective, walkSessionsYesterday, tasksDue, notesLast24h, patternResult] = await Promise.all([
    CorrectiveAction.find({
      organizationId,
      locationId,
      status: { $ne: 'resolved' },
      createdAt: { $gte: since7d },
    }).sort({ createdAt: 1 }).lean(),
    WalkSession.find({
      organizationId,
      locationId,
      createdAt: { $gte: startOfDay(yesterday), $lte: endOfDay(yesterday) },
    }).lean(),
    Task.find({
      organizationId,
      locationId,
      status: { $in: ['open', 'in_progress'] },
      dueDate: { $lte: endOfDay(now) },
    }).lean(),
    Note.find({ organizationId, locationId, createdAt: { $gte: since24h } }).lean(),
    detectPatterns(organizationId, locationId),
  ]);

  const shiftAnswerWalk = walkSessionsYesterday
    .filter((w) => w.endOfShiftAnswers?.opportunity || w.endOfShiftAnswers?.strongPoint)
    .sort((a, b) => new Date(b.endedAt || b.createdAt) - new Date(a.endedAt || a.createdAt))[0];

  return {
    locationId,
    openCorrective,
    walkSessionsYesterday,
    tasksDue,
    notesLast24h,
    patterns: patternResult.patterns,
    endOfShiftAnswers: shiftAnswerWalk?.endOfShiftAnswers || {},
  };
}

/**
 * Flattens gathered data into candidate "events" the AI can pick from —
 * every finding it returns must trace back to one of these, each of which
 * already carries the real source manager name/time so the report never
 * fabricates attribution.
 */
function buildEvents(perLocationData, locationNameById, managerNameById) {
  const events = [];
  for (const data of perLocationData) {
    const locationName = locationNameById[data.locationId.toString()] || 'Unknown location';

    for (const c of data.openCorrective) {
      events.push({
        type: 'corrective_action',
        locationName,
        sourceNoteId: c.sourceNoteId,
        sourceManagerName: managerNameById[c.sourceManagerId?.toString()] || 'Unknown',
        sourceTime: c.createdAt,
        description: c.sourceQuote || '(no description)',
        status: c.status,
        isRepeat: c.isRepeat,
        repeatCount: c.repeatCount,
        severity: c.isIncident || c.isRepeat ? 'high' : 'medium',
      });
    }

    for (const n of data.notesLast24h) {
      for (const issue of n.issues || []) {
        events.push({
          type: 'note_issue',
          locationName,
          sourceNoteId: n._id,
          sourceManagerName: managerNameById[n.userId?.toString()] || 'Unknown',
          sourceTime: n.createdAt,
          description: issue.quote,
          severity: (issue.severityKey || issue.severity || 'medium').toLowerCase(),
        });
      }
    }

    for (const p of data.patterns) {
      events.push({
        type: 'pattern',
        locationName,
        description: `Recurring: "${p.theme}" — ${p.occurrenceCount} similar notes in the last 14 days${p.hasOpenCorrectiveAction ? ' (already has an open corrective action)' : ' (no corrective action opened yet)'}`,
        severity: p.hasOpenCorrectiveAction ? 'medium' : 'high',
      });
    }
  }
  return events;
}

function buildPrompt({ role, restaurantName, events, whatWentRightCandidates, watchCandidates }) {
  return `You are OpsFly, a restaurant operations assistant.
Generate a morning report for a ${role} at ${restaurantName}.

Rules:
- Maximum 3 findings
- Each finding: one recommended action
- Every finding must reference the source (manager name, time) — copy sourceManagerName/sourceTime/sourceNoteId/locationName EXACTLY from the matching event below, never invent them
- Plain language, no jargon
- End with "What went right" — one positive item
- If nothing critical: say so directly

CANDIDATE EVENTS (pick up to 3 most important as findings; ignore the rest):
${JSON.stringify(events)}

WHAT WENT RIGHT CANDIDATES (last shift strong points, pick or summarize one):
${JSON.stringify(whatWentRightCandidates)}

WATCH LIST CANDIDATES (open tasks due today/overdue):
${JSON.stringify(watchCandidates)}

Return ONLY valid JSON:
{
  "generatedAt": "ISO timestamp",
  "role": "${role}",
  "locationName": "string",
  "findings": [
    {
      "title": "string",
      "detail": "string",
      "recommendedAction": "string",
      "severity": "high"|"medium"|"low",
      "sourceManagerName": "string",
      "sourceTime": "ISO timestamp",
      "sourceNoteId": "string or null",
      "priorHistory": "string or null"
    }
  ],
  "whatWentRight": "string",
  "watchList": ["string"]
}`;
}

async function callAIForMorningReport(promptData) {
  const prompt = buildPrompt(promptData);
  const empty = {
    findings: [],
    whatWentRight: 'No standout wins recorded from the last shift.',
    watchList: [],
  };

  if (GEMINI_API_KEY) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
      );
      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        const parsed = parseJSONResponse(content);
        if (parsed) {
          console.log('[MorningReportGenerator] Generated via Gemini');
          return { ...empty, ...parsed };
        }
      }
    } catch (error) {
      console.error('[MorningReportGenerator] Gemini failed:', error.response?.data || error.message);
    }
  }

  console.log('[MorningReportGenerator] Falling back to OpenRouter free models...');
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
        console.log(`[MorningReportGenerator] Generated via OpenRouter ${model}`);
        return { ...empty, ...parsed };
      }
    } catch (error) {
      console.error(`[MorningReportGenerator] OpenRouter ${model} failed:`, error.response?.data?.error || error.message);
      continue;
    }
  }

  return empty;
}

/**
 * Generates (and saves) today's Morning Report for a manager. Scope follows
 * the org's existing role rules (see lib/scopeByLocation.js):
 *   - gm/agm/department_manager: their single location
 *   - district_manager: all of their assigned locations
 *   - owner: every location in the organization
 *
 * organizationId is always taken from the resolved User (JWT), never the
 * request body — every DB read below is additionally scoped to it.
 */
export async function generateMorningReport(user) {
  await connectDB();
  const models = await getModels();
  const { Location, User, Organization, MorningReport } = models;

  const organizationId = user.organizationId;
  const role = user.role;

  const accessibleLocationIds = await getUserAccessibleLocationIds(user);
  const locations = await Location.find({ _id: { $in: accessibleLocationIds }, organizationId }).lean();
  const org = await Organization.findById(organizationId).lean();

  const perLocationData = await Promise.all(
    locations.map((loc) => gatherLocationData(organizationId, loc._id, models))
  );

  const locationNameById = Object.fromEntries(locations.map((l) => [l._id.toString(), l.name]));

  const managerIds = new Set();
  for (const data of perLocationData) {
    data.openCorrective.forEach((c) => c.sourceManagerId && managerIds.add(c.sourceManagerId.toString()));
    data.notesLast24h.forEach((n) => n.userId && managerIds.add(n.userId.toString()));
  }
  const managers = await User.find({ _id: { $in: [...managerIds] } }).select('name').lean();
  const managerNameById = Object.fromEntries(managers.map((m) => [m._id.toString(), m.name]));

  const events = buildEvents(perLocationData, locationNameById, managerNameById);
  const whatWentRightCandidates = perLocationData
    .map((d) => d.endOfShiftAnswers?.strongPoint)
    .filter(Boolean);
  const watchCandidates = perLocationData.flatMap((d) =>
    d.tasksDue.map((t) => ({ title: t.title, priority: t.priority, locationName: locationNameById[d.locationId.toString()] }))
  );

  const isMultiLocation = role === 'district_manager' || role === 'owner';
  const restaurantName = isMultiLocation
    ? org?.name || 'your organization'
    : locations[0]?.name || org?.name || 'your restaurant';

  const ai = await callAIForMorningReport({ role, restaurantName, events, whatWentRightCandidates, watchCandidates });

  const allOpen = perLocationData.flatMap((d) =>
    d.openCorrective.map((c) => ({ ...c, locationName: locationNameById[d.locationId.toString()] }))
  );
  const oldest = [...allOpen].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];

  const openItemsSummary = {
    total: allOpen.length,
    oldest: oldest
      ? { description: oldest.sourceQuote || '(no description)', openSince: oldest.createdAt }
      : null,
    byLocation: isMultiLocation
      ? perLocationData.map((d) => ({
          locationName: locationNameById[d.locationId.toString()],
          count: d.openCorrective.length,
        }))
      : [],
  };

  const findings = (ai.findings || []).slice(0, 3).map((f) => ({
    title: f.title,
    detail: f.detail,
    recommendedAction: f.recommendedAction,
    severity: ['high', 'medium', 'low'].includes(f.severity) ? f.severity : 'medium',
    sourceManagerName: f.sourceManagerName,
    sourceTime: f.sourceTime ? new Date(f.sourceTime) : undefined,
    sourceNoteId: f.sourceNoteId || undefined,
    priorHistory: f.priorHistory || undefined,
  }));

  const report = await MorningReport.create({
    organizationId,
    locationId: isMultiLocation ? null : locations[0]?._id || null,
    managerId: user._id,
    role,
    reportDate: startOfDay(new Date()),
    findings,
    openItemsSummary,
    whatWentRight: ai.whatWentRight || '',
    watchList: ai.watchList || [],
    rawJson: JSON.stringify(ai),
    isRead: false,
    generatedAt: new Date(),
  });

  return report;
}
