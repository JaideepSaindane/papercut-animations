// API mode (spec 9): the pipeline calls Claude itself with the same prompt templates Claude Code uses.
import Anthropic from '@anthropic-ai/sdk';
import { env, log } from '@papercut/shared';
import { recordCost, refreshCostsPage } from './costs';

type BetaMessage = Anthropic.Beta.BetaMessage;
type BetaMessageParam = Anthropic.Beta.BetaMessageParam;
type BetaToolUnion = Anthropic.Beta.BetaToolUnion;
type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/** The slice of the SDK client we use (lets tests pass a fake). */
export type LlmClient = { beta: { messages: { stream: (params: any) => { finalMessage: () => Promise<BetaMessage> } } } };

export const makeClient = (): LlmClient => new Anthropic() as unknown as LlmClient;

/** Models per stage (spec 2); override with PC_DEFAULT_MODEL_SCRIPT / _PLAN / _QA. */
export const models = () => ({
  script: env('PC_DEFAULT_MODEL_SCRIPT') ?? 'claude-opus-5-5',
  plan: env('PC_DEFAULT_MODEL_PLAN') ?? 'claude-sonnet-5-5',
  qa: env('PC_DEFAULT_MODEL_QA') ?? 'claude-sonnet-5-5',
});

export class LlmRefusal extends Error {}

/** Record a response's token and web-search usage, against the model that actually served it. */
export const bookUsage = (msg: BetaMessage, cost?: { slug: string; stage: string }) => {
  if (!cost || !msg.usage) return;
  const u = msg.usage as BetaMessage['usage'] & { server_tool_use?: { web_search_requests?: number } | null };
  const base = { ...cost, provider: 'anthropic', model: msg.model, requestId: msg.id };
  recordCost({ ...base, item: 'input_tokens', quantity: u.input_tokens ?? 0 });
  recordCost({ ...base, item: 'output_tokens', quantity: u.output_tokens ?? 0 });
  recordCost({ ...base, item: 'cache_read_tokens', quantity: u.cache_read_input_tokens ?? 0 });
  recordCost({ ...base, item: 'cache_write_tokens', quantity: u.cache_creation_input_tokens ?? 0 });
  recordCost({ ...base, item: 'web_searches', quantity: u.server_tool_use?.web_search_requests ?? 0 });
  refreshCostsPage();
};

export type CallOptions = {
  client: LlmClient;
  model: string;
  system: string;
  messages: BetaMessageParam[];
  effort: Effort;
  tools?: BetaToolUnion[];
  maxTokens?: number;
  /** where to book the usage in the cost ledger */
  cost?: { slug: string; stage: string };
};

/**
 * One model turn, streamed. Server tools (web search) may pause a long turn (`pause_turn`); we resume by
 * sending the partial assistant content back. Refusal fallbacks are on by default (PC_LLM_FALLBACKS=0 to
 * disable): a declined request is re-run on a fallback model inside the same call.
 */
export const callModel = async (o: CallOptions): Promise<{ text: string; content: BetaMessage['content']; message: BetaMessage }> => {
  const fallbacks = env('PC_LLM_FALLBACKS') !== '0';
  let messages = o.messages;
  const texts: string[] = [];
  for (let turn = 0; turn < 8; turn++) {
    const msg = await o.client.beta.messages
      .stream({
        model: o.model,
        max_tokens: o.maxTokens ?? 32000,
        system: o.system,
        messages,
        output_config: { effort: o.effort },
        ...(o.tools ? { tools: o.tools } : {}),
        ...(fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
      })
      .finalMessage();
    for (const b of msg.content) if (b.type === 'text') texts.push(b.text);
    bookUsage(msg, o.cost);
    if (msg.stop_reason === 'refusal') {
      throw new LlmRefusal(`${o.model} declined (${msg.stop_details?.category ?? 'no category'}): ${msg.stop_details?.explanation ?? ''}`);
    }
    if (msg.stop_reason === 'max_tokens') throw new Error(`${o.model} hit max_tokens (${o.maxTokens ?? 32000}); output truncated`);
    if (msg.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: msg.content }];
      continue;
    }
    if (msg.model !== o.model) log.info(`  (served by fallback model ${msg.model})`);
    return { text: texts.join(''), content: msg.content, message: msg };
  }
  throw new Error(`${o.model}: too many pause_turn continuations`);
};

/** The JSON object in a reply: the last ```json fenced block, else the outermost {...}. */
export const extractJson = (text: string): unknown => {
  const fences = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)];
  const body = fences.length ? fences[fences.length - 1][1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(body);
};

/**
 * Ask for JSON, validate it, and send validation errors back for a fix (up to `repairs` rounds).
 * `check` returns error strings; an empty list means accept.
 */
export const generateJson = async <T>(
  o: CallOptions & { check: (raw: unknown) => { errors: string[]; value?: T }; repairs?: number },
): Promise<{ value: T; attempts: number }> => {
  let messages = o.messages;
  const repairs = o.repairs ?? 2;
  for (let attempt = 0; attempt <= repairs; attempt++) {
    const r = await callModel({ ...o, messages });
    let problems: string[];
    try {
      const res = o.check(extractJson(r.text));
      if (!res.errors.length && res.value !== undefined) return { value: res.value, attempts: attempt + 1 };
      problems = res.errors;
    } catch (e) {
      problems = [`the reply did not contain valid JSON: ${(e as Error).message}`];
    }
    log.warn(`  attempt ${attempt + 1}: ${problems.length} problem(s) — ${problems.slice(0, 3).join('; ')}`);
    // append the model's turn unchanged (thinking blocks included), then the fixes
    messages = [
      ...messages,
      { role: 'assistant', content: r.content },
      {
        role: 'user',
        content: `That JSON has problems:\n${problems.map((p) => `- ${p}`).join('\n')}\n\nReturn the corrected, complete JSON in one \`\`\`json block.`,
      },
    ];
  }
  throw new Error(`${o.model}: output still invalid after ${repairs} repair rounds`);
};
