import axios from 'axios';

// Directly call OpenRouter from frontend (User's request to fix production)
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || 'REDACTED_KEY';
const BASE_URL = 'https://openrouter.ai/api/v1';

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'openai/gpt-oss-120b:free'
];

const SYSTEM_PROMPT = `You are an operations issue detector for the hospitality industry. 
Analyze the following voice note transcript and extract all operational 
issues mentioned.

For each issue return:
- type: category of issue (Staffing | Cost Risk | Maintenance | Other)
- severity: (High | Medium | Low)
- quote: the exact phrase from the transcript that triggered this issue
- suggestedTask: a short actionable task title

Return ONLY a valid JSON object in this exact format, no explanation, 
no markdown, no extra text:

{
  "issues": [
    {
      "type": "Staffing",
      "severity": "High",
      "quote": "2 employees didn't show up this morning",
      "suggestedTask": "Review staffing coverage"
    }
  ]
}

If no issues are found return: { "issues": [] }`;

const api = axios.create({
  baseURL: '', 
  timeout: 60000, 
});

/**
 * AI Analysis — Performed DIRECTLY on the client to bypass backend routing issues.
 */
export async function analyzeNote(transcript) {
  if (!transcript) return { issues: [] };

  const unifiedPrompt = `${SYSTEM_PROMPT}\n\nTRANSCRIPT TO ANALYZE:\n"${transcript}"`;

  for (const model of MODELS) {
    try {
      console.log(`[Frontend Analyzer] Attempting with model: ${model}`);
      
      const response = await axios.post(`${BASE_URL}/chat/completions`, {
        model: model,
        messages: [
          { role: 'user', content: unifiedPrompt }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://opsfly-client.vercel.app',
          'X-Title': 'OpsFly'
        },
        timeout: 30000 
      });

      const content = response.data.choices[0].message.content;
      
      let jsonStr = content.replace(/<think>[\s\S]*?<\/think>/g, '');
      jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();
      
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }

      return JSON.parse(jsonStr);
    } catch (err) {
      console.error(`[Frontend Analyzer] Model ${model} failed`, err);
      continue;
    }
  }

  return { issues: [], error: 'All AI models failed' };
}

/**
 * Save a note to the database (Still calls the backend API)
 */
export async function saveNote(data) {
  const response = await api.post('/api/notes/save', data);
  return response.data;
}

/**
 * Fetch all notes
 */
export async function getNotes() {
  const response = await api.get('/api/notes');
  return response.data;
}

/**
 * Delete a specific note
 */
export async function deleteNote(id) {
  const response = await api.delete(`/api/notes/${id}`);
  return response.data;
}

export default api;
