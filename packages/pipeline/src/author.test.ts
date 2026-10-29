import { describe, expect, it, vi } from 'vitest';
import { Brief, Script, SeriesConfig } from '@papercut/schema';
import plan from '../../../fixtures/monkeys-paw-30s/03-plan.json';
import script from '../../../fixtures/monkeys-paw-30s/02-script.json';
import brief from '../../../fixtures/monkeys-paw-30s/00-brief.json';
import { LlmRefusal, callModel, extractJson, generateJson, type LlmClient } from './llm';
import { renderTemplate, wordBudget } from './prompts';
import { BASE_WORDS_PER_SECOND, wordsPerSecond } from './sarvam-voices';
import { slugify } from './author';
import { headBox, validatePlan, validateScript } from './validate';

/** Fake SDK client: returns the queued messages in order and records every request. */
const fakeClient = (replies: any[]) => {
  const calls: any[] = [];
  const client: LlmClient = {
    beta: {
      messages: {
        stream: (params: any) => {
          calls.push(structuredClone(params));
          const msg = replies.shift();
          return { finalMessage: async () => msg };
        },
      },
    },
  };
  return { client, calls };
};
const msg = (text: string, extra: Record<string, unknown> = {}) => ({
  model: 'claude-opus-5-5',
  stop_reason: 'end_turn',
  content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'text', text }],
  ...extra,
});
const base = { model: 'claude-opus-5-5', system: 's', effort: 'high' as const, messages: [{ role: 'user' as const, content: 'go' }] };

describe('llm client', () => {
  it('sends effort, refusal fallbacks and tools; returns the text', async () => {
    const { client, calls } = fakeClient([msg('hello')]);
    const r = await callModel({ ...base, client, tools: [{ type: 'web_search_20260209', name: 'web_search' }] });
    expect(r.text).toBe('hello');
    expect(calls[0]).toMatchObject({
      model: 'claude-opus-5-5',
      output_config: { effort: 'high' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      tools: [{ type: 'web_search_20260209' }],
    });
    expect(calls[0].thinking).toBeUndefined(); // adaptive is the default on Opus 5.5; never send `disabled`
  });
  it('resumes pause_turn by sending the partial assistant content back', async () => {
    const { client, calls } = fakeClient([msg('part one. ', { stop_reason: 'pause_turn' }), msg('part two.')]);
    const r = await callModel({ ...base, client });
    expect(r.text).toBe('part one. part two.');
    expect(calls[1].messages.at(-1)).toMatchObject({ role: 'assistant' });
  });
  it('turns a refusal into an LlmRefusal with its category', async () => {
    const { client } = fakeClient([msg('', { stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber', explanation: 'x' } })]);
    await expect(callModel({ ...base, client })).rejects.toBeInstanceOf(LlmRefusal);
  });
  it('extracts JSON from the last fenced block or bare braces', () => {
    expect(extractJson('notes\n```json\n{"a":1}\n```\nmore\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJson('Here: {"b": [1, 2]} done')).toEqual({ b: [1, 2] });
  });
  it('repairs invalid JSON with the validator errors, keeping the assistant turn unchanged', async () => {
    const { client, calls } = fakeClient([msg('```json\n{"n": 1}\n```'), msg('```json\n{"n": 2}\n```')]);
    const check = vi.fn((raw: any) => (raw.n === 2 ? { errors: [], value: raw } : { errors: ['n must be 2'] }));
    const r = await generateJson<{ n: number }>({ ...base, client, check });
    expect(r).toEqual({ value: { n: 2 }, attempts: 2 });
    const second = calls[1].messages;
    expect(second.at(-2).content[0]).toMatchObject({ type: 'thinking', signature: 'sig' });
    expect(second.at(-1).content).toContain('n must be 2');
  });
  it('gives up after the repair budget', async () => {
    const { client } = fakeClient([msg('no json'), msg('still none'), msg('nope')]);
    await expect(generateJson({ ...base, client, check: () => ({ errors: ['x'] }) })).rejects.toThrow(/after 2 repair rounds/);
  });
});

describe('validators', () => {
  const b = Brief.parse(brief);
  const s = Script.parse(script);

  it('accepts the fixture script and plan', () => {
    expect(validateScript(script, b).errors).toEqual([]);
    expect(validatePlan(plan, s).errors).toEqual([]);
  });
  it('flags unknown sources, unsourced true-crime lines and missing sensitivity notes', () => {
    const bad = structuredClone(script) as any;
    bad.lines[1].sourceIds = ['S9'];
    bad.lines[2].sourceIds = [];
    bad.sensitivityNotes = [];
    const errs = validateScript(bad, { ...b, genre: 'true_crime' }).errors.join('\n');
    expect(errs).toMatch(/L02: source "S9"/);
    expect(errs).toMatch(/L03: factual line without a source/);
    expect(errs).toMatch(/sensitivityNotes/);
  });
  it('warns when the script is far off the word budget', () => {
    const w = validateScript(script, b, { wordsPerSecond: 3, targetWords: 200, minLines: 10, maxLines: 30 }).warnings.join();
    expect(w).toMatch(/spoken words vs ~200/);
  });
  it('catches unknown assets, missing and out-of-order lines, and long captions', () => {
    const bad = structuredClone(plan) as any;
    bad.shots[0].set = 'spaceship';
    bad.shots[1].lineIds = ['L03'];
    bad.shots[2].lineIds = ['L02'];
    bad.shots[3].caption = 'x'.repeat(60);
    bad.shots.pop();
    const errs = validatePlan(bad, s).errors.join('\n');
    expect(errs).toMatch(/missing set "spaceship"/);
    expect(errs).toMatch(/L09 is not used/);
    expect(errs).toMatch(/out of order/);
    expect(errs).toMatch(/S04: caption is 60 chars/);
  });
  it('warns about faces in the vertical unsafe zone and outside the horizontal frame', () => {
    const bad = structuredClone(plan) as any;
    bad.shots[3].actors[0].y = 2050; // waist chest anchor so low the face lands in the bottom zone
    bad.shots[5].actors[0].x = 1350; // closeup face far right
    const w = validatePlan(bad, s).warnings.join('\n');
    expect(w).toMatch(/S04: morris's face enters a vertical unsafe zone/);
    expect(w).toMatch(/S06: morris's face is partly outside the horizontal frame/);
  });
  it('places the waist-framing head where the rig draws it', () => {
    const h = headBox({ ref: 'x', kind: 'character', framing: 'waist', x: 540, y: 1400, scale: 1, flip: false, layer: 'subject', pose: 'idle', params: {} }, undefined);
    expect((h.y0 + h.y1) / 2).toBeCloseTo(990 - 8, -1);
  });
});

describe('prompts and budgets', () => {
  it('fills templates and refuses missing variables', () => {
    expect(() => renderTemplate('research', { brief: '{}', targetSeconds: 30 })).toThrow(/targetWords/);
    expect(renderTemplate('research', { brief: '{}', targetSeconds: 30, targetWords: 70 })).toContain('about 70 spoken words');
  });
  it('sizes the word budget from the narrator: measured rate beats the catalogue estimate', () => {
    const series = SeriesConfig.parse({ name: 'x', voice: { speaker: 'shubh', pace: 1 } });
    expect(wordsPerSecond('shubh', 1)).toBeCloseTo(BASE_WORDS_PER_SECOND * 1.19);
    expect(wordsPerSecond('shubh', 1, { shubh: { words: 100, seconds: 25 } })).toBeCloseTo(4);
    expect(wordsPerSecond('shubh', 1, { shubh: { words: 10, seconds: 2 } })).toBeCloseTo(BASE_WORDS_PER_SECOND * 1.19); // too little data
    const bud = wordBudget(Brief.parse({ ...brief, targetSeconds: 45 }), series);
    expect(bud.targetWords).toBeGreaterThan(80);
    expect(bud.minLines).toBeLessThan(bud.maxLines);
  });
  it('slugifies topics', () => {
    expect(slugify('How Jeffrey Dahmer killed his first victim')).toBe('how-jeffrey-dahmer-killed-his-first-victim');
    expect(slugify("The Monkey's Paw, part 1")).toBe('the-monkeys-paw-part-1');
  });
});
