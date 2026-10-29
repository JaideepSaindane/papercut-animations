import React from 'react';
import { INK } from '../palettes';
import { useDefs } from '../core/Filters';
import { Blur, Cutout, P, R } from '../core/Ink';
import { useCamera } from '../core/Camera';
import { useView } from '../core/format';
import { useTarget } from '../core/ShotContext';
import { seededRandom as rnd, shade } from '../core/math';
import { Fern, Pine } from '../props/outdoor';
import { BG_H, BG_Y, type SetDef } from './types';

const SKY_GRADIENT: Record<string, string> = { dusk: 'dusk', night: 'night', day: 'day' };

/** Gradient sky across the padded view. */
const Sky: React.FC<{ pal: string }> = ({ pal }) => {
  const { url } = useDefs();
  const v = useView();
  return <rect x={v.x0} y={BG_Y} width={v.w} height={BG_H} fill={url(SKY_GRADIENT[pal] ?? 'dusk')} />;
};

/** Sun (dusk/day) or moon (night) as a light element. */
const Orb: React.FC<{ pal: string; x: number; y: number; r?: number; id?: string }> = ({ pal, x, y, r, id = 'sun' }) => {
  const { url } = useDefs();
  const s = useTarget(id);
  if (pal === 'night') {
    const rr = r ?? 70;
    return (
      <>
        <circle cx={x} cy={y} r={rr * 2.9} fill="#efe6c8" opacity={0.25 * s.light} filter={url('glow')} />
        <circle cx={x} cy={y} r={rr} fill="#efe6c8" />
      </>
    );
  }
  const rr = r ?? 95;
  return (
    <>
      <circle cx={x} cy={y} r={rr * 2.75} fill="#ffd38a" opacity={(pal === 'day' ? 0.25 : 0.35) * s.light} filter={url('glow')} />
      <circle cx={x} cy={y} r={rr} fill={pal === 'day' ? '#fff3c8' : '#ffe6a8'} />
    </>
  );
};

/** Repeat x positions across the padded view: start + k·step. */
const across = (x0: number, x1: number, start: number, step: number) => {
  const out: number[] = [];
  const k0 = Math.ceil((x0 - start) / step);
  for (let x = start + k0 * step; x <= x1; x += step) out.push(x);
  return out;
};

const GROUND: Record<string, string> = { dusk: '#55703e', night: '#2c3a2c', day: '#7c8c4a' };

/* ---------------- house_ext_ranch ---------------- */
const RanchHouse: React.FC<{ lit: boolean; light: number }> = ({ lit, light }) => {
  const { url } = useDefs();
  const win = lit ? (light > 0.5 ? '#ffcf6e' : '#a8884a') : '#3a4f6e';
  return (
    <>
      <Cutout>
        <R x={650} y={985} w={42} h={90} fill="#7a3b2c" />
        <R x={290} y={1100} w={500} h={200} fill="#d7c39a" />
        {Array.from({ length: 8 }, (_, i) => 1122 + i * 22).map((y) => (
          <line key={y} x1={292} y1={y} x2={788} y2={y} stroke="#b49c6c" strokeWidth={2} />
        ))}
        {[
          [330, 110],
          [470, 110],
          [715, 55],
        ].map(([x, w]) => (
          <g key={x}>
            <R x={x} y={1150} w={w} h={80} fill={win} />
            <line x1={x + w / 2} y1={1150} x2={x + w / 2} y2={1230} stroke={INK} strokeWidth={3} />
            <line x1={x} y1={1190} x2={x + w} y2={1190} stroke={INK} strokeWidth={3} />
          </g>
        ))}
        <R x={615} y={1160} w={70} h={140} fill="#6a2c23" />
        <circle cx={672} cy={1235} r={5} fill="#e0b86a" />
        <P d="M235 1118 L540 975 L845 1118 Z" fill="#4a2b20" />
      </Cutout>
      {lit && (
        <g style={{ mixBlendMode: 'screen' }}>
          {[385, 525, 742].map((x) => (
            <circle key={x} cx={x} cy={1190} r={70} fill="#ffb84a" opacity={0.35 * light} filter={url('glow')} />
          ))}
        </g>
      )}
    </>
  );
};

const houseExt: SetDef = {
  id: 'house_ext_ranch',
  description: 'Single-storey suburban ranch house across a lawn, low sun or moon behind, pines framing the edges.',
  palettes: ['dusk', 'night', 'day'],
  params: { lit: 'boolean windows lit (default true)', pineDrift: 'number px the fg pines drift outward on push (default 70)', pines: 'boolean (default true)' },
  defaults: { lit: true, pineDrift: 70, pines: true },
  anchors: { lawn_y: [540, 1450], door: [650, 1300], driveway: [860, 1600] },
  elements: ['sun', 'moon', 'house_windows'],
  fx: (v) => ({ fireflies: { x: v.left + 100, y: 1250, w: v.right - v.left - 200, h: 250 }, groundY: 1290 }),
  sky: ({ pal }) => (
    <>
      <Sky pal={pal} />
      <Orb pal={pal} id={pal === 'night' ? 'moon' : 'sun'} x={660} y={1010} r={pal === 'night' ? 70 : 95} />
    </>
  ),
  far: ({ pal }) => {
    const v = useView();
    const night = pal === 'night';
    return (
      <Blur>
        <path d={`M${v.x0} 1090 C 150 990 350 1060 560 1015 C 760 975 950 1050 ${v.x1} 990 L${v.x1} 2200 L${v.x0} 2200Z`} fill={night ? '#22262c' : '#5a3438'} />
        <path d={`M${v.x0} 1170 C 200 1110 500 1160 700 1125 C 900 1095 1050 1135 ${v.x1} 1110 L${v.x1} 2200 L${v.x0} 2200Z`} fill={night ? '#1d2a24' : '#33433a'} />
        {[...across(v.x0, -100, -260, 110), 120, 230, 880, 960, 1010, ...across(1180, v.x1, 1180, 120)].map((x, i) => (
          <path key={`${x}-${i}`} d={`M${x - 50} 1180 L${x} ${960 - (i % 5) * 20} L${x + 50} 1180Z`} fill={night ? '#141e1a' : '#26342d'} />
        ))}
      </Blur>
    );
  },
  mid: ({ v, pal }) => {
    const view = useView();
    const win = useTarget('house_windows');
    return (
      <>
        <path d={`M${view.x0} 1290 C 200 1262 800 1262 ${view.x1} 1290 L${view.x1} 2200 L${view.x0} 2200Z`} fill={GROUND[pal] ?? GROUND.dusk} />
        <path d="M690 1300 L770 1300 L1000 2100 L740 2100Z" fill="#9c8c6e" opacity={0.85} />
        <RanchHouse lit={v.lit} light={win.light} />
      </>
    );
  },
  fg: ({ v, pal }) => {
    const { e } = useCamera();
    const view = useView(0);
    if (!v.pines) return null;
    const drift = v.pineDrift;
    const night = pal === 'night';
    return (
      <>
        <g transform={`translate(${view.left + 95 - drift * e} 1720)`}>
          <Pine h={1150} w={330} col={night ? '#142219' : '#1f3329'} />
        </g>
        <g transform={`translate(${view.right - 80 + drift * e} 1780)`}>
          <Pine h={1250} w={360} col={night ? '#16271e' : '#223a2e'} />
        </g>
      </>
    );
  },
};

/* ---------------- road_rural ---------------- */
const roadRural: SetDef = {
  id: 'road_rural',
  description: 'Two-lane rural road seen from the shoulder: fields, hedges and telephone poles behind.',
  palettes: ['dusk', 'day', 'night'],
  params: {},
  defaults: {},
  anchors: { shoulder_y: [800, 1448], road_y: [540, 1440], far_lane_y: [540, 1350] },
  elements: ['sun', 'moon'],
  fx: (v) => ({ fireflies: { x: v.left + 60, y: 1050, w: v.right - v.left - 120, h: 300 }, groundY: 1432 }),
  far: ({ pal }) => {
    const v = useView();
    const night = pal === 'night';
    const wireY = (x: number) => 790 + 40 * Math.abs(Math.sin(((x - 120) / 400) * Math.PI));
    const poles = across(v.x0, v.x1, 120, 400);
    return (
      <>
        <Sky pal={pal} />
        <Orb pal={pal} id={night ? 'moon' : 'sun'} x={250} y={1010} r={night ? 60 : 80} />
        <rect x={v.x0} y={1050} width={v.w} height={220} fill={night ? '#2a2c22' : '#7a7442'} />
        {across(v.x0 - 100, v.x1, -150, 100).map((x, i) => (
          <ellipse key={x} cx={x} cy={1060} rx={70 + rnd(i) * 40} ry={40 + rnd(i + 9) * 40} fill={night ? '#1d241c' : '#3d4a35'} />
        ))}
        {poles.map((x) => (
          <g key={x}>
            <rect x={x} y={760} width={14} height={330} fill="#3a2a22" />
            <rect x={x - 40} y={780} width={94} height={10} fill="#3a2a22" />
          </g>
        ))}
        <path
          d={`M${v.x0} 800 ${across(v.x0, v.x1, -80, 50).map((x) => `L ${x} ${wireY(x)}`).join(' ')}`}
          fill="none"
          stroke="#3a2a22"
          strokeWidth={4}
        />
      </>
    );
  },
  mid: ({ pal }) => {
    const v = useView();
    const night = pal === 'night';
    return (
      <>
        <rect x={v.x0} y={1260} width={v.w} height={175} fill={night ? '#2e2c2a' : '#4a4542'} />
        <rect x={v.x0} y={1255} width={v.w} height={10} fill="#6d665e" />
        {across(v.x0, v.x1, -200, 150).map((x) => (
          <rect key={x} x={x} y={1342} width={70} height={10} fill="#e3c25a" />
        ))}
        <rect x={v.x0} y={1432} width={v.w} height={800} fill={night ? '#26301e' : '#56683a'} />
      </>
    );
  },
};

/* ---------------- woods_night ---------------- */
const woodsNight: SetDef = {
  id: 'woods_night',
  description: 'Dense woods at night: blurred trunks, a moon through the trees, ferns framing the bottom corners.',
  palettes: ['night'],
  params: { ferns: 'boolean (default true)', moonX: 'number (default 250)' },
  defaults: { ferns: true, moonX: 250 },
  anchors: { clearing: [550, 1430], ground_y: [540, 1380] },
  elements: ['moon'],
  fx: (v) => ({ fireflies: { x: v.left + 120, y: 1000, w: v.right - v.left - 240, h: 350 }, groundY: 1380 }),
  sky: ({ v }) => (
    <>
      <Sky pal="night" />
      <Orb pal="night" id="moon" x={v.moonX} y={640} r={70} />
    </>
  ),
  far: () => {
    const view = useView();
    return (
      <>
        {across(view.x0, view.x1, -150, 125).map((x) => {
          const i = Math.round((x + 150) / 125);
          return (
            <rect key={x} x={x + rnd(i) * 40} y={-200} width={40 + rnd(i + 3) * 60} height={1700} fill={i % 2 ? '#16231f' : '#1d2e28'} />
          );
        })}
        <path d={`M${view.x0} 1340 C 300 1300 700 1320 ${view.x1} 1335 L${view.x1} 2200 L${view.x0} 2200Z`} fill="#202c25" />
      </>
    );
  },
  mid: () => {
    const v = useView();
    return <path d={`M${v.x0} 1380 C 300 1340 700 1350 ${v.x1} 1370 L${v.x1} 2200 L${v.x0} 2200Z`} fill="#26332a" />;
  },
  fg: ({ v }) => {
    const view = useView(0);
    if (!v.ferns) return null;
    return (
      <>
        <g transform={`translate(${view.left + 114} ${view.bottom + 40})`}>
          <Fern />
        </g>
        <g transform={`translate(${view.right - 114} ${view.bottom + 40})`}>
          <Fern flip />
        </g>
      </>
    );
  },
};

/* ---------------- city_street_night ---------------- */
const Storefront: React.FC<{ x: number; w: number; sign?: string; signOn: number; seed: number }> = ({ x, w, sign, signOn, seed }) => {
  const { url } = useDefs();
  const brick = seed % 2 ? '#5a2e26' : '#4a3a34';
  return (
    <>
      <Cutout>
        <R x={x} y={560} w={w} h={760} fill={brick} />
        {Array.from({ length: 3 }, (_, r) =>
          Array.from({ length: Math.floor(w / 110) }, (_, c) => {
            const lit = rnd(seed * 31 + r * 7 + c) > 0.45;
            return <R key={`${r}-${c}`} x={x + 30 + c * 110} y={620 + r * 150} w={70} h={100} fill={lit ? '#e9c672' : '#1d2b44'} strokeWidth={2} />;
          }),
        )}
        <R x={x + 20} y={1080} w={w - 40} h={240} fill="#1a1416" />
        <R x={x + 40} y={1100} w={w * 0.5} h={180} fill={rnd(seed) > 0.4 ? '#c9a45a' : '#2a3034'} strokeWidth={2} />
        <R x={x + w * 0.62} y={1110} w={w * 0.26} h={210} fill="#3a2a22" strokeWidth={2} />
      </Cutout>
      {sign && (
        <>
          <text x={x + w / 2} y={1050} textAnchor="middle" fontFamily="IM Fell English" fontSize={64} fill="#ff6a5a" opacity={0.25 + 0.75 * signOn} stroke="#ffd0c8" strokeWidth={signOn > 0.5 ? 1.5 : 0}>
            {sign}
          </text>
          <rect x={x + w / 2 - 120} y={990} width={240} height={80} fill="#ff4a3a" opacity={0.25 * signOn} filter={url('glow')} />
        </>
      )}
    </>
  );
};

const cityStreetNight: SetDef = {
  id: 'city_street_night',
  description: 'Night city sidewalk: brick storefronts with lit windows and a neon sign, skyline behind.',
  palettes: ['night'],
  params: { sign: 'string neon sign text (default BAR)' },
  defaults: { sign: 'BAR' },
  anchors: { sidewalk_y: [540, 1440], doorway: [740, 1320], curb_y: [540, 1470] },
  elements: ['neon'],
  fx: (v) => ({ dust: { x: v.left, y: 900, w: v.right - v.left, h: 500 }, groundY: 1460 }),
  sky: () => <Sky pal="night" />,
  far: () => {
    const v = useView();
    return (
      <>
        {across(v.x0, v.x1, -200, 150).map((x, i) => {
          const h = 500 + rnd(i + 4) * 500;
          return (
            <g key={x}>
              <rect x={x} y={1100 - h} width={140} height={h + 300} fill={i % 2 ? '#141c26' : '#1a2430'} />
              {Array.from({ length: 6 }, (_, k) =>
                rnd(i * 11 + k) > 0.6 ? <rect key={k} x={x + 20 + (k % 3) * 40} y={1100 - h + 40 + Math.floor(k / 3) * 90} width={22} height={34} fill="#d8b860" /> : null,
              )}
            </g>
          );
        })}
      </>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const neon = useTarget('neon');
    const fronts = across(view.x0 - 300, view.x1, 40, 520);
    return (
      <>
        {fronts.map((x, i) => (
          <Storefront key={x} x={x} w={500} sign={x === 560 ? v.sign : undefined} signOn={neon.light} seed={i + 3} />
        ))}
        <rect x={view.x0} y={1320} width={view.w} height={140} fill="#6a6660" />
        {across(view.x0, view.x1, -200, 180).map((x) => (
          <line key={x} x1={x} y1={1320} x2={x - 40} y2={1460} stroke="#55514c" strokeWidth={3} />
        ))}
        <rect x={view.x0} y={1460} width={view.w} height={24} fill="#8a857c" />
        <rect x={view.x0} y={1484} width={view.w} height={800} fill="#25272a" />
      </>
    );
  },
};

export const EXTERIORS: SetDef[] = [houseExt, roadRural, woodsNight, cityStreetNight];

/** Darken a palette colour for night variants (exported for tests/gallery). */
export const nightShade = (c: string) => shade(c, -0.45);
