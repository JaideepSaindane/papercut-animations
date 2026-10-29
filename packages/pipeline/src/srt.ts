// Subtitles from the VO track (spec 8.3).
import type { Script, StorySpec } from '@papercut/schema';

const ts = (frames: number, fps: number) => {
  const ms = Math.round((frames / fps) * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const r = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
};

/** One cue per VO line, using the caption text (default) or the spoken text. */
export const buildSrt = (
  spec: StorySpec,
  script: Script,
  { lang = 'en-IN', use = 'caption' }: { lang?: string; use?: 'caption' | 'vo' } = {},
) => {
  const tr = lang !== 'en-IN' ? script.translations?.[lang] : undefined;
  const text = (id: string) => {
    const l = tr?.find((x) => x.id === id) ?? script.lines.find((x) => x.id === id);
    return l ? (use === 'vo' ? l.vo : l.caption) : '';
  };
  return (
    (spec.vo ?? [])
      .map((v, i) => `${i + 1}\n${ts(v.startFrame, spec.fps)} --> ${ts(v.startFrame + v.durationInFrames, spec.fps)}\n${text(v.lineId)}\n`)
      .join('\n')
  );
};
