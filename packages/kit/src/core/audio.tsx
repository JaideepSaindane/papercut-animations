// Story audio (spec 8.4): VO lines, a music bed ducked under the voice, and per-shot SFX.
import React from 'react';
import { Html5Audio, Sequence, staticFile } from 'remotion';
import { shotStartFrames, type StorySpec } from '@papercut/schema';

export const DUCK_RAMP = 6;

/**
 * Music volume at a frame: `volume` normally, `duckTo` while any VO line plays (6-frame ramps),
 * faded in over 0.5 s and out over the last 1 s. Pure — unit tested.
 */
export const musicVolumeAt = (
  frame: number,
  o: { vo: { startFrame: number; durationInFrames: number }[]; total: number; fps: number; volume: number; duckTo: number },
) => {
  let duck = 0;
  for (const v of o.vo) {
    const s = v.startFrame;
    const e = v.startFrame + v.durationInFrames;
    let d = 0;
    if (frame >= s && frame <= e) d = 1;
    else if (frame < s && frame >= s - DUCK_RAMP) d = 1 - (s - frame) / DUCK_RAMP;
    else if (frame > e && frame <= e + DUCK_RAMP) d = 1 - (frame - e) / DUCK_RAMP;
    duck = Math.max(duck, d);
  }
  const level = o.volume + (o.duckTo - o.volume) * duck;
  const fadeIn = Math.min(1, frame / (0.5 * o.fps));
  const fadeOut = Math.min(1, Math.max(0, (o.total - frame) / (1 * o.fps)));
  return Math.max(0, level * fadeIn * fadeOut);
};

/** Absolute URLs pass through; anything else is relative to `base` (story files) or the public dir. */
const resolve = (src: string, base?: string) =>
  /^(https?:|data:|blob:)/.test(src) ? src : base ? `${base.replace(/\/$/, '')}/${src}` : staticFile(src);

export const StoryAudio: React.FC<{ spec: StorySpec; total: number; assetBase?: string }> = ({ spec, total, assetBase }) => {
  const starts = shotStartFrames(spec);
  const music = spec.music;
  return (
    <>
      {/* VO lives in the story folder, so it needs assetBase (the render stage serves the folder) */}
      {assetBase &&
        (spec.vo ?? []).map((v) => (
          <Sequence key={v.lineId} from={v.startFrame} durationInFrames={v.durationInFrames + 15} name={`VO ${v.lineId}`} layout="none">
            <Html5Audio src={resolve(v.src, assetBase)} />
          </Sequence>
        ))}
      {music?.src && (
        <Html5Audio
          src={resolve(music.src)}
          loop
          name={`music ${music.id}`}
          volume={(f) =>
            musicVolumeAt(f, { vo: spec.vo ?? [], total, fps: spec.fps, volume: music.volume, duckTo: music.duckTo })
          }
        />
      )}
      {spec.shots.flatMap((shot, i) =>
        shot.sfx
          .filter((s) => s.src)
          .map((s, k) => {
            const dur = shot.durationInFrames ?? 60;
            const from = starts[i] + Math.round(s.at * dur);
            return (
              <Sequence key={`${shot.id}-${k}`} from={from} durationInFrames={s.loop ? dur - Math.round(s.at * dur) : undefined} name={`SFX ${s.id}`} layout="none">
                <Html5Audio src={resolve(s.src!)} volume={s.volume} loop={s.loop} />
              </Sequence>
            );
          }),
      )}
    </>
  );
};
