// Cost tracking: every billable call appends a line to data/costs.jsonl; amounts are computed from the
// editable rates in config/pricing.json (so fixing a price corrects history). `pc costs` prints a summary
// and `pc costs --page` writes the standalone Costs page (data/costs.html).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { REPO_ROOT, dataDir, ensureDir, readJson, writeText } from '@papercut/shared';

export const CostRate = z.object({
  provider: z.string(),
  model: z.string(),
  item: z.string(),
  label: z.string(),
  unitSize: z.number().positive(),
  unitLabel: z.string(),
  price: z.number().nonnegative(),
  currency: z.enum(['INR', 'USD']),
  source: z.string().optional(),
});
export const Pricing = z.object({
  displayCurrency: z.enum(['INR', 'USD']).default('INR'),
  usdToInr: z.number().positive(),
  rates: z.array(CostRate),
});
export type CostRate = z.infer<typeof CostRate>;
export type Pricing = z.infer<typeof Pricing>;

export const CostEntry = z.object({
  at: z.string(),
  /** story slug, or "_tools" for auditions / probes not tied to a story */
  slug: z.string(),
  stage: z.string(),
  provider: z.string(),
  model: z.string(),
  item: z.string(),
  quantity: z.number(),
  requestId: z.string().optional(),
  note: z.string().optional(),
});
export type CostEntry = z.infer<typeof CostEntry>;

export const pricingFile = () => path.join(REPO_ROOT, 'config', 'pricing.json');
export const ledgerFile = () => path.join(dataDir(), 'costs.jsonl');
export const costsPage = () => path.join(dataDir(), 'costs.html');

export const loadPricing = (): Pricing => Pricing.parse(readJson(pricingFile()));

/** Append billable usage. Zero quantities are skipped. Never throws: cost tracking must not break a run. */
export const recordCost = (e: Omit<CostEntry, 'at'> & { at?: string }) => {
  if (!e.quantity) return;
  try {
    ensureDir(path.dirname(ledgerFile()));
    appendFileSync(ledgerFile(), JSON.stringify(CostEntry.parse({ at: new Date().toISOString(), ...e })) + '\n');
  } catch {
    // the ledger is bookkeeping; a failure to write it must not fail synthesis or rendering
  }
};

export const loadLedger = (): CostEntry[] =>
  existsSync(ledgerFile())
    ? readFileSync(ledgerFile(), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => CostEntry.parse(JSON.parse(l)))
    : [];

/** Most specific rate: exact model, else the provider's '*' rate. */
export const rateFor = (p: Pricing, e: Pick<CostEntry, 'provider' | 'model' | 'item'>) =>
  p.rates.find((r) => r.provider === e.provider && r.model === e.model && r.item === e.item) ??
  p.rates.find((r) => r.provider === e.provider && r.model === '*' && r.item === e.item);

/** Amount in the display currency, or null when no rate is configured. */
export const amountOf = (p: Pricing, e: CostEntry): number | null => {
  const r = rateFor(p, e);
  if (!r) return null;
  const native = (r.price / r.unitSize) * e.quantity;
  if (r.currency === p.displayCurrency) return native;
  return r.currency === 'USD' ? native * p.usdToInr : native / p.usdToInr;
};

export type CostSummary = {
  currency: Pricing['displayCurrency'];
  total: number;
  unpriced: number;
  byStory: { slug: string; total: number; byStage: Record<string, number>; first: string; last: string }[];
  byProvider: Record<string, number>;
  byItem: { provider: string; model: string; item: string; label: string; quantity: number; amount: number }[];
  entries: (CostEntry & { amount: number | null })[];
};

export const summarise = (entries = loadLedger(), p = loadPricing()): CostSummary => {
  const rows = entries.map((e) => ({ ...e, amount: amountOf(p, e) }));
  const stories = new Map<string, CostSummary['byStory'][number]>();
  const byProvider: Record<string, number> = {};
  const items = new Map<string, CostSummary['byItem'][number]>();
  let total = 0;
  let unpriced = 0;
  for (const r of rows) {
    if (r.amount === null) {
      unpriced++;
      continue;
    }
    total += r.amount;
    byProvider[r.provider] = (byProvider[r.provider] ?? 0) + r.amount;
    const s = stories.get(r.slug) ?? { slug: r.slug, total: 0, byStage: {}, first: r.at, last: r.at };
    s.total += r.amount;
    s.byStage[r.stage] = (s.byStage[r.stage] ?? 0) + r.amount;
    s.first = r.at < s.first ? r.at : s.first;
    s.last = r.at > s.last ? r.at : s.last;
    stories.set(r.slug, s);
    const key = `${r.provider}|${r.model}|${r.item}`;
    const it = items.get(key) ?? { provider: r.provider, model: r.model, item: r.item, label: rateFor(p, r)?.label ?? r.item, quantity: 0, amount: 0 };
    it.quantity += r.quantity;
    it.amount += r.amount;
    items.set(key, it);
  }
  return {
    currency: p.displayCurrency,
    total,
    unpriced,
    byStory: [...stories.values()].sort((a, b) => b.last.localeCompare(a.last)),
    byProvider,
    byItem: [...items.values()].sort((a, b) => b.amount - a.amount),
    entries: rows.sort((a, b) => b.at.localeCompare(a.at)),
  };
};

export const money = (amount: number, currency: string) =>
  `${currency === 'INR' ? '₹' : '$'}${amount < 1 ? amount.toFixed(3) : amount.toFixed(2)}`;

// ---------- the Costs page ----------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const STAGE_COLOURS: Record<string, string> = {
  research: '#b8902e',
  script: '#9a4a2a',
  plan: '#2f5f52',
  tts: '#3f5c8a',
  'voice-test': '#6b5a8a',
  qa: '#6e6a64',
};

export const renderCostsPage = (s = summarise(), p = loadPricing()) => {
  const m = (n: number) => esc(money(n, s.currency));
  const stages = [...new Set(s.byStory.flatMap((x) => Object.keys(x.byStage)))];
  const bar = (byStage: Record<string, number>, total: number) =>
    total
      ? `<div class="bar">${Object.entries(byStage)
          .map(([k, v]) => `<span style="width:${(v / total) * 100}%;background:${STAGE_COLOURS[k] ?? '#8a7a6a'}" title="${esc(k)} ${m(v)}"></span>`)
          .join('')}</div>`
      : '';
  // local time of the machine running the pipeline (the ledger itself stores UTC)
  const date = (iso: string) => {
    const d = new Date(iso);
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };
  const qty = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toFixed(2));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Papercut Costs</title>
<style>
:root{--bg:#f3ead8;--card:#efe5cf;--ink:#2b1d17;--muted:#6e5a4a;--rule:#cdbb9a;--accent:#9a4a2a}
@media (prefers-color-scheme:dark){:root{--bg:#1c1512;--card:#271e19;--ink:#efe5cf;--muted:#b8a58c;--rule:#4a3a30;--accent:#d8845a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Georgia,'Times New Roman',serif}
main{max-width:1080px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:30px;margin:0 0 4px}h2{font-size:19px;margin:36px 0 10px;border-bottom:1px solid var(--rule);padding-bottom:6px}
.sub{color:var(--muted);margin:0 0 24px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--rule);padding:14px 16px}
.tile b{display:block;font-size:24px}.tile span{color:var(--muted);font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--rule);vertical-align:top}
th{color:var(--muted);font-weight:normal}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.bar{display:flex;height:10px;min-width:120px;background:var(--rule);margin-top:4px}.bar span{display:block;height:100%}
.legend{display:flex;flex-wrap:wrap;gap:14px;color:var(--muted);font-size:13px;margin:6px 0 0}.legend i{display:inline-block;width:10px;height:10px;margin-right:5px;vertical-align:-1px}
.scroll{overflow-x:auto}code{font-size:13px}.note{color:var(--muted);font-size:13px}
</style></head><body><main>
<h1>Costs</h1>
<p class="sub">Every billable call the pipeline makes. Rates from <code>config/pricing.json</code> (USD at ₹${p.usdToInr}). Times are local (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}). Generated ${date(new Date().toISOString())}.</p>
<div class="tiles">
<div class="tile"><span>Total spend</span><b>${m(s.total)}</b><span>${s.entries.length} billable calls</span></div>
${Object.entries(s.byProvider)
  .map(([k, v]) => `<div class="tile"><span>${esc(k)}</span><b>${m(v)}</b></div>`)
  .join('')}
<div class="tile"><span>Stories with spend</span><b>${s.byStory.filter((x) => !x.slug.startsWith('_')).length}</b><span>avg ${m(
    s.byStory.filter((x) => !x.slug.startsWith('_')).reduce((a, x) => a + x.total, 0) / Math.max(1, s.byStory.filter((x) => !x.slug.startsWith('_')).length),
  )} each</span></div>
</div>
${s.unpriced ? `<p class="note">${s.unpriced} call(s) have no rate in config/pricing.json and are not counted.</p>` : ''}

<h2>By story</h2>
<div class="legend">${stages.map((k) => `<span><i style="background:${STAGE_COLOURS[k] ?? '#8a7a6a'}"></i>${esc(k)}</span>`).join('')}</div>
<div class="scroll"><table><thead><tr><th>Story</th><th>Stages</th><th class="n">Total</th><th class="n">Last activity</th></tr></thead><tbody>
${s.byStory
  .map(
    (x) =>
      `<tr><td>${esc(x.slug === '_tools' ? 'Tools (voice tests, probes)' : x.slug)}</td><td>${bar(x.byStage, x.total)}<span class="note">${Object.entries(x.byStage)
        .map(([k, v]) => `${esc(k)} ${m(v)}`)
        .join(' · ')}</span></td><td class="n">${m(x.total)}</td><td class="n">${date(x.last)}</td></tr>`,
  )
  .join('')}
</tbody></table></div>

<h2>By service</h2>
<div class="scroll"><table><thead><tr><th>Service</th><th>Model</th><th class="n">Quantity</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead><tbody>
${s.byItem
  .map((x) => {
    const r = rateFor(p, x);
    return `<tr><td>${esc(x.label)}</td><td><code>${esc(x.model)}</code></td><td class="n">${qty(x.quantity)} ${esc(x.item.replace(/_/g, ' '))}</td><td class="n">${r ? esc(`${r.currency === 'INR' ? '₹' : '$'}${r.price} / ${r.unitLabel}`) : '—'}</td><td class="n">${m(x.amount)}</td></tr>`;
  })
  .join('')}
</tbody></table></div>

<h2>Ledger</h2>
<div class="scroll"><table><thead><tr><th>When</th><th>Story</th><th>Stage</th><th>Item</th><th class="n">Qty</th><th class="n">Amount</th><th>Request</th></tr></thead><tbody>
${s.entries
  .slice(0, 500)
  .map(
    (e) =>
      `<tr><td>${date(e.at)}</td><td>${esc(e.slug)}</td><td>${esc(e.stage)}${e.note ? `<br><span class="note">${esc(e.note)}</span>` : ''}</td><td>${esc(e.provider)} <code>${esc(e.item)}</code></td><td class="n">${qty(e.quantity)}</td><td class="n">${e.amount === null ? '—' : m(e.amount)}</td><td><code>${esc(e.requestId ?? '')}</code></td></tr>`,
  )
  .join('')}
</tbody></table></div>
${s.entries.length > 500 ? `<p class="note">Showing the latest 500 of ${s.entries.length} calls.</p>` : ''}
</main></body></html>
`;
};

export const writeCostsPage = () => {
  const file = costsPage();
  writeText(file, renderCostsPage());
  return file;
};

/** Refresh the Costs page after spending; never fails the calling stage. */
export const refreshCostsPage = () => {
  try {
    writeCostsPage();
  } catch {
    // bookkeeping only
  }
};
