// Timing stage (spec 8.3): the voice drives the picture. Pure `computeTiming` + file IO in `timeStage`.
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  MusicTrack,
  SfxEntry,
  TRANSITION_OVERLAP,
  shotStartFrames,
  specTotalFrames,
  type Script,
  type StorySpec,
  type VoLine,
} from '@papercut/schema';
import { assetsDir, hashOf, log, readJsonIf, writeJson, writeText } from '@papercut/shared';
import { buildSrt } from './srt';
import { FILES, loadBrief, loadPlan, loadScript, loadSeries, loadVo, markStage, storyFile } from './story';

export const TIMING = {
  /** gap after a shot's last line (seconds) */
  gapAfter: 0.18,
  /** after a `turn` or `cliffhanger` beat */
  gapAfterBeat: 0.5,
  /** between two lines inside one shot */
  gapBetween: 0.18,
  minShot: 1.4,
  preRoll: 0.3,
  tail: 0.8,
  /** VO starts this many frames after the cut */
  breathFrames: 4,
  maxLine: 4.5,
};

export type TimingResult = { spec: StorySpec; warnings: string[] };

/** Turn a plan (StorySpec without timings) + measured VO into a timed StorySpec. Pure. */
export const computeTiming = (plan: StorySpec, vo: VoLine[], script: Script, fps = plan.fps): TimingResult => {
  const warnings: string[] = [];
  const dur = new Map(vo.map((v) => [v.lineId, v.durationSec]));
  const beat = new Map(script.lines.map((l) => [l.id, l.beat]));
  const f = (s: number) => Math.round(s * fps);

  // durations first
  const shots = plan.shots.map((shot, i) => {
    const lines = shot.lineIds.map((id) => {
      const d = dur.get(id);
      if (d === undefined) throw new Error(`shot ${shot.id}: no voice for line ${id}`);
      if (d > TIMING.maxLine && shot.lineIds.length === 1)
        warnings.push(`shot ${shot.id}: line ${id} is ${d.toFixed(1)} s (> ${TIMING.maxLine} s); the plan should split it across two shots`);
      return { id, frames: f(d) };
    });
    const last = shot.lineIds[shot.lineIds.length - 1];
    const gapAfter = ['turn', 'cliffhanger'].includes(beat.get(last) ?? '') ? TIMING.gapAfterBeat : TIMING.gapAfter;
    const isFirst = i === 0;
    const isLast = i === plan.shots.length - 1;
    const voiceFrames = lines.reduce((s, l) => s + l.frames, 0) + f(TIMING.gapBetween) * (lines.length - 1);
    let frames =
      (isFirst ? f(TIMING.preRoll) : 0) + TIMING.breathFrames + voiceFrames + f(gapAfter) + (isLast ? f(TIMING.tail) : 0);
    // the next shot's cross-fade eats into this one: extend so lines never overlap
    const next = plan.shots[i + 1];
    if (next) frames += TRANSITION_OVERLAP[next.transitionIn];
    frames = Math.max(frames, Math.ceil(TIMING.minShot * fps));
    return { shot: { ...shot, durationInFrames: frames }, lines, isFirst };
  });

  const timed = { ...plan, shots: shots.map((s) => s.shot) };
  const starts = shotStartFrames(timed);
  const voTrack: NonNullable<StorySpec['vo']> = [];
  shots.forEach((s, i) => {
    let at = starts[i] + (s.isFirst ? f(TIMING.preRoll) : 0) + TIMING.breathFrames;
    for (const l of s.lines) {
      const v = vo.find((x) => x.lineId === l.id)!;
      voTrack.push({ lineId: l.id, src: v.file, startFrame: at, durationInFrames: l.frames });
      at += l.frames + f(TIMING.gapBetween);
    }
  });

  const spec: StorySpec = { ...timed, vo: voTrack };
  spec.totalFrames = specTotalFrames(spec);
  return { spec, warnings };
};

// ---------- music & sfx libraries ----------
export const loadMusicLibrary = (): MusicTrack[] =>
  (readJsonIf<unknown[]>(path.join(assetsDir(), 'music', 'music.json')) ?? []).map((t) => MusicTrack.parse(t));
export const loadSfxLibrary = (): SfxEntry[] =>
  (readJsonIf<unknown[]>(path.join(assetsDir(), 'sfx', 'sfx.json')) ?? []).map((t) => SfxEntry.parse(t));

/** Deterministic pick: tracks matching any mood, chosen by slug hash so a story keeps its track. */
export const pickMusic = (lib: MusicTrack[], moods: string[], slug: string): MusicTrack | undefined => {
  const match = lib.filter((t) => t.mood.some((m) => moods.includes(m)));
  const pool = match.length ? match : lib;
  if (!pool.length) return undefined;
  return pool[parseInt(hashOf(slug, 8), 16) % pool.length];
};

/** Resolve music/sfx ids to files under assets/ (served by Remotion's public dir). */
export const attachAudioAssets = (spec: StorySpec, slug: string, moods: string[], defaults: { volume: number; duckTo: number }) => {
  const warnings: string[] = [];
  const music = loadMusicLibrary();
  const track = spec.music ? music.find((t) => t.id === spec.music!.id) : pickMusic(music, moods, slug);
  if (spec.music && !track) warnings.push(`music "${spec.music.id}" is not in assets/music/music.json`);
  if (track && existsSync(path.join(assetsDir(), 'music', track.file))) {
    spec.music = {
      id: track.id,
      volume: spec.music?.volume ?? defaults.volume,
      duckTo: spec.music?.duckTo ?? defaults.duckTo,
      src: `music/${track.file}`,
    };
  } else if (!track) {
    warnings.push('no music in assets/music/music.json — rendering without a bed (run `pc assets placeholders`)');
  }
  const sfx = new Map(loadSfxLibrary().map((s) => [s.id, s]));
  for (const shot of spec.shots) {
    shot.sfx = shot.sfx.map((s) => {
      const e = sfx.get(s.id);
      if (!e) warnings.push(`shot ${shot.id}: sfx "${s.id}" is not in assets/sfx/sfx.json`);
      else if (!existsSync(path.join(assetsDir(), 'sfx', e.file))) warnings.push(`sfx "${s.id}": file assets/sfx/${e.file} is missing (pc assets placeholders?)`);
      return e && existsSync(path.join(assetsDir(), 'sfx', e.file)) ? { ...s, src: `sfx/${e.file}`, loop: e.loop } : s;
    });
  }
  return warnings;
};

/** File IO wrapper: 03-plan.json + vo.json -> 04-spec.<lang>.json + out/<lang>/<slug>.srt */
export const timeStage = (slug: string, { lang = 'en-IN' }: { lang?: string } = {}) => {
  const brief = loadBrief(slug);
  const series = loadSeries(brief.series);
  const script = loadScript(slug);
  const plan = { ...loadPlan(slug), language: lang };
  const vo = loadVo(slug, lang);
  if (!vo) throw new Error(`${slug}: no voice for ${lang} yet (pc tts ${slug} --lang ${lang})`);
  const { spec, warnings } = computeTiming(plan, vo.lines, script);
  warnings.push(...attachAudioAssets(spec, slug, series.music.moods, series.music));
  // captions per language come from the translation when there is one
  writeJson(storyFile(slug, FILES.spec(lang)), spec);
  writeText(storyFile(slug, FILES.srt(slug, lang)), buildSrt(spec, script, { lang, use: series.subtitles }));
  markStage(slug, `time:${lang}`, hashOf({ plan, vo: vo.lines.map((l) => l.hash) }), 'timed');
  for (const w of warnings) log.warn(w);
  log.info(`time ${slug} [${lang}]: ${spec.shots.length} shots, ${(spec.totalFrames! / spec.fps).toFixed(1)} s (target ${brief.targetSeconds} s)`);
  return { spec, warnings };
};
