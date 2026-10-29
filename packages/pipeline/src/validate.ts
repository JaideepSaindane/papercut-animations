// `pc validate script|plan`: checks the LLM (or a human) must pass before a stage counts as done.
// Errors block the pipeline; warnings are shown but don't.
import { FORMATS, Script, StorySpec, type ActorPlacement, type Brief, type CharacterSpec } from '@papercut/schema';
import { BASES, LAYOUTS, SETS, findMissingAssets, framingTransform, type Framing } from '@papercut/kit';
import { wordCount } from './normalise';
import type { WordBudget } from './prompts';

export type Issues = { errors: string[]; warnings: string[] };

const zodIssues = (e: { issues: { path: PropertyKey[]; message: string }[] }) =>
  e.issues.map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`);

/** Genres where every line must carry a source (spec 9.1: each factual claim maps to a source). */
const FACTUAL = new Set(['true_crime', 'history', 'mystery']);

export const validateScript = (raw: unknown, brief: Brief, budget?: WordBudget): Issues & { script?: Script } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = Script.safeParse(raw);
  if (!parsed.success) return { errors: zodIssues(parsed.error), warnings };
  const s = parsed.data;
  const sourceIds = new Set(s.sources.map((x) => x.id));
  const seen = new Set<string>();
  s.lines.forEach((l, i) => {
    if (seen.has(l.id)) errors.push(`${l.id}: duplicate line id`);
    seen.add(l.id);
    if (!l.vo.trim()) errors.push(`${l.id}: empty vo`);
    if (!l.caption.trim()) errors.push(`${l.id}: empty caption`);
    for (const id of l.sourceIds) if (!sourceIds.has(id)) errors.push(`${l.id}: source "${id}" is not in sources[]`);
    if (FACTUAL.has(brief.genre) && !l.sourceIds.length && !['hook', 'outro', 'cliffhanger'].includes(l.beat))
      errors.push(`${l.id}: factual line without a source (${brief.genre})`);
    const w = wordCount(l.vo);
    if (w > 14) warnings.push(`${l.id}: ${w} words — long for one line (4–12 reads best; the plan will need to split it)`);
    if (i === 0 && l.beat !== 'hook') warnings.push(`L01 should be the hook (beat is "${l.beat}")`);
  });
  const beats = s.lines.map((l) => l.beat);
  if (!beats.includes('turn')) warnings.push('no `turn` beat');
  if (beats.filter((b) => b === 'turn').length > 1) warnings.push('more than one `turn` beat');
  if (brief.genre === 'true_crime' && !s.sensitivityNotes.length) errors.push('true crime script needs sensitivityNotes (what was left out and why)');
  if (s.hook.trim() !== s.lines[0]?.vo.trim()) warnings.push('`hook` should repeat line 1');
  if (budget) {
    const words = s.lines.reduce((n, l) => n + wordCount(l.vo), 0);
    const ratio = words / budget.targetWords;
    if (ratio < 0.8 || ratio > 1.2)
      warnings.push(`${words} spoken words vs ~${budget.targetWords} for ${brief.targetSeconds} s at ${budget.wordsPerSecond} words/s (${Math.round((ratio - 1) * 100)}%)`);
  }
  return { errors, warnings, script: s };
};

/** World-space head box of a character placement (for safe-zone checks). */
export const headBox = (a: ActorPlacement, c: CharacterSpec | undefined, format: 'vertical' | 'horizontal' = 'vertical') => {
  const p = format === 'horizontal' && a.landscape ? { ...a, ...a.landscape } : a;
  const b = BASES[c?.base ?? 'adult_m'] ?? BASES.adult_m;
  const fr = framingTransform(p.framing as Framing, b);
  const s = fr.scale * (p.scale ?? 1);
  const cx = p.x + (540 - fr.anchor[0]) * s;
  const cy = p.y + (990 - fr.anchor[1]) * s;
  const r = 160 * s;
  return { x0: cx - r, y0: cy - r * 1.05, x1: cx + r, y1: cy + r * 0.95 };
};

const overlaps = (a: { x0: number; y0: number; x1: number; y1: number }, r: { x: number; y: number; w: number; h: number }) =>
  a.x0 < r.x + r.w && a.x1 > r.x && a.y0 < r.y + r.h && a.y1 > r.y;

export const validatePlan = (raw: unknown, script: Script): Issues & { plan?: StorySpec } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = StorySpec.safeParse(raw);
  if (!parsed.success) return { errors: zodIssues(parsed.error), warnings };
  const plan = parsed.data;

  for (const m of findMissingAssets(plan)) errors.push(`missing ${m.kind} "${m.id}": ${m.description}`);
  for (const m of plan.missingAssets) errors.push(`plan lists missing ${m.kind} "${m.id}": ${m.description}`);

  // every script line exactly once, in order
  const used = plan.shots.flatMap((s) => s.lineIds);
  const order = script.lines.map((l) => l.id);
  for (const id of used) if (!order.includes(id)) errors.push(`line ${id} is not in the script`);
  for (const id of order) {
    const n = used.filter((u) => u === id).length;
    if (n === 0) errors.push(`script line ${id} is not used by any shot`);
    if (n > 1) errors.push(`script line ${id} is used by ${n} shots`);
  }
  if (used.join() !== order.filter((id) => used.includes(id)).join()) errors.push('shots play the script lines out of order');

  const chars = new Map(plan.characters.map((c) => [c.id, c]));
  const caption = new Map(script.lines.map((l) => [l.id, l.caption]));
  const vUnsafe = LAYOUTS.vertical.unsafe;
  const hView = FORMATS.horizontal.view;
  let prevKey = '';
  let run = 1;
  plan.shots.forEach((shot) => {
    const set = SETS[shot.set];
    if (set && shot.palette && !set.palettes.includes(shot.palette))
      warnings.push(`${shot.id}: palette "${shot.palette}" isn't one of ${shot.set}'s (${set.palettes.join(', ')})`);
    if (shot.durationInFrames) warnings.push(`${shot.id}: durationInFrames is set but timing overwrites it from the voice`);
    if (shot.camera.move === 'static' && !shot.actions.length) warnings.push(`${shot.id}: nothing moves (static camera, no actions)`);
    if (shot.lineIds.length === 1 && shot.caption !== caption.get(shot.lineIds[0]))
      warnings.push(`${shot.id}: caption differs from ${shot.lineIds[0]}'s caption`);
    if (shot.caption.length > 48) errors.push(`${shot.id}: caption is ${shot.caption.length} chars (max 48)`);
    for (const a of shot.actors) {
      if (a.kind !== 'character' || a.framing === 'hands') continue;
      const c = chars.get(a.ref);
      const v = headBox(a, c, 'vertical');
      for (const z of vUnsafe) if (overlaps(v, z)) warnings.push(`${shot.id}: ${a.ref}'s face enters a vertical unsafe zone (y ${Math.round(v.y0)}–${Math.round(v.y1)})`);
      const h = headBox(a, c, 'horizontal');
      if (h.x0 < hView.x || h.x1 > hView.x + hView.w || h.y0 < hView.y || h.y1 > hView.y + hView.h)
        warnings.push(`${shot.id}: ${a.ref}'s face is partly outside the horizontal frame (add a landscape override)`);
    }
    // rhythm: no more than two consecutive shots with the same set and framing
    const lead = shot.actors.find((a) => a.kind === 'character');
    const key = `${shot.set}/${lead?.framing ?? 'none'}`;
    run = key === prevKey ? run + 1 : 1;
    if (run === 3) warnings.push(`${shot.id}: third shot in a row on ${key} (vary the framing)`);
    prevKey = key;
  });
  const turnLine = script.lines.find((l) => l.beat === 'turn')?.id;
  plan.shots.forEach((shot) => {
    const red = shot.fx.some((f) => (typeof f === 'string' ? f : f.id) === 'red_tint');
    if (red && turnLine && !shot.lineIds.includes(turnLine)) warnings.push(`${shot.id}: red_tint outside the turn`);
  });
  const last = plan.shots.at(-1);
  if (last && !last.fx.some((f) => (typeof f === 'string' ? f : f.id) === 'fade_black_end')) warnings.push('last shot has no fade_black_end');
  return { errors, warnings, plan };
};

export const formatIssues = (label: string, i: Issues) =>
  [
    i.errors.length ? `${label}: ${i.errors.length} error(s)` : `${label}: OK`,
    ...i.errors.map((e) => `  ✖ ${e}`),
    ...i.warnings.map((w) => `  ⚠ ${w}`),
  ].join('\n');
