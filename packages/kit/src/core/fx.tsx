// FX (spec 7.5). Scene fx live in world space inside the fx depth layer and take their areas from the set;
// overlay fx are full-frame in screen space.
import React from 'react';
import type { Rect } from '@papercut/schema';
import type { SetFxAreas } from '../sets/types';
import { useDefs } from './Filters';
import { useFormat, useView } from './format';
import { seededRandom as rnd, seg } from './math';
import { useFxEntry, useShot } from './ShotContext';

/** Window [at, at+dur] of an fx entry as an envelope 0..1 (defaults to the whole shot). */
const useFxLevel = (id: Parameters<typeof useFxEntry>[0]) => {
  const e = useFxEntry(id);
  const { p } = useShot();
  if (!e) return 0;
  const at = e.at ?? 0;
  const end = e.dur != null ? at + e.dur : 1;
  if (p < at || p > end) return 0;
  // short ramps in and out so particle fx don't pop
  return Math.min(1, seg(p, at, at + 0.08)) * (end >= 1 ? 1 : 1 - seg(p, end - 0.08, end));
};

export const Fireflies: React.FC<{ n: number; area: Rect; color: string; level?: number }> = ({ n, area, color, level = 1 }) => {
  const { t } = useShot();
  const { url } = useDefs();
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = area.x + rnd(i) * area.w + 20 * Math.sin(t * 1.3 + i);
        const y = area.y + rnd(i + 50) * area.h + 15 * Math.cos(t * 1.1 + i * 2);
        const a = (0.25 + 0.75 * Math.max(0, Math.sin(t * 4 + i * 1.7))) * level;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={16} fill={color} opacity={a * 0.35} filter={url('blur3')} />
            <circle cx={x} cy={y} r={5} fill={color} opacity={a} />
          </g>
        );
      })}
    </>
  );
};

/** Dust motes drifting slowly, catching the light. */
const Dust: React.FC<{ area: Rect; level: number }> = ({ area, level }) => {
  const { t } = useShot();
  return (
    <g style={{ mixBlendMode: 'screen' }}>
      {Array.from({ length: 26 }, (_, i) => {
        const x = area.x + ((rnd(i) * area.w + t * (8 + rnd(i + 3) * 10)) % area.w);
        const y = area.y + ((rnd(i + 20) * area.h + t * (4 + rnd(i + 7) * 6)) % area.h);
        const a = (0.2 + 0.5 * Math.max(0, Math.sin(t * 1.5 + i))) * level;
        return <circle key={i} cx={x} cy={y} r={2 + rnd(i + 9) * 3} fill="#fff1c8" opacity={a} />;
      })}
    </g>
  );
};

const Rain: React.FC<{ level: number; groundY: number }> = ({ level, groundY }) => {
  const { t } = useShot();
  const v = useView(100);
  const fall = 2600; // px/s
  const span = groundY - v.y0;
  return (
    <g opacity={0.55 * level}>
      {Array.from({ length: 140 }, (_, i) => {
        const x = v.x0 + rnd(i) * v.w - ((t * fall * 0.15) % 200);
        const y = v.y0 + ((rnd(i + 300) * span + t * fall) % span);
        return <line key={i} x1={x} y1={y} x2={x - 10} y2={y + 60} stroke="#c8d8e8" strokeWidth={2} />;
      })}
    </g>
  );
};

const Snow: React.FC<{ level: number; groundY: number }> = ({ level, groundY }) => {
  const { t } = useShot();
  const v = useView(100);
  const span = groundY - v.y0;
  return (
    <g opacity={0.9 * level}>
      {Array.from({ length: 90 }, (_, i) => {
        const x = v.x0 + rnd(i) * v.w + 30 * Math.sin(t * 0.9 + i);
        const y = v.y0 + ((rnd(i + 500) * span + t * (90 + rnd(i + 2) * 70)) % span);
        return <circle key={i} cx={x} cy={y} r={3 + rnd(i + 11) * 5} fill="#f6f2ea" />;
      })}
    </g>
  );
};

const Fog: React.FC<{ level: number; groundY: number }> = ({ level, groundY }) => {
  const { t } = useShot();
  const { url } = useDefs();
  const v = useView();
  return (
    <g filter={url('glow')} opacity={0.4 * level}>
      {Array.from({ length: 9 }, (_, i) => {
        const x = v.x0 + ((rnd(i) * v.w + t * (20 + i * 4)) % v.w);
        return <ellipse key={i} cx={x} cy={groundY - 40 + rnd(i + 4) * 120} rx={260 + rnd(i + 1) * 200} ry={70} fill="#cfd6d8" />;
      })}
    </g>
  );
};

const LightCone: React.FC<{ level: number; cone: NonNullable<SetFxAreas['lightCone']>; color: string }> = ({ level, cone, color }) => {
  const { url } = useDefs();
  const { x, y, width, length } = cone;
  return (
    <path
      d={`M${x - width / 2} ${y} L${x + width / 2} ${y} L${x + width * 1.6} ${y + length} L${x - width * 1.6} ${y + length} Z`}
      fill={color}
      opacity={0.16 * level}
      filter={url('blur6')}
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

/** Scene fx for the current shot. `areas` come from the set definition for the visible view. */
export const SceneFx: React.FC<{ areas: SetFxAreas }> = ({ areas }) => {
  const v = useView(0);
  const fallback: Rect = { x: v.left + 80, y: v.cy, w: v.right - v.left - 160, h: (v.bottom - v.top) / 3 };
  const groundY = areas.groundY ?? 1400;
  const ff = useFxLevel('fireflies');
  const dust = useFxLevel('dust');
  const rain = useFxLevel('rain');
  const snow = useFxLevel('snow');
  const fog = useFxLevel('fog');
  const cone = useFxLevel('light_cone');
  const coneEntry = useFxEntry('light_cone');
  const { shot } = useShot();
  const night = shot.palette === 'night';
  return (
    <>
      {cone > 0 && (
        <LightCone
          level={cone}
          cone={{ ...(areas.lightCone ?? { x: v.cx, y: v.top, width: 200, length: 1100 }), ...(coneEntry?.params ?? {}) }}
          color={coneEntry?.params.color ?? '#ffe9b0'}
        />
      )}
      {dust > 0 && <Dust area={areas.dust ?? fallback} level={dust} />}
      {fog > 0 && <Fog level={fog} groundY={groundY} />}
      {ff > 0 && <Fireflies n={9} area={areas.fireflies ?? fallback} color={night ? '#d8f08a' : '#ffe98a'} level={ff} />}
      {rain > 0 && <Rain level={rain} groundY={groundY + 300} />}
      {snow > 0 && <Snow level={snow} groundY={groundY + 300} />}
    </>
  );
};

/**
 * Full-frame overlay fx in screen space: red_tint ramps a multiply tint to 0.38; flicker dips global
 * brightness; fade_black_end fades to black; fade_in fades up from black.
 */
export const ShotOverlayFx: React.FC = () => {
  const { p, t } = useShot();
  const { width, height } = useFormat();
  const red = useFxEntry('red_tint');
  const flicker = useFxEntry('flicker');
  const fadeEnd = useFxEntry('fade_black_end');
  const fadeIn = useFxEntry('fade_in');
  const full = { x: 0, y: 0, width, height };
  let dim = 0;
  if (flicker && p >= (flicker.at ?? 0) && p <= (flicker.at ?? 0) + (flicker.dur ?? 1)) {
    dim = rnd(Math.floor(t * 24) + 400) > 0.6 ? 0.45 : 0.05;
  }
  return (
    <>
      {red && (
        <rect
          {...full}
          fill="#9c1414"
          opacity={(red.params.max ?? 0.38) * seg(p, red.at ?? 0.45, (red.at ?? 0.45) + (red.dur ?? 0.3))}
          style={{ mixBlendMode: 'multiply' }}
        />
      )}
      {dim > 0 && <rect {...full} fill="#000" opacity={dim} />}
      {fadeEnd && <rect {...full} fill="#000" opacity={seg(p, fadeEnd.at ?? 0.82, 1)} />}
      {fadeIn && <rect {...full} fill="#000" opacity={1 - seg(p, fadeIn.at ?? 0, (fadeIn.at ?? 0) + (fadeIn.dur ?? 0.15))} />}
    </>
  );
};

/** `flash` transition: 2-frame warm-white flash at the start of the shot. */
export const FlashIn: React.FC = () => {
  const { shot, t, fps } = useShot();
  const { width, height } = useFormat();
  if (shot.transitionIn !== 'flash') return null;
  const f = Math.floor(t * fps);
  if (f > 2) return null;
  return <rect x={0} y={0} width={width} height={height} fill="#fff4dc" opacity={f < 2 ? 1 : 0.5} />;
};
