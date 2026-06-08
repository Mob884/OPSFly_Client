import axios from 'axios';

// OpsFly Client Operations Analyzer Module - Tweak to trigger redeployment
// TODO: Replace with production OpenAI key when provided
// TODO: Replace with production Gemini key when provided
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

export async function analyzeTranscript(transcript) {
  if (!transcript) {
    return { issues: [] };
  }

  const unifiedPrompt = `${SYSTEM_PROMPT}\n\nTRANSCRIPT TO ANALYZE:\n"${transcript}"`;

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
      
      try {
        let jsonStr = content.replace(/<think>[\s\S]*?<\/think>/g, '');
        jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();
        
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(jsonStr);
        return parsed;
      } catch (parseError) {
        continue; 
      }

    } catch (error) {
      continue; 
    }
  }

  return { issues: [], error: 'All AI models failed' };
}
