// Story folder access and state.json (spec 5).
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  Brief,
  Script,
  SeriesConfig,
  StorySpec,
  StoryState,
  StoryStatus,
  VoFile,
  type Format,
  type VoiceConfig,
} from '@papercut/schema';
import { REPO_ROOT, readJson, readJsonIf, storyDir, writeJson } from '@papercut/shared';

export const storyFile = (slug: string, ...parts: string[]) => path.join(storyDir(slug), ...parts);

export const FILES = {
  brief: '00-brief.json',
  research: '01-research.md',
  script: '02-script.json',
  plan: '03-plan.json',
  spec: (lang: string) => `04-spec.${lang}.json`,
  vo: (lang: string) => `audio/${lang}/vo.json`,
  render: (lang: string, format: Format) => `render/${lang}.${format}.mp4`,
  srt: (slug: string, lang: string) => `out/${lang}/${slug}.srt`,
} as const;

export const loadBrief = (slug: string) => Brief.parse(readJson(storyFile(slug, FILES.brief)));
export const loadScript = (slug: string) => Script.parse(readJson(storyFile(slug, FILES.script)));
export const loadPlan = (slug: string) => StorySpec.parse(readJson(storyFile(slug, FILES.plan)));
export const loadTimedSpec = (slug: string, lang: string) => StorySpec.parse(readJson(storyFile(slug, FILES.spec(lang))));
export const loadVo = (slug: string, lang: string) => {
  const v = readJsonIf(storyFile(slug, FILES.vo(lang)));
  return v ? VoFile.parse(v) : undefined;
};

export const requireFile = (slug: string, rel: string, hint: string) => {
  if (!existsSync(storyFile(slug, rel))) throw new Error(`${slug}: missing ${rel} — ${hint}`);
};

// ---------- state.json ----------
const ORDER = StoryStatus.options;

export const loadState = (slug: string): StoryState =>
  StoryState.parse(readJsonIf(storyFile(slug, 'state.json')) ?? { slug });

export const saveState = (s: StoryState) => writeJson(storyFile(s.slug, 'state.json'), { ...s, updatedAt: new Date().toISOString() });

/** Record a finished stage; status only moves forward (re-running an early stage doesn't rewind it). */
export const markStage = (slug: string, key: string, hash: string, status?: StoryStatus) => {
  const s = loadState(slug);
  s.stages[key] = { hash, at: new Date().toISOString() };
  if (status && ORDER.indexOf(status) > ORDER.indexOf(s.status)) s.status = status;
  delete s.error;
  saveState(s);
};

export const stageFresh = (slug: string, key: string, hash: string) => loadState(slug).stages[key]?.hash === hash;

export const isApproved = (slug: string) => ORDER.indexOf(loadState(slug).status) >= ORDER.indexOf('approved');

// ---------- series config ----------
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const loadSeries = (name?: string): SeriesConfig => {
  const file = name ? path.join(REPO_ROOT, 'series', `${slugify(name)}.json`) : undefined;
  const raw = file && existsSync(file) ? readJson(file) : { name: name ?? 'default' };
  return SeriesConfig.parse(raw);
};

export const voiceFor = (series: SeriesConfig, lang: string): VoiceConfig => ({ ...series.voice, ...(series.voices[lang] ?? {}) });
