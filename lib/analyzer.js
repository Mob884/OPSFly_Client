import axios from 'axios';
import connectDB from './mongodb';
import Organization from './Organization';

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

// Fallback prompt used when an org has no IndustryConfig (or none can be
// loaded) — kept byte-for-byte identical to the original hardcoded prompt
// so existing behavior is unchanged for any org not yet migrated.
const EXISTING_HARDCODED_PROMPT = `You are an operations issue detector for the hospitality industry.
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

const CATEGORY_KEY_MAP = { Staffing: 'staffing', 'Cost Risk': 'cost_risk', Maintenance: 'maintenance', Other: 'other' };
const SEVERITY_KEY_MAP = { High: 'high', Medium: 'medium', Low: 'low' };

// Adds categoryKey/severityKey alongside the existing type/severity fields
// on every detected issue, so both the old and new formats are always
// present in the response — existing frontends keep working unchanged.
function enrichIssues(parsed) {
  if (!parsed || !Array.isArray(parsed.issues)) return parsed;
  parsed.issues = parsed.issues.map((issue) => ({
    ...issue,
    categoryKey: issue.categoryKey || CATEGORY_KEY_MAP[issue.type] || 'other',
    severityKey: issue.severityKey || SEVERITY_KEY_MAP[issue.severity] || 'medium',
  }));
  return parsed;
}

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

/**
 * @param {string} transcript
 * @param {string} [organizationId] optional — when provided, loads that
 *   org's IndustryConfig for a dynamic, industry-specific prompt. Falls
 *   back to the original hardcoded prompt if not provided or not found.
 */
export async function analyzeTranscript(transcript, organizationId) {
  if (!transcript) {
    return { issues: [] };
  }

  let systemPrompt;
  let issueCategories;

  if (organizationId) {
    try {
      await connectDB();
      const org = await Organization.findById(organizationId).populate('configTemplateId');
      if (org && org.configTemplateId) {
        systemPrompt = org.configTemplateId.onboardingPrompts?.issueDetection;
        issueCategories = (org.configTemplateId.issueCategories || []).map((c) => c.key).join(' | ');
      }
    } catch (e) {
      console.warn('[Analyzer] Could not load IndustryConfig, using defaults:', e.message);
    }
  }

  // fallback to existing hardcoded prompt if config not found
  if (!systemPrompt) {
    systemPrompt = EXISTING_HARDCODED_PROMPT;
    issueCategories = 'staffing | cost_risk | maintenance | other';
  }

  // inject dynamic categories into prompt, if the prompt has the placeholder
  const finalPrompt = systemPrompt.replace('{ISSUE_CATEGORIES}', issueCategories);

  const unifiedPrompt = `${finalPrompt}\n\nTRANSCRIPT TO ANALYZE:\n"${transcript}"`;

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
          return enrichIssues(parsed);
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
        return enrichIssues(parsed);
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
