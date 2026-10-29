import React from 'react';
import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import {
  TRANSITION_OVERLAP,
  normaliseFx,
  shotStartFrames,
  specTotalFrames,
  type CharacterSpec,
  type Format,
  type Shot as ShotSpec,
  type StorySpec,
} from '@papercut/schema';
import { SETS } from '../sets';
import { ActorsOn } from '../Actor';
import { Layer } from './Camera';
import { CaptionCard } from './CaptionCard';
import { FilterScope } from './Filters';
import { FormatProvider, ScreenSpace, useFormat, useView } from './format';
import { FlashIn, SceneFx, ShotOverlayFx } from './fx';
import { seededRandom, seg } from './math';
import { Jitter, Post } from './Post';
import { ShotProvider, useShot } from './ShotContext';
import { presentationFor } from './transitions';
import { StyleProvider, type Style } from './style';
import { StoryAudio } from './audio';

const MissingSet: React.FC<{ id: string }> = ({ id }) => {
  const v = useView();
  return (
    <>
      <rect x={v.x0} y={v.y0} width={v.w} height={v.h} fill="#3a0d0d" />
      <text x={v.cx} y={v.cy} textAnchor="middle" fill="#fff" fontSize={48} fontFamily="monospace">
        missing set: {id}
      </text>
    </>
  );
};

/** Camera shake from `{ target: 'camera', action: 'shake' }` actions: decaying random offset at 24 Hz. */
const useShake = () => {
  const { shot, p, t } = useShot();
  const a = shot.actions.find((x) => x.target === 'camera' && x.action === 'shake');
  if (!a || p < a.at || p > a.at + a.dur) return 0;
  return (seededRandom(Math.floor(t * 24)) - 0.5) * (a.params.amp ?? 14) * (1 - seg(p, a.at, a.at + a.dur));
};

/** The set's depth layers with actors interleaved, under the camera. */
const SceneLayers: React.FC = () => {
  const { shot } = useShot();
  const view = useView(0);
  const def = SETS[shot.set];
  if (!def) return <MissingSet id={shot.set} />;
  const pal = shot.palette ?? def.palettes[0];
  const v = { ...def.defaults, ...shot.setVariant };
  const { sky: Sky, far: Far, mid: Mid, fg: Fg } = def;
  return (
    <>
      {Sky && (
        <Layer depth="sky" blur={0}>
          <Sky v={v} pal={pal} />
        </Layer>
      )}
      {Far && (
        <Layer depth="far">
          <Far v={v} pal={pal} />
        </Layer>
      )}
      <Layer depth="mid">
        {Mid && <Mid v={v} pal={pal} />}
        <ActorsOn layer="mid" />
      </Layer>
      <Layer depth="subject">
        <ActorsOn layer="subject" />
      </Layer>
      <Layer depth="fg">
        {Fg && <Fg v={v} pal={pal} />}
        <ActorsOn layer="fg" />
      </Layer>
      <Layer depth="fx">
        <SceneFx areas={def.fx?.(view) ?? {}} />
      </Layer>
    </>
  );
};

const ShotScene: React.FC<{ lang: string }> = ({ lang }) => {
  const { shot, t, p, globalFrame } = useShot();
  const shake = useShake();
  const fadeEnd = shot.fx.find((f) => f === 'fade_black_end' || (typeof f === 'object' && f.id === 'fade_black_end'));
  const fadeAt = typeof fadeEnd === 'object' ? (fadeEnd.at ?? 0.82) : 0.82;
  const captionOpacity = fadeEnd ? 1 - seg(p, fadeAt + 0.03, 1) : 1;
  return (
    <>
      <Jitter frame={globalFrame}>
        <g transform={`translate(${shake} ${shake * 0.6})`}>
          <SceneLayers />
        </g>
        <ScreenSpace>
          <ShotOverlayFx />
        </ScreenSpace>
      </Jitter>
      <ScreenSpace>
        <Post frame={globalFrame} />
        {shot.caption && <CaptionCard text={shot.caption} t={t} tilt={shot.captionTilt} lang={lang} opacity={captionOpacity} />}
        <FlashIn />
      </ScreenSpace>
    </>
  );
};

/** One shot as a full-frame SVG whose viewBox is the format's window onto world space. */
export const Shot: React.FC<{
  shot: ShotSpec;
  characters: CharacterSpec[];
  startFrame: number;
  lang: string;
  format?: Format;
  style?: Style;
}> = ({ shot, characters, startFrame, lang, format = 'vertical', style = 'diecut' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = shot.durationInFrames ?? 60;
  return (
    <FormatProvider format={format}>
      <StyleProvider style={style}>
      <ShotSvg>
        <ShotProvider
          value={{
            shot,
            characters,
            fx: normaliseFx(shot.fx),
            t: frame / fps,
            p: frame / dur,
            globalFrame: startFrame + frame,
            fps,
            durationInFrames: dur,
          }}
        >
          <ShotScene lang={lang} />
        </ShotProvider>
      </ShotSvg>
      </StyleProvider>
    </FormatProvider>
  );
};

const ShotSvg: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height, view } = useFormat();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <svg width={width} height={height} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} xmlns="http://www.w3.org/2000/svg">
        <FilterScope>{children}</FilterScope>
      </svg>
    </AbsoluteFill>
  );
};

export const shotStarts = shotStartFrames;

/** A whole story: shots in series, hard cuts by default, fade / paper_slide when the spec asks. */
/** `assetBase` is the URL the story folder is served from (VO lines); music and SFX come from the public dir. */
export const Story: React.FC<{ spec: StorySpec; format?: Format; assetBase?: string }> = ({ spec, format, assetBase }) => {
  const fmt = format ?? spec.format;
  const starts = shotStarts(spec);
  const crossShot = spec.shots.some((s, i) => i > 0 && TRANSITION_OVERLAP[s.transitionIn] > 0);
  const shotEl = (shot: ShotSpec, i: number) => (
    <Shot shot={shot} characters={spec.characters} startFrame={starts[i]} lang={spec.language} format={fmt} style={spec.style} />
  );
  const audio = <StoryAudio spec={spec} total={specTotalFrames(spec)} assetBase={assetBase} />;
  if (!crossShot) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        {audio}
        <Series>
          {spec.shots.map((shot, i) => (
            <Series.Sequence key={shot.id} durationInFrames={shot.durationInFrames ?? 60} name={`${shot.id} ${shot.set}`}>
              {shotEl(shot, i)}
            </Series.Sequence>
          ))}
        </Series>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {audio}
      <TransitionSeries>
        {spec.shots.flatMap((shot, i) => {
          const out: React.ReactNode[] = [];
          const ov = i > 0 ? TRANSITION_OVERLAP[shot.transitionIn] : 0;
          if (ov > 0) {
            out.push(
              <TransitionSeries.Transition
                key={`${shot.id}-in`}
                presentation={presentationFor(shot.transitionIn as 'fade' | 'paper_slide')}
                timing={linearTiming({ durationInFrames: ov })}
              />,
            );
          }
          out.push(
            <TransitionSeries.Sequence key={shot.id} durationInFrames={shot.durationInFrames ?? 60} name={`${shot.id} ${shot.set}`}>
              {shotEl(shot, i)}
            </TransitionSeries.Sequence>,
          );
          return out;
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
