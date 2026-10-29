// Gemini (default LLM provider for the engine). Patterns from ReelAutomator's gemini script provider:
// structured JSON output, thinking levels, and token usage that counts thinking as output.
import { GoogleGenAI, ThinkingLevel, type Content, type GenerateContentResponse } from '@google/genai';
import { env, log, withRetry } from '@papercut/shared';
import { recordCost, refreshCostsPage } from './costs';
import { extractJson } from './llm';

/** The slice of the SDK we use (lets tests pass a fake). */
export type GeminiClient = { models: { generateContent: (req: any) => Promise<GenerateContentResponse> } };

export const makeGemini = (): GeminiClient => {
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set (put it in .env)');
  return new GoogleGenAI({ apiKey }) as unknown as GeminiClient;
};

/** Model per role; override with PC_GEMINI_MODEL_WRITE / PC_GEMINI_MODEL_FAST. */
export const geminiModels = () => ({
  /** research, scripts, judging, plans, transcreation */
  write: env('PC_GEMINI_MODEL_WRITE') ?? 'gemini-3.1-pro-preview',
  /** cheap passes: feature extraction, matching */
  fast: env('PC_GEMINI_MODEL_FAST') ?? 'gemini-3.1-flash-lite',
});

export class GeminiBlocked extends Error {}

export type GeminiCall = {
  client: GeminiClient;
  model: string;
  system: string;
  contents: Content[];
  thinking?: 'LOW' | 'MEDIUM' | 'HIGH';
  /** ground on Google Search (research) */
  search?: boolean;
  /** JSON output; pass a JSON Schema only for small, simple shapes (Gemini rejects complex ones) */
  json?: boolean;
  schema?: unknown;
  cost?: { slug: string; stage: string };
};

export type GeminiResult = {
  text: string;
  content: Content | undefined;
  /** grounding sources (search calls) — URIs are Google redirect links; resolve with resolveSourceUrls */
  sources: { title: string; uri: string }[];
  /** which grounding chunks (indexes into `sources`) support which stretch of the text */
  supports: { text: string; chunks: number[] }[];
  searchQueries: string[];
};

/** Book token + search usage against the ledger (thinking tokens bill as output). */
export const bookGeminiUsage = (res: GenerateContentResponse, model: string, cost?: { slug: string; stage: string }, searches = 0) => {
  if (!cost) return;
  const u = res.usageMetadata;
  const base = { ...cost, provider: 'gemini', model, requestId: res.responseId };
  recordCost({ ...base, item: 'input_tokens', quantity: (u?.promptTokenCount ?? 0) + (u?.toolUsePromptTokenCount ?? 0) });
  recordCost({ ...base, item: 'output_tokens', quantity: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0) });
  recordCost({ ...base, item: 'search_requests', quantity: searches });
  refreshCostsPage();
};

const retryable = (e: unknown) => {
  const status = (e as { status?: number }).status;
  return status === 429 || status === 500 || status === 503 || status === 504;
};

export const geminiCall = async (o: GeminiCall): Promise<GeminiResult> => {
  const res = await withRetry(
    () =>
      o.client.models.generateContent({
        model: o.model,
        contents: o.contents,
        config: {
          systemInstruction: o.system,
          ...(o.thinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel[o.thinking] } } : {}),
          ...(o.search ? { tools: [{ googleSearch: {} }] } : {}),
          ...(o.json ? { responseMimeType: 'application/json' } : {}),
          ...(o.schema ? { responseJsonSchema: o.schema } : {}),
        },
      }),
    { attempts: 4, shouldRetry: retryable },
  );
  const cand = res.candidates?.[0];
  const g = cand?.groundingMetadata;
  const searchQueries = g?.webSearchQueries ?? [];
  bookGeminiUsage(res, o.model, o.cost, searchQueries.length ? 1 : 0);
  const reason = cand?.finishReason;
  if (reason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(reason)) {
    if (reason === 'MAX_TOKENS') throw new Error(`${o.model} hit its output limit; output truncated`);
    throw new GeminiBlocked(`${o.model} stopped: ${reason}${res.promptFeedback?.blockReason ? ` (${res.promptFeedback.blockReason})` : ''}`);
  }
  const text = res.text ?? '';
  if (!text.trim()) throw new Error(`${o.model} returned an empty response`);
  // keep chunk order so support indexes stay valid
  const sources = (g?.groundingChunks ?? []).map((c) => ({ uri: c.web?.uri ?? '', title: c.web?.title ?? c.web?.uri ?? '' }));
  const supports = (g?.groundingSupports ?? [])
    .filter((s) => s.segment?.text && s.groundingChunkIndices?.length)
    .map((s) => ({ text: s.segment!.text!, chunks: s.groundingChunkIndices! }));
  return { text, content: cand?.content, sources, supports, searchQueries };
};

/**
 * Ask for JSON, validate it, and send the validator's errors back for a fix (up to `repairs` rounds).
 * The model's own turn is appended unchanged before the fix request.
 */
export const geminiJson = async <T>(
  o: GeminiCall & { check: (raw: unknown) => { errors: string[]; value?: T }; repairs?: number },
): Promise<{ value: T; attempts: number }> => {
  let contents = o.contents;
  const repairs = o.repairs ?? 2;
  for (let attempt = 0; attempt <= repairs; attempt++) {
    const r = await geminiCall({ ...o, contents, json: o.json ?? true });
    let problems: string[];
    try {
      const res = o.check(extractJson(r.text));
      if (!res.errors.length && res.value !== undefined) return { value: res.value, attempts: attempt + 1 };
      problems = res.errors;
    } catch (e) {
      problems = [`the reply was not valid JSON: ${(e as Error).message}`];
    }
    log.warn(`  attempt ${attempt + 1}: ${problems.length} problem(s) — ${problems.slice(0, 3).join('; ')}`);
    contents = [
      ...contents,
      r.content ?? { role: 'model', parts: [{ text: r.text }] },
      {
        role: 'user',
        parts: [{ text: `That JSON has problems:\n${problems.map((p) => `- ${p}`).join('\n')}\n\nReturn the corrected, complete JSON object.` }],
      },
    ];
  }
  throw new Error(`${o.model}: output still invalid after ${repairs} repair rounds`);
};

export const userText = (text: string): Content[] => [{ role: 'user', parts: [{ text }] }];
