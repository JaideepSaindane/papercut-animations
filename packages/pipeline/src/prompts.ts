// Prompt templates (packages/pipeline/prompts/*.md), shared by API mode and Claude Code mode (spec 9).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { Script, StorySpec, type Brief, type SeriesConfig } from '@papercut/schema';
import { buildManifest } from '@papercut/kit';
import { REPO_ROOT, readJson } from '@papercut/shared';
import { isSarvamVoice, wordsPerSecond } from './sarvam-voices';
import { loadSfxLibrary } from './timing';
import { loadVoiceRates } from './tts';
import { FILES, loadBrief, loadScript, loadSeries, storyFile, voiceFor } from './story';

export const PROMPTS_DIR = path.join(REPO_ROOT, 'packages/pipeline/prompts');

/** Fill `{{name}}` placeholders; a missing variable is an error, not a silent blank. */
export const renderTemplate = (name: string, vars: Record<string, string | number>) =>
  readFileSync(path.join(PROMPTS_DIR, `${name}.md`), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    if (!(k in vars)) throw new Error(`prompt ${name}: no value for {{${k}}}`);
    return String(vars[k]);
  });

/** Share of the runtime that is speech (the rest is breaths, gaps, pre-roll and the tail fade). */
export const SPEECH_SHARE = 0.8; // measured on the Monkey's Paw fixture: 18.4 s of speech in 22.9 s

export type WordBudget = { wordsPerSecond: number; targetWords: number; minLines: number; maxLines: number };

/** Word budget for a brief, from the series narrator's measured speaking rate. */
export const wordBudget = (brief: Brief, series: SeriesConfig): WordBudget => {
  const v = voiceFor(series, brief.languages[0] ?? 'en-IN');
  const wps = isSarvamVoice(v.speaker) ? wordsPerSecond(v.speaker, v.pace, loadVoiceRates()) : 2.5 * v.pace;
  const targetWords = Math.round(brief.targetSeconds * SPEECH_SHARE * wps);
  return {
    wordsPerSecond: Math.round(wps * 100) / 100,
    targetWords,
    minLines: Math.max(3, Math.round(targetWords / 11)),
    maxLines: Math.min(30, Math.max(4, Math.round(targetWords / 6))),
  };
};

const json = (v: unknown) => JSON.stringify(v, null, 2);

export const researchPrompt = (slug: string) => {
  const brief = loadBrief(slug);
  const b = wordBudget(brief, loadSeries(brief.series));
  return renderTemplate('research', { brief: json(brief), targetSeconds: brief.targetSeconds, targetWords: b.targetWords });
};

export type ScriptPromptExtras = { playbook?: string; hookDirective?: string };

export const scriptPrompt = (
  slug: string,
  research = readFileSync(storyFile(slug, FILES.research), 'utf8'),
  extras: ScriptPromptExtras = {},
) => {
  const brief = loadBrief(slug);
  const series = loadSeries(brief.series);
  const b = wordBudget(brief, series);
  const multiPart = brief.part !== undefined || brief.constraints.some((c) => /cliffhanger/i.test(c));
  return renderTemplate('script', {
    brief: json(brief),
    research,
    wordsPerSecond: b.wordsPerSecond,
    targetWords: b.targetWords,
    minLines: b.minLines,
    maxLines: b.maxLines,
    ending: multiPart ? 'a `cliffhanger` line (this is one part of a series)' : 'an `aftermath` or `outro` line',
    tone: brief.tone,
    constraints: brief.constraints.map((c) => `- ${c}`).join('\n'),
    schema: json(z.toJSONSchema(Script, { io: 'input' })),
    playbook: extras.playbook ?? '(no playbook yet: follow the writing rules below)',
    hookDirective: extras.hookDirective ?? 'Choose the hook that best fits the story.',
  });
};

/** The manifest without the parts the planner doesn't need. */
/** What the planner may use; a pack limits the sets to that pack's. */
export const plannerManifest = (pack?: string) => {
  const m = buildManifest();
  const sets = pack ? m.sets.filter((s) => s.pack === pack) : m.sets;
  return { sets, props: m.props, actions: m.actions, characters: m.characters, palettes: m.palettes, fx: m.fx, transitions: m.transitions };
};

const EXAMPLE_SHOT = () => {
  const plan = readJson(path.join(REPO_ROOT, 'fixtures/monkeys-paw-30s/03-plan.json'));
  return plan.shots.find((s: { id: string }) => s.id === 'S07');
};

export const planPrompt = (slug: string) => {
  const brief = loadBrief(slug);
  const script = loadScript(slug);
  return renderTemplate('plan', {
    script: json(script),
    brief: json(brief),
    manifest: JSON.stringify(plannerManifest(brief.pack)),
    sfx: loadSfxLibrary().map((s) => `\`${s.id}\`${s.loop ? ' (loop)' : ''}`).join(', ') || '(none yet)',
    slug,
    schema: JSON.stringify(z.toJSONSchema(StorySpec, { io: 'input' })),
    example: json(EXAMPLE_SHOT()),
  });
};
