import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = 'https://openrouter.ai/api/v1';

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'tencent/hy3-preview:free',
  'nvidia/nemotron-3-super-120b-a12b:free'
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
    console.error(`[Analyzer] Failed to parse JSON response:`, parseError.message);
    return null;
  }
}

export async function analyzeTranscript(transcript) {
  if (!transcript) {
    return { issues: [] };
  }

  const unifiedPrompt = `${SYSTEM_PROMPT}\n\nTRANSCRIPT TO ANALYZE:\n"${transcript}"`;

  // 1. Try Google Gemini API directly
  if (GEMINI_API_KEY) {
    try {
      console.log('[Analyzer] Attempting client-side analysis with Google Gemini API (gemini-2.5-flash)...');
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ role: 'user', parts: [{ text: unifiedPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000
        }
      );

      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        console.log('[Analyzer] Raw Gemini response:', content);
        const parsed = parseJSONResponse(content);
        if (parsed) {
          console.log('[Analyzer] Successfully analyzed using Google Gemini API');
          return parsed;
        }
      }
    } catch (error) {
      const errorData = error.response?.data || error.message;
      console.error('[Analyzer] Google Gemini API failed:', errorData);
    }
  }

  // 2. Fallback to OpenRouter free models
  console.log('[Analyzer] Falling back to OpenRouter free models...');
  for (const model of MODELS) {
    try {
      console.log(`[Analyzer] Attempting analysis with model: ${model}`);
      
      const response = await axios.post(`${BASE_URL}/chat/completions`, {
        model: model,
        messages: [
          { role: 'user', content: unifiedPrompt }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://opsfly-fred.vercel.app',
          'X-Title': 'OpsFly'
        },
        timeout: 25000 
      });

      const content = response.data.choices[0].message.content;
      console.log(`[Analyzer] Raw AI response from OpenRouter model ${model}:`, content);

      const parsed = parseJSONResponse(content);
      if (parsed) {
        console.log(`[Analyzer] Successfully analyzed using OpenRouter ${model}`);
        return parsed;
      }
    } catch (error) {
      const errorData = error.response?.data?.error || error.message;
      console.error(`[Analyzer] Error with OpenRouter model ${model}:`, errorData);
      continue; 
    }
  }

  console.error('[Analyzer] All models failed to analyze transcript');
  return { issues: [], error: 'All AI models failed' };
}
