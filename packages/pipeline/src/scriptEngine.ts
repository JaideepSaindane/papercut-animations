// The script engine (platform M1): grounded research → several candidate scripts with different hook
// strategies → judge → sensitivity gate → routed to approved or needs_review. Every script records its
// features at birth so the analytics engine can learn what performs.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  Judgement,
  ScriptFeatures,
  SensitivityReview,
  StorySpec,
  TopicList,
  type Brief,
  type Script,
} from '@papercut/schema';
import { REPO_ROOT, dataDir, hashOf, log, readJson, readJsonIf, writeJson, writeText } from '@papercut/shared';
import { geminiCall, geminiJson, geminiModels, makeGemini, resolveSourceUrls, userText, type GeminiClient } from './gemini';
import { planPrompt, renderTemplate, scriptPrompt, wordBudget } from './prompts';
import { FILES, loadBrief, loadScript, loadSeries, loadState, markStage, saveState, storyFile, voiceFor } from './story';
import { formatIssues, validatePlan, validateScript } from './validate';
import { wordCount } from './normalise';
import { isSarvamVoice, wordsPerSecond } from './sarvam-voices';
import { loadVoiceRates } from './tts';

// ---------- playbook ----------
export const Playbook = z.object({
  version: z.number(),
  updatedAt: z.string(),
  note: z.string().optional(),
  hookStyles: z.record(z.string(), z.string()),
  /** best-first ranking learned from data (analytics engine); empty until there is data */
  hookStyleRank: z.array(z.string()).default([]),
  rules: z.array(z.object({ id: z.string(), rule: z.string(), source: z.enum(['prior', 'data', 'owner']), confidence: z.enum(['low', 'medium', 'high']), evidence: z.string().optional() })),
  experiments: z.array(z.object({ id: z.string(), variable: z.string(), arms: z.array(z.string()), share: z.number().min(0).max(1) })).default([]),
});
export type Playbook = z.infer<typeof Playbook>;

export const playbookFile = () => path.join(REPO_ROOT, 'playbook', 'playbook.json');
export const loadPlaybook = (): Playbook => Playbook.parse(readJson(playbookFile()));

export const playbookText = (p: Playbook) =>
  p.rules.map((r) => `- ${r.rule}${r.source === 'prior' ? ' (best-practice prior, not yet confirmed by our data)' : r.evidence ? ` (${r.evidence})` : ''}`).join('\n');

/**
 * Which hook strategies this story's candidates use. A deterministic share of stories (by slug) are
 * experiments: all candidates use one assigned arm, so the data covers every style. The rest try the three
 * best-ranked styles and let the judge choose.
 */
export const pickHookStrategy = (slug: string, p: Playbook): { styles: string[]; experiment?: string } => {
  const exp = p.experiments.find((e) => e.variable === 'hookStyle');
  const h = parseInt(hashOf(slug, 8), 16);
  if (exp && (h % 1000) / 1000 < exp.share) {
    const arm = exp.arms[Math.floor(h / 1000) % exp.arms.length];
    return { styles: [arm, arm, arm], experiment: `${exp.id}:${arm}` };
  }
  const ranked = [...p.hookStyleRank, ...Object.keys(p.hookStyles).filter((s) => !p.hookStyleRank.includes(s))];
  return { styles: ranked.slice(0, 3) };
};

// ---------- research ----------
const BLOCKED_SOURCES = /(youtube\.com|youtu\.be|reddit\.com|quora\.com|fandom\.com|tiktok\.com|instagram\.com|facebook\.com|x\.com|twitter\.com|pinterest\.)/;

/** Put [S#] markers after each supported sentence, numbering sources in order of first citation. */
export const citeResearch = (
  text: string,
  supports: { text: string; chunks: number[] }[],
  resolved: { title: string; url: string }[],
) => {
  const idOf = new Map<number, number>();
  const sources: { id: string; title: string; url: string }[] = [];
  const insertions: { at: number; mark: string }[] = [];
  let from = 0;
  for (const s of supports) {
    let at = text.indexOf(s.text, from);
    if (at < 0) at = text.indexOf(s.text);
    if (at < 0) continue;
    from = at;
    const ids: number[] = [];
    for (const c of s.chunks) {
      const src = resolved[c];
      if (!src?.url || BLOCKED_SOURCES.test(src.url)) continue;
      if (!idOf.has(c)) {
        const existing = sources.findIndex((x) => x.url === src.url);
        if (existing >= 0) idOf.set(c, existing + 1);
        else {
          sources.push({ id: `S${sources.length + 1}`, title: src.title, url: src.url });
          idOf.set(c, sources.length);
        }
      }
      ids.push(idOf.get(c)!);
    }
    const uniq = [...new Set(ids)].sort((a, b) => a - b);
    if (uniq.length) insertions.push({ at: at + s.text.length, mark: uniq.map((i) => `[S${i}]`).join('') });
  }
  let out = text;
  for (const ins of insertions.sort((a, b) => b.at - a.at)) out = out.slice(0, ins.at) + ' ' + ins.mark + out.slice(ins.at);
  return { text: out, sources };
};

export const groundedResearch = async (slug: string, client: GeminiClient) => {
  const brief = loadBrief(slug);
  const b = wordBudget(brief, loadSeries(brief.series));
  const r = await geminiCall({
    client,
    model: geminiModels().write,
    system: 'You research stories for a narrated short-video channel. Accuracy and respect for real people matter more than drama.',
    contents: userText(renderTemplate('research-grounded', { brief: JSON.stringify(brief, null, 2), targetSeconds: brief.targetSeconds, targetWords: b.targetWords })),
    search: true,
    thinking: 'HIGH',
    cost: { slug, stage: 'research' },
  });
  // resolve chunk by chunk so support indexes keep pointing at the right source
  const resolved = await Promise.all(r.sources.map(async (s) => (s.uri ? (await resolveSourceUrls([s]))[0] : { title: s.title, url: '' })));
  const { text, sources } = citeResearch(r.text.trim(), r.supports, resolved);
  const md = `${text}\n\n## Sources\n${sources.map((s) => `- [${s.id}] ${s.title} — ${s.url}`).join('\n')}\n`;
  writeText(storyFile(slug, FILES.research), md);
  markStage(slug, 'research', hashOf(md), 'researched');
  log.info(`research ${slug}: ${sources.length} sources, ${r.searchQueries.length} searches`);
  if (!sources.length) throw new Error(`${slug}: research found no usable sources`);
  return md;
};

// ---------- the engine ----------
const FACTUAL = new Set(['true_crime', 'history', 'mystery']);

export const scriptFeatures = (slug: string, brief: Brief, s: Script, extra: Pick<ScriptFeatures, 'hookStyle' | 'experiment' | 'judgeOverall' | 'candidates' | 'sensitivity' | 'models' | 'playbookVersion'>): ScriptFeatures => {
  const series = loadSeries(brief.series);
  const v = voiceFor(series, 'en-IN');
  const words = s.lines.reduce((n, l) => n + wordCount(l.vo), 0);
  const wps = isSarvamVoice(v.speaker) ? wordsPerSecond(v.speaker, v.pace, loadVoiceRates()) : 2.5;
  const beats: Record<string, number> = {};
  for (const l of s.lines) beats[l.beat] = (beats[l.beat] ?? 0) + 1;
  return ScriptFeatures.parse({
    slug,
    genre: brief.genre,
    series: brief.series,
    language: 'en-IN',
    hookWords: wordCount(s.lines[0]?.vo ?? ''),
    words,
    lines: s.lines.length,
    avgWordsPerLine: Math.round((words / Math.max(1, s.lines.length)) * 10) / 10,
    beats,
    estSeconds: Math.round((words / wps / 0.8) * 10) / 10,
    speaker: v.speaker,
    pace: v.pace,
    createdAt: new Date().toISOString(),
    ...extra,
  });
};

export type EngineResult = { status: 'approved' | 'needs_review'; reasons: string[] };

export const runScriptEngine = async (slug: string, client: GeminiClient = makeGemini()): Promise<EngineResult> => {
  const brief = loadBrief(slug);
  const budget = wordBudget(brief, loadSeries(brief.series));
  const playbook = loadPlaybook();
  const model = geminiModels().write;
  const research = existsSync(storyFile(slug, FILES.research)) ? readFileSync(storyFile(slug, FILES.research), 'utf8') : await groundedResearch(slug, client);

  // 1. candidates, in parallel, one hook strategy each
  const { styles, experiment } = pickHookStrategy(slug, playbook);
  const labels = ['A', 'B', 'C'];
  log.info(`script ${slug}: ${styles.length} candidates (${styles.join(', ')})${experiment ? ` — experiment ${experiment}` : ''}`);
  const drafts = await Promise.all(
    styles.map(async (style, i) => {
      try {
        const { value } = await geminiJson<Script>({
          client,
          model,
          system: 'You write narration scripts for short paper-cutout videos. Follow the instructions exactly and return only the JSON object.',
          contents: userText(
            scriptPrompt(slug, research, {
              playbook: playbookText(playbook),
              hookDirective: `${style}: ${playbook.hookStyles[style] ?? style}`,
            }),
          ),
          thinking: 'HIGH',
          cost: { slug, stage: `script-${labels[i]}` },
          check: (raw) => {
            const r = validateScript(raw, brief, budget);
            return { errors: r.errors, value: r.script };
          },
        });
        return { label: labels[i], hookStyle: style, script: value };
      } catch (e) {
        log.warn(`  candidate ${labels[i]} failed: ${(e as Error).message}`);
        return null;
      }
    }),
  );
  const candidates = drafts.filter((d): d is NonNullable<typeof d> => !!d);
  if (!candidates.length) throw new Error(`${slug}: no candidate script passed validation`);

  // 2. judge
  let judgement: Judgement;
  if (candidates.length === 1) {
    judgement = { scores: [], winner: candidates[0].label, why: 'only one candidate passed validation' };
  } else {
    ({ value: judgement } = await geminiJson<Judgement>({
      client,
      model,
      system: 'You are a demanding head writer. Score honestly; return only JSON.',
      contents: userText(
        renderTemplate('judge', {
          brief: JSON.stringify(brief, null, 2),
          research,
          playbook: playbookText(playbook),
          targetWords: budget.targetWords,
          candidates: candidates.map((c) => `### Candidate ${c.label} (hook strategy: ${c.hookStyle})\n\`\`\`json\n${JSON.stringify(c.script, null, 2)}\n\`\`\``).join('\n\n'),
        }),
      ),
      thinking: 'HIGH',
      cost: { slug, stage: 'judge' },
      check: (raw) => {
        const r = Judgement.safeParse(raw);
        if (!r.success) return { errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
        if (!candidates.some((c) => c.label === r.data.winner)) return { errors: [`winner "${r.data.winner}" is not a candidate`] };
        return { errors: [], value: r.data };
      },
    }));
  }
  const winner = candidates.find((c) => c.label === judgement.winner) ?? candidates[0];

  // 3. sensitivity gate
  const { value: review } = await geminiJson<SensitivityReview>({
    client,
    model,
    system: 'You are a strict standards editor. Return only JSON.',
    contents: userText(renderTemplate('sensitivity', { brief: JSON.stringify(brief, null, 2), research, script: JSON.stringify(winner.script, null, 2) })),
    thinking: 'HIGH',
    cost: { slug, stage: 'sensitivity' },
    check: (raw) => {
      const r = SensitivityReview.safeParse(raw);
      return r.success ? { errors: [], value: r.data } : { errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
    },
  });

  // 4. write everything
  writeJson(storyFile(slug, FILES.script), winner.script);
  writeJson(storyFile(slug, '02-candidates.json'), { candidates, judgement });
  writeJson(storyFile(slug, '02-review.json'), review);
  const judgeOverall = judgement.scores.find((s) => s.candidate === winner.label)?.overall ?? 0;
  writeJson(
    storyFile(slug, '02-features.json'),
    scriptFeatures(slug, brief, winner.script, {
      hookStyle: winner.hookStyle,
      experiment,
      judgeOverall,
      candidates: candidates.length,
      sensitivity: review.verdict,
      models: { research: model, script: model, judge: model, sensitivity: model },
      playbookVersion: playbook.version,
    }),
  );
  markStage(slug, 'script', hashOf(winner.script), 'scripted');

  // 5. route
  const reasons: string[] = [];
  if (review.verdict === 'fail') reasons.push(...review.issues.map((i) => `sensitivity: ${i.lineId ?? ''} ${i.issue}`.trim()));
  if (review.verdict === 'review' && FACTUAL.has(brief.genre)) reasons.push(...review.issues.map((i) => `review: ${i.lineId ?? ''} ${i.issue}`.trim()));
  const list = brief.topicList ? loadTopicListIf(brief.topicList) : undefined;
  if (!list || list.status !== 'approved') reasons.push('topic list is not approved');
  if (reasons.length) {
    markStage(slug, 'sensitivity', hashOf(review), 'needs_review');
    const st = loadState(slug);
    st.error = `needs review: ${reasons.slice(0, 3).join('; ')}`;
    saveState(st);
    log.warn(`script ${slug}: needs review — ${reasons.join('; ')}`);
    return { status: 'needs_review', reasons };
  }
  markStage(slug, 'approve', `topic-list:${list!.id}`, 'approved');
  log.info(`script ${slug}: candidate ${winner.label} (${winner.hookStyle}, judge ${judgeOverall}/10) → approved via topic list ${list!.id}`);
  return { status: 'approved', reasons: [] };
};

/** Shot plan via Gemini, validated against the kit (unknown assets are fed back as errors). */
export const planWithGemini = async (slug: string, client: GeminiClient = makeGemini()) => {
  const script = loadScript(slug);
  const { value: plan, attempts } = await geminiJson<StorySpec>({
    client,
    model: geminiModels().write,
    system: 'You plan shots for paper-cutout animations using only the kit ids you are given. Return only the JSON object.',
    contents: userText(planPrompt(slug)),
    thinking: 'HIGH',
    repairs: 3,
    cost: { slug, stage: 'plan' },
    check: (raw) => {
      const r = validatePlan(raw, script);
      return { errors: r.errors, value: r.plan };
    },
  });
  writeJson(storyFile(slug, FILES.plan), plan);
  const res = validatePlan(plan, script);
  markStage(slug, 'plan', hashOf(plan), 'planned');
  log.info(`plan ${slug}: ${plan.shots.length} shots in ${attempts} attempt(s)${res.warnings.length ? `\n${formatIssues('  plan', res)}` : ''}`);
  return res;
};

// ---------- topic lists ----------
export const topicListDir = () => path.join(dataDir(), 'topic-lists');
export const topicListFile = (id: string) => path.join(topicListDir(), `${id}.json`);
export const loadTopicList = (id: string) => TopicList.parse(readJson(topicListFile(id)));
export const loadTopicListIf = (id: string) => {
  const raw = readJsonIf(topicListFile(id));
  return raw ? TopicList.parse(raw) : undefined;
};
export const saveTopicList = (l: TopicList) => writeJson(topicListFile(l.id), l);
