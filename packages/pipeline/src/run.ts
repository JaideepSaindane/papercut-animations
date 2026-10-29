// Stage chaining (`pc run`) and fixture import.
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Format, TtsEngine } from '@papercut/schema';
import { log, readJson, storyDir } from '@papercut/shared';
import { checkPlan, planApi, type Mode } from './author';
import { formatIssues } from './validate';
import { renderStage } from './render';
import { FILES, loadBrief, loadState, saveState } from './story';
import { timeStage } from './timing';
import { ttsStage } from './tts';

export const STAGES = ['plan', 'validate', 'tts', 'time', 'render'] as const;
export type Stage = (typeof STAGES)[number];

/** Copy a fixture folder (with 00-brief.json) into data/stories/<slug>; existing stories are left alone. */
export const importFixture = (dir: string): string => {
  const brief = readJson(path.join(dir, FILES.brief));
  const slug: string = brief.slug;
  if (!existsSync(storyDir(slug))) {
    cpSync(dir, storyDir(slug), { recursive: true });
    log.info(`imported fixture ${dir} -> data/stories/${slug}`);
  }
  return slug;
};

export type RunOptions = {
  from?: Stage;
  to?: Stage;
  langs?: string[];
  formats?: Format[];
  engine?: TtsEngine;
  force?: boolean;
  /** who writes the plan when it's missing: Claude Code (stop and ask) or the API */
  mode?: Mode;
};

export const runStory = async (slugOrDir: string, o: RunOptions = {}) => {
  const slug = existsSync(path.join(slugOrDir, FILES.brief)) ? importFixture(slugOrDir) : slugOrDir;
  const brief = loadBrief(slug);
  const langs = o.langs ?? brief.languages;
  const formats = o.formats ?? brief.formats;
  const at = (s: Stage) => STAGES.indexOf(s);
  const from = at(o.from ?? 'plan');
  const to = at(o.to ?? 'render');
  const outputs: string[] = [];
  try {
    if (from <= at('plan') && to >= at('plan') && !existsSync(path.join(storyDir(slug), FILES.plan))) {
      if (o.mode !== 'api') throw new Error(`${slug}: no ${FILES.plan} yet — write it in Claude Code (/approve ${slug}) or run with --mode api`);
      await planApi(slug);
    }
    if (from <= at('validate') && to >= at('validate')) {
      const issues = checkPlan(slug);
      log.info(formatIssues(`plan ${slug}`, issues));
      if (issues.errors.length) throw new Error(`${slug}: plan has ${issues.errors.length} error(s); fix them (or /add-asset) and re-run`);
    }
    for (const lang of langs) {
      if (from <= at('tts') && to >= at('tts')) await ttsStage(slug, { lang, engine: o.engine, force: o.force });
      if (from <= at('time') && to >= at('time')) timeStage(slug, { lang });
      if (from <= at('render') && to >= at('render')) for (const format of formats) outputs.push(await renderStage(slug, { lang, format }));
    }
  } catch (e) {
    const s = loadState(slug);
    s.error = (e as Error).message;
    saveState(s);
    throw e;
  }
  return { slug, outputs };
};
