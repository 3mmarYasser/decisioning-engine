import OpenAI from 'openai';
import type { AllowedClaim, LlmCopyResponse } from '@decisioning/shared-types';
import { randomUUID } from 'crypto';

const ALLOWED_CLAIMS: AllowedClaim[] = [
  { id: 'claim-1', text: 'Trusted by over 10,000 businesses worldwide' },
  { id: 'claim-2', text: 'GDPR-compliant personalisation out of the box' },
  { id: 'claim-3', text: 'Increase conversions by up to 35% with smart variants' },
  { id: 'claim-4', text: 'Zero latency — decisions at the edge in under 50ms' },
  { id: 'claim-5', text: 'No cookies required for consent-safe targeting' },
];

const FALLBACK_RESPONSE: LlmCopyResponse = {
  headline1: 'Personalise every visit — no cookies needed',
  headline2: 'Smart, consent-safe experiences at the edge',
  usedClaimIds: ['claim-2', 'claim-5'],
};

const VALID_TONES = ['professional', 'casual', 'bold', 'friendly'] as const;
const VALID_AUDIENCES = ['marketing teams', 'developers', 'executives'] as const;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_allowed_claims',
      description:
        'Returns the list of pre-approved marketing claims that may be referenced in headlines.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000 });
}

function validateUsedClaims(usedClaimIds: string[]): boolean {
  const allowedIds = new Set(ALLOWED_CLAIMS.map((c) => c.id));
  return usedClaimIds.every((id) => allowedIds.has(id));
}

function parseModelOutput(content: string): LlmCopyResponse | null {
  try {
    const parsed = JSON.parse(content);
    if (isValidCopyResponse(parsed)) return parsed;
  } catch {
    // Try extracting JSON from markdown fences or prose
  }

  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (isValidCopyResponse(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function isValidCopyResponse(obj: unknown): obj is LlmCopyResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as LlmCopyResponse).headline1 === 'string' &&
    typeof (obj as LlmCopyResponse).headline2 === 'string' &&
    Array.isArray((obj as LlmCopyResponse).usedClaimIds) &&
    (obj as LlmCopyResponse).usedClaimIds.every((id) => typeof id === 'string')
  );
}

interface LlmTrace {
  requestId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  validationPassed: boolean;
  retryCount: number;
}

export function sanitizeTone(input: string): string {
  return VALID_TONES.includes(input as (typeof VALID_TONES)[number]) ? input : 'professional';
}

export function sanitizeAudience(input: string): string {
  return VALID_AUDIENCES.includes(input as (typeof VALID_AUDIENCES)[number])
    ? input
    : 'marketing teams';
}

export async function generateCopy(
  tone: string = 'professional',
  targetAudience: string = 'marketing teams',
): Promise<{ result: LlmCopyResponse; trace: LlmTrace }> {
  const requestId = randomUUID();
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const startTime = Date.now();

  const safeTone = sanitizeTone(tone);
  const safeAudience = sanitizeAudience(targetAudience);

  const trace: LlmTrace = {
    requestId,
    model,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    validationPassed: false,
    retryCount: 0,
  };

  const openai = getOpenAIClient();

  const systemPrompt = `You are a copywriting assistant. You MUST only use claims from the allowed claims tool.
Output ONLY valid JSON in this exact format:
{"headline1": "...", "headline2": "...", "usedClaimIds": ["claim-X", ...]}
Tone: ${safeTone}. Target audience: ${safeAudience}.`;

  async function attempt(extraContext?: string): Promise<LlmCopyResponse | null> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: extraContext
          ? `Generate two compelling headlines. ${extraContext}`
          : 'Generate two compelling headlines using only the allowed marketing claims.',
      },
    ];

    const response = await openai.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
    });

    if (response.usage) {
      trace.inputTokens += response.usage.prompt_tokens;
      trace.outputTokens += response.usage.completion_tokens;
    }

    const choice = response.choices[0];
    if (!choice?.message) return null;

    if (choice.message.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === 'get_allowed_claims') {
        const followUp = await openai.chat.completions.create({
          model,
          messages: [
            ...messages,
            choice.message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ allowedClaims: ALLOWED_CLAIMS }),
            },
          ],
          temperature: 0.7,
        });

        if (followUp.usage) {
          trace.inputTokens += followUp.usage.prompt_tokens;
          trace.outputTokens += followUp.usage.completion_tokens;
        }

        const content = followUp.choices[0]?.message?.content;
        return content ? parseModelOutput(content) : null;
      }
    }

    const content = choice.message.content;
    return content ? parseModelOutput(content) : null;
  }

  try {
    const firstResult = await attempt();

    if (firstResult && validateUsedClaims(firstResult.usedClaimIds)) {
      trace.validationPassed = true;
      trace.latencyMs = Date.now() - startTime;
      console.log('[LLM Trace]', JSON.stringify(trace));
      return { result: firstResult, trace };
    }

    trace.retryCount = 1;

    const retryContext = firstResult
      ? `Your previous output used invalid claim IDs: [${firstResult.usedClaimIds.filter((id) => !ALLOWED_CLAIMS.find((c) => c.id === id)).join(', ')}]. Only these IDs are valid: [${ALLOWED_CLAIMS.map((c) => c.id).join(', ')}]. Please try again.`
      : `Your previous output was not valid JSON. Output ONLY a JSON object with headline1, headline2, and usedClaimIds. Valid claim IDs: [${ALLOWED_CLAIMS.map((c) => c.id).join(', ')}].`;

    const retryResult = await attempt(retryContext);

    if (retryResult && validateUsedClaims(retryResult.usedClaimIds)) {
      trace.validationPassed = true;
      trace.latencyMs = Date.now() - startTime;
      console.log('[LLM Trace]', JSON.stringify(trace));
      return { result: retryResult, trace };
    }

    trace.latencyMs = Date.now() - startTime;
    console.log('[LLM Trace] Falling back after validation failure', JSON.stringify(trace));
    return { result: FALLBACK_RESPONSE, trace };
  } catch (error) {
    trace.latencyMs = Date.now() - startTime;
    console.error('[LLM Trace] Error, using fallback', JSON.stringify(trace), error);
    return { result: FALLBACK_RESPONSE, trace };
  }
}

export function getAllowedClaims(): AllowedClaim[] {
  return ALLOWED_CLAIMS;
}
