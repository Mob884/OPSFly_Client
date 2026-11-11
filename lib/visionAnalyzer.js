import axios from 'axios';
import { parseJSONResponse, enrichIssues } from './analyzer';

// M5: photo capture. Primary model is GPT-4o Vision (OpenAI); if that call
// fails (no credit, rate limit, outage) Gemini's multimodal API is used so a
// photo never blocks a note from being saved.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o';

const PROMPT = `You are an operations assistant for a restaurant or hotel manager.
A manager attached this photo to an observation. Describe only what is visibly
there that matters for operations (equipment, damage, leaks, cleanliness,
temperature displays, safety hazards, stock levels), and combine it with the
manager's spoken or typed note when one is given.

Return ONLY valid JSON, no markdown:
{
  "description": "1-2 plain sentences of what the photo shows",
  "equipmentHint": "the main piece of equipment, vendor type or area visible (e.g. walk-in cooler, fryer, dish pit), or empty string",
  "tags": ["short", "keywords"],
  "issues": [
    {
      "type": "Staffing | Cost Risk | Maintenance | Other",
      "severity": "High | Medium | Low",
      "quote": "what is visibly wrong, in the manager's plain words",
      "suggestedTask": "short actionable task title"
    }
  ]
}
Only list issues you can actually see or that the note states. If the photo shows
nothing wrong, return an empty issues array. Never invent details.`;

function buildUserText(transcript) {
  return transcript?.trim()
    ? `${PROMPT}\n\nMANAGER NOTE: "${transcript.trim()}"`
    : PROMPT;
}

async function viaOpenAI(dataUrl, transcript) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: VISION_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildUserText(transcript) },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          ],
        },
      ],
    },
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  return response.data?.choices?.[0]?.message?.content;
}

async function viaGemini(buffer, mimeType, transcript) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildUserText(transcript) },
            { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json' },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

/**
 * @returns {{description:string, equipmentHint:string, tags:string[], issues:object[], model:string} | null}
 *   null when every provider failed (caller saves the photo without analysis).
 */
export async function analyzePhoto({ buffer, mimeType, transcript }) {
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
  const attempts = [];
  if (OPENAI_API_KEY) attempts.push(['openai', () => viaOpenAI(dataUrl, transcript)]);
  if (GEMINI_API_KEY) attempts.push(['gemini', () => viaGemini(buffer, mimeType, transcript)]);

  for (const [name, run] of attempts) {
    try {
      const content = await run();
      const parsed = content ? parseJSONResponse(content) : null;
      if (parsed) {
        const enriched = enrichIssues({ issues: Array.isArray(parsed.issues) ? parsed.issues : [] });
        console.log(`[VisionAnalyzer] Analyzed via ${name}`);
        return {
          description: String(parsed.description || '').trim(),
          equipmentHint: String(parsed.equipmentHint || '').trim(),
          tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [],
          issues: enriched.issues,
          model: name === 'openai' ? VISION_MODEL : 'gemini-2.5-flash',
        };
      }
    } catch (error) {
      console.error(`[VisionAnalyzer] ${name} failed:`, error.response?.data?.error?.message || error.response?.data || error.message);
    }
  }
  console.error('[VisionAnalyzer] All vision providers failed');
  return null;
}
