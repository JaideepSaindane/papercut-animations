// Authoring stages (spec 9): brief -> research + script -> (human approval) -> shot plan.
// Two modes share the prompt templates and validators:
//   claude-code — Claude Code writes 01-research.md / 02-script.json / 03-plan.json itself, then `pc validate`;
//   api         — the pipeline calls the Anthropic API (needs ANTHROPIC_API_KEY or an `ant auth login` profile).
import { existsSync, readFileSync } from 'node:fs';
import { Brief, Format, Language, type Script, type StorySpec } from '@papercut/schema';
import { hashOf, log, readJson, storyDir, writeJson, writeText } from '@papercut/shared';
import { callModel, generateJson, makeClient, models, type LlmClient } from './llm';
import { planPrompt, researchPrompt, scriptPrompt, wordBudget } from './prompts';
import { FILES, isApproved, loadBrief, loadScript, loadSeries, loadState, markStage, saveState, storyFile } from './story';
import { formatIssues, validatePlan, validateScript, type Issues } from './validate';

export type Mode = 'claude-code' | 'api';

const SYSTEM =
  'You are one stage of the Papercut Shorts pipeline, which turns topics into short paper-cutout animated videos. ' +
  'Follow the instructions in the user message exactly. Accuracy, respect for real people, and the exact output format matter more than flourish.';

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '');

export type NewStoryOptions = {
  topic: string;
  series?: string;
  part?: number;
  genre?: Brief['genre'];
  seconds?: number;
  languages?: string[];
  formats?: Format[];
  constraints?: string[];
  slug?: string;
  topicList?: string;
};

/** `pc new`: create data/stories/<slug>/00-brief.json (slug made unique) and state.json. */
export const newStory = (o: NewStoryOptions): string => {
  const base = o.slug ?? slugify(o.topic);
  let slug = base;
  for (let n = 2; existsSync(storyDir(slug)); n++) slug = `${base}-${n}`;
  const genre = o.genre ?? 'true_crime';
  const brief = Brief.parse({
    slug,
    topic: o.topic,
    series: o.series ?? (genre === 'true_crime' ? 'True Crime' : genre === 'horror_classic' ? 'Horror Classics' : undefined),
    part: o.part,
    genre,
    targetSeconds: o.seconds ?? 60,
    languages: (o.languages ?? ['en-IN']).map((l) => Language.parse(l)),
    formats: o.formats ?? ['vertical'],
    constraints: o.constraints ?? (genre === 'true_crime' ? ['no graphic detail'] : []),
    topicList: o.topicList,
  });
  writeJson(storyFile(slug, FILES.brief), brief);
  saveState({ slug, status: 'draft', stages: {} });
  log.info(`new story ${slug} (${brief.genre}, ${brief.targetSeconds} s, ${brief.formats.join(' + ')})`);
  return slug;
};

// ---------- validation of files on disk (both modes) ----------

export const checkScript = (slug: string): Issues => {
  const brief = loadBrief(slug);
  if (!existsSync(storyFile(slug, FILES.script))) return { errors: [`no ${FILES.script} yet`], warnings: [] };
  const res = validateScript(readJson(storyFile(slug, FILES.script)), brief, wordBudget(brief, loadSeries(brief.series)));
  if (!res.errors.length) {
    if (existsSync(storyFile(slug, FILES.research))) markStage(slug, 'research', hashOf(readFileSync(storyFile(slug, FILES.research), 'utf8')), 'researched');
    markStage(slug, 'script', hashOf(res.script), 'scripted');
  }
  return res;
};

export const checkPlan = (slug: string): Issues => {
  if (!existsSync(storyFile(slug, FILES.plan))) return { errors: [`no ${FILES.plan} yet`], warnings: [] };
  const res = validatePlan(readJson(storyFile(slug, FILES.plan)), loadScript(slug));
  const s = loadState(slug);
  if (res.errors.length) {
    s.error = `plan invalid: ${res.errors.slice(0, 3).join('; ')}`;
    saveState(s);
  } else {
    markStage(slug, 'plan', hashOf(res.plan), 'planned');
  }
  return res;
};

/**
 * The human gate (spec 5). The script must validate first. Claude Code never calls this for true crime
 * on its own: the owner runs `pc approve` (or says so explicitly).
 */
export const approveStory = (slug: string) => {
  const res = checkScript(slug);
  if (res.errors.length) throw new Error(formatIssues(`${slug} script`, res));
  markStage(slug, 'approve', hashOf(loadScript(slug)), 'approved');
  log.info(`${slug} approved`);
  return res;
};

// ---------- API mode ----------

export const researchAndScriptApi = async (slug: string, client: LlmClient = makeClient()) => {
  const brief = loadBrief(slug);
  const budget = wordBudget(brief, loadSeries(brief.series));
  const model = models().script;

  log.info(`research ${slug} with ${model} + web search…`);
  const research = await callModel({
    client,
    model,
    system: SYSTEM,
    effort: 'high',
    maxTokens: 32000,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 15 }],
    cost: { slug, stage: 'research' },
    messages: [{ role: 'user', content: researchPrompt(slug) }],
  });
  writeText(storyFile(slug, FILES.research), research.text.trim() + '\n');
  markStage(slug, 'research', hashOf(research.text), 'researched');

  log.info(`script ${slug} with ${model}…`);
  const { value: script, attempts } = await generateJson<Script>({
    client,
    model,
    system: SYSTEM,
    effort: 'high',
    messages: [{ role: 'user', content: scriptPrompt(slug, research.text) }],
    cost: { slug, stage: 'script' },
    check: (raw) => {
      const r = validateScript(raw, brief, budget);
      return { errors: r.errors, value: r.script };
    },
  });
  writeJson(storyFile(slug, FILES.script), script);
  const issues = checkScript(slug);
  log.info(`script ${slug}: ${script.lines.length} lines in ${attempts} attempt(s)`);
  return issues;
};

export const planApi = async (slug: string, client: LlmClient = makeClient()) => {
  if (!isApproved(slug)) throw new Error(`${slug}: script is not approved yet`);
  const script = loadScript(slug);
  const model = models().plan;
  log.info(`plan ${slug} with ${model}…`);
  const { value: plan, attempts } = await generateJson<StorySpec>({
    client,
    model,
    system: SYSTEM,
    effort: 'high',
    maxTokens: 64000,
    // missing assets come back as errors, so the repair round is the spec's "use only these ids" retry
    messages: [{ role: 'user', content: planPrompt(slug) }],
    cost: { slug, stage: 'plan' },
    check: (raw) => {
      const r = validatePlan(raw, script);
      return { errors: r.errors, value: r.plan };
    },
  });
  writeJson(storyFile(slug, FILES.plan), plan);
  log.info(`plan ${slug}: ${plan.shots.length} shots in ${attempts} attempt(s)`);
  return checkPlan(slug);
};
