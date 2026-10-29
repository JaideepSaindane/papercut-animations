import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { amountOf, loadLedger, rateFor, recordCost, renderCostsPage, summarise, type CostEntry, type Pricing } from './costs';
import { bookUsage } from './llm';

const pricing: Pricing = {
  displayCurrency: 'INR',
  usdToInr: 88,
  rates: [
    { provider: 'sarvam', model: '*', item: 'tts_chars', label: 'TTS', unitSize: 10000, unitLabel: '10K chars', price: 30, currency: 'INR' },
    { provider: 'anthropic', model: 'claude-opus-5-5', item: 'output_tokens', label: 'Opus out', unitSize: 1e6, unitLabel: '1M', price: 20, currency: 'USD' },
    { provider: 'anthropic', model: '*', item: 'web_searches', label: 'Search', unitSize: 1000, unitLabel: '1K', price: 10, currency: 'USD' },
  ],
};
const e = (x: Partial<CostEntry>): CostEntry => ({ at: '2026-10-29T00:00:00Z', slug: 's', stage: 'tts', provider: 'sarvam', model: 'bulbul:v3', item: 'tts_chars', quantity: 1000, ...x });

beforeEach(() => {
  // every test writes to its own throwaway data dir, never the real ledger
  process.env.PC_DATA_DIR = mkdtempSync(path.join(os.tmpdir(), 'pc-costs-'));
});

describe('costs', () => {
  it('prices Sarvam characters in rupees and Anthropic usage converted from dollars', () => {
    expect(amountOf(pricing, e({ quantity: 10000 }))).toBeCloseTo(30);
    expect(amountOf(pricing, e({ provider: 'anthropic', model: 'claude-opus-5-5', item: 'output_tokens', quantity: 1e6 }))).toBeCloseTo(20 * 88);
  });
  it('falls back to the provider * rate, and leaves unknown items unpriced', () => {
    expect(rateFor(pricing, { provider: 'anthropic', model: 'claude-sonnet-5-5', item: 'web_searches' })?.label).toBe('Search');
    expect(amountOf(pricing, e({ provider: 'anthropic', model: 'x', item: 'mystery' }))).toBeNull();
  });
  it('summarises by story, stage, provider and item', () => {
    const s = summarise(
      [
        e({ slug: 'a', quantity: 1000 }),
        e({ slug: 'a', stage: 'research', provider: 'anthropic', model: 'claude-opus-5-5', item: 'web_searches', quantity: 5, at: '2026-10-29T01:00:00Z' }),
        e({ slug: 'b', quantity: 2000 }),
        e({ slug: 'b', provider: 'x', item: 'unknown' }),
      ],
      pricing,
    );
    expect(s.total).toBeCloseTo(3 + 5 * 0.01 * 88 + 6);
    expect(s.unpriced).toBe(1);
    expect(s.byStory.find((x) => x.slug === 'a')?.byStage).toEqual({ tts: 3, research: expect.closeTo(4.4) });
    expect(s.byProvider.sarvam).toBeCloseTo(9);
    expect(renderCostsPage(s, pricing)).toContain('<title>Papercut Costs</title>');
  });
  it('appends to the ledger and skips zero quantities', () => {
    recordCost({ slug: 'a', stage: 'tts', provider: 'sarvam', model: 'bulbul:v3', item: 'tts_chars', quantity: 42 });
    recordCost({ slug: 'a', stage: 'tts', provider: 'sarvam', model: 'bulbul:v3', item: 'tts_chars', quantity: 0 });
    expect(loadLedger().map((x) => x.quantity)).toEqual([42]);
  });
  it('books Anthropic usage against the model that served the request', () => {
    bookUsage(
      {
        id: 'msg_1',
        model: 'claude-opus-4-8', // served by a refusal fallback
        usage: { input_tokens: 1200, output_tokens: 800, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, server_tool_use: { web_search_requests: 3 } },
      } as any,
      { slug: 'a', stage: 'research' },
    );
    const rows = loadLedger();
    expect(rows.map((r) => `${r.model}:${r.item}=${r.quantity}`)).toEqual([
      'claude-opus-4-8:input_tokens=1200',
      'claude-opus-4-8:output_tokens=800',
      'claude-opus-4-8:web_searches=3',
    ]);
    expect(rows[0].requestId).toBe('msg_1');
  });
});
