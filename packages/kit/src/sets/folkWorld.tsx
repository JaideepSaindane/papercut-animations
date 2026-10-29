// Shared building blocks for diorama-style sets (folklore pack + world library): a time-of-day palette
// and the pieces every outdoor set reuses (sky, sun/moon, clouds, hills, mountains, trees, huts, temple
// spires, lamps). Everything is code-drawn paper with the Gond/Madhubani skin.
import React from 'react';
import { useDefs } from '../core/Filters';
import { Cutout, Gond, Patterned, scallopPath } from '../core/Ink';
import { useView } from '../core/format';
import { seededRandom as rnd } from '../core/math';
import { BG_H, BG_Y } from './types';

export const JEWEL = {
  indigo: '#2c2a6a',
  night: '#1f1b4d',
  plum: '#5b3a7a',
  violet: '#4a3670',
  teal: '#1f6f6a',
  tealDark: '#174f52',
  peacock: '#2a8a7a',
  leaf: '#3f8a4a',
  marigold: '#f0a93a',
  gold: '#f0c35a',
  vermilion: '#d4532b',
  ochre: '#d58a3f',
  ochreDark: '#b9702f',
  bark: '#4a2f5e',
  cream: '#f6ead0',
};

export type FolkTime = 'day' | 'dusk' | 'night';
export const FOLK_TIMES: FolkTime[] = ['day', 'dusk', 'night'];

type TimePalette = {
  sky: string[];
  skyOffsets: number[];
  hillFar: string;
  hillNear: string;
  mountainFar: string;
  treeFar: string[];
  canopy: string[];
  bush: string[];
  ground: string;
  groundDark: string;
  bark: string;
  stone: string;
  stoneDark: string;
  water: string;
  waterLight: string;
  wall: string;
  wallDark: string;
  roof: string;
  snow: string;
  snowShade: string;
  rock: string[];
  field: string;
  /** dots and line work on patterned paper */
  dot: string;
  /** 0..1: how much windows, lamps and diyas glow */
  lit: number;
};

export const FOLK_PALETTES: Record<FolkTime, TimePalette> = {
  day: {
    sky: ['#4fb0d0', '#8fd0d8', '#e4ecc8', '#f6e3a8'],
    skyOffsets: [0, 0.42, 0.78, 1],
    hillFar: '#8bb86a',
    hillNear: '#5e9e5a',
    mountainFar: '#8fa8d0',
    treeFar: ['#2f7a5a', '#3a8a64', '#277060'],
    canopy: ['#2a8a7a', '#3f8a4a', '#1f6f6a', '#5aa05a'],
    bush: ['#3f8a4a', '#2a8a7a', '#d4532b', '#1f6f6a'],
    ground: '#e3b062',
    groundDark: '#cf9548',
    bark: '#6a4a3a',
    stone: '#dcc6a2',
    stoneDark: '#bb9c78',
    water: '#3aa0b8',
    waterLight: '#9fdde2',
    wall: '#ecc48c',
    wallDark: '#cf9e66',
    roof: '#b9702f',
    snow: '#f8f6f0',
    snowShade: '#c6d4ea',
    rock: ['#8a7aa8', '#6e6496', '#a296bc'],
    field: '#f0c33a',
    dot: '#f6ead0',
    lit: 0,
  },
  dusk: {
    sky: ['#1f1b4d', '#3c2e6e', '#8a4a78', '#e07a4a', '#f2b35a', '#f6cf7a'],
    skyOffsets: [0, 0.32, 0.52, 0.64, 0.74, 1],
    hillFar: '#5b3a7a',
    hillNear: '#4a3670',
    mountainFar: '#7a5a8e',
    treeFar: ['#174f52', '#1e4b55', '#233f5a'],
    canopy: ['#2c2a6a', '#1f6f6a', '#2a8a7a', '#174f52'],
    bush: ['#3f8a4a', '#2a8a7a', '#d4532b', '#1f6f6a'],
    ground: '#d58a3f',
    groundDark: '#b9702f',
    bark: '#4a2f5e',
    stone: '#c78e72',
    stoneDark: '#9e6a5c',
    water: '#3d3a7e',
    waterLight: '#f0a96a',
    wall: '#dc9c6a',
    wallDark: '#b47650',
    roof: '#7a3440',
    snow: '#f8dccc',
    snowShade: '#b89ac4',
    rock: ['#6a4a7e', '#5a3a6e', '#8a5a7e'],
    field: '#e8a23a',
    dot: '#f6ead0',
    lit: 0.7,
  },
  night: {
    sky: ['#0b0c2a', '#16174a', '#252466', '#3a3070'],
    skyOffsets: [0, 0.4, 0.75, 1],
    hillFar: '#2c2b62',
    hillNear: '#232252',
    mountainFar: '#2e3064',
    treeFar: ['#132a3e', '#16324a', '#1a2a48'],
    canopy: ['#1a2d5a', '#173f52', '#1f4a5a', '#24305e'],
    bush: ['#1f4a4a', '#1a3a52', '#5a2a4a', '#173f52'],
    ground: '#6e5274',
    groundDark: '#5a4262',
    bark: '#2a1f40',
    stone: '#5c5c84',
    stoneDark: '#48486e',
    water: '#1a1f4e',
    waterLight: '#f0c35a',
    wall: '#6c5c80',
    wallDark: '#56486c',
    roof: '#3a2a4e',
    snow: '#ccd4f2',
    snowShade: '#8a94c8',
    rock: ['#3a3a6e', '#2e2e5e', '#4a4a7e'],
    field: '#8a7a4a',
    dot: '#f0c35a',
    lit: 1,
  },
};

export const folkPal = (v: Record<string, any>) =>
  FOLK_PALETTES[(v.time as FolkTime) ?? 'dusk'] ?? FOLK_PALETTES.dusk;

/** x positions every `step` across [x0, x1], deterministic. */
export const across = (x0: number, x1: number, step: number) => {
  const out: number[] = [];
  for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) out.push(x);
  return out;
};

/** A smooth hill band across the view: top edge undulates around `y`, filled down to the bottom. */
export const hillPath = (x0: number, x1: number, y: number, amp: number, period: number, seed: number) => {
  const pts = across(x0 - period, x1 + period, period / 2).map(
    (x, i) => [x, y + amp * Math.sin(i * 1.3 + seed) + amp * 0.4 * rnd(i + seed)] as const,
  );
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, yy] = pts[i];
    d += ` C${px + period / 4} ${py} ${x - period / 4} ${yy} ${x} ${yy}`;
  }
  return `${d} L${x1 + period} ${BG_Y + BG_H} L${x0 - period} ${BG_Y + BG_H} Z`;
};

/** A patterned hill band spanning the padded view. */
export const Hills: React.FC<{
  y: number;
  amp: number;
  period: number;
  seed: number;
  fill: string;
  pattern?: string;
  opacity?: number;
}> = ({ y, amp, period, seed, fill, pattern = 'lines-cream', opacity = 0.14 }) => {
  const v = useView();
  return (
    <Cutout>
      <Patterned
        d={hillPath(v.x0, v.x1, y, amp, period, seed)}
        fill={fill}
        pattern={pattern}
        opacity={opacity}
      />
    </Cutout>
  );
};

export const Star: React.FC<{ x: number; y: number; s: number; fill?: string }> = ({
  x,
  y,
  s,
  fill = JEWEL.gold,
}) => (
  <path
    d={`M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z`}
    fill={fill}
  />
);

/** Gold paper crescent (opens to the right) with a dotted Gond edge and a soft halo. */
export const Crescent: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => {
  const { url } = useDefs();
  const d = `M${cx} ${cy - r} A${r} ${r} 0 1 0 ${cx} ${cy + r} A${r * 1.25} ${r * 1.25} 0 0 1 ${cx} ${cy - r} Z`;
  return (
    <>
      <circle cx={cx - r * 0.3} cy={cy} r={r * 2.2} fill="#ffd98a" opacity={0.22} filter={url('glow')} />
      <Cutout>
        <Gond
          d={d}
          fill={JEWEL.gold}
          dot={JEWEL.vermilion}
          cx={cx - r * 0.55}
          cy={cy}
          inset={0.8}
          gap={18}
          size={6}
        />
      </Cutout>
    </>
  );
};

const circlePath = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

/** Full moon: pale gold disc, dotted rings, halo. */
export const FullMoon: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => {
  const { url } = useDefs();
  return (
    <>
      <circle cx={cx} cy={cy} r={r * 2.6} fill="#e8e4ff" opacity={0.16} filter={url('glow')} />
      <Cutout>
        <Gond
          d={circlePath(cx, cy, r)}
          fill="#f4e6b8"
          dot="#c9a85a"
          cx={cx}
          cy={cy}
          inset={0.82}
          gap={16}
          size={5}
        />
        <Gond
          d={circlePath(cx + r * 0.2, cy - r * 0.1, r * 0.34)}
          fill="#e8d49a"
          dot="#c9a85a"
          cx={cx + r * 0.2}
          cy={cy - r * 0.1}
          inset={0.7}
          gap={12}
          size={4}
        />
      </Cutout>
    </>
  );
};

/** Gond sun: gold disc in a ring of vermilion rays, a dotted inner ring. */
export const Sun: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => {
  const { url } = useDefs();
  const n = 16;
  const rays = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const a0 = a - Math.PI / n / 1.4;
    const a1 = a + Math.PI / n / 1.4;
    const R = r * (i % 2 ? 1.42 : 1.62);
    return `M${cx + r * 1.05 * Math.cos(a0)} ${cy + r * 1.05 * Math.sin(a0)} L${cx + R * Math.cos(a)} ${cy + R * Math.sin(a)} L${cx + r * 1.05 * Math.cos(a1)} ${cy + r * 1.05 * Math.sin(a1)} Z`;
  });
  return (
    <>
      <circle cx={cx} cy={cy} r={r * 3} fill="#fff1b0" opacity={0.3} filter={url('glow')} />
      <Cutout>
        {rays.map((d, i) => (
          <path key={i} d={d} fill={i % 2 ? JEWEL.marigold : JEWEL.vermilion} />
        ))}
        <Gond
          d={circlePath(cx, cy, r)}
          fill={JEWEL.gold}
          dot={JEWEL.vermilion}
          cx={cx}
          cy={cy}
          inset={0.78}
          gap={18}
          size={6}
        />
      </Cutout>
    </>
  );
};

/** Flat-bottomed paper cloud: overlapping bumps on a base line at (x, y), `w` wide. */
export const Cloud: React.FC<{ x: number; y: number; w: number; fill: string; seed?: number }> = ({
  x,
  y,
  w,
  fill,
  seed = 0,
}) => {
  const n = 4;
  return (
    <Cutout>
      {Array.from({ length: n }, (_, i) => {
        const cx = x - w / 2 + (w * (i + 0.5)) / n;
        const r = (w / n) * (0.6 + rnd(i + seed * 7) * 0.45) * (i === 1 || i === 2 ? 1.3 : 1);
        return <circle key={i} cx={cx} cy={y - r * 0.55} r={r} fill={fill} />;
      })}
      <rect x={x - w / 2} y={y - w * 0.12} width={w} height={w * 0.12} rx={w * 0.06} fill={fill} />
    </Cutout>
  );
};

/** Sky for any folk set: gradient, then sun + clouds (day), crescent + a few stars (dusk), full moon + stars (night). */
export const FolkSky: React.FC<{ time: FolkTime; body?: [number, number]; clouds?: boolean; hidden?: boolean }> = ({
  time,
  body = [210, 730],
  clouds = true,
  hidden = false,
}) => {
  const view = useView();
  const { id, url } = useDefs();
  const pal = FOLK_PALETTES[time];
  const gid = `folkSky-${time}`;
  const stars = time === 'night' ? 90 : time === 'dusk' ? 120 : 0;
  return (
    <>
      <defs>
        <linearGradient id={id(gid)} x1="0" y1="0" x2="0" y2="1">
          {pal.sky.map((c, i) => (
            <stop key={i} offset={pal.skyOffsets[i]} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <rect x={view.x0} y={BG_Y} width={view.w} height={BG_H} fill={url(gid)} />
      {stars > 0 &&
        across(view.x0, view.x1, stars).map((x, i) => (
          <Star
            key={x}
            x={x + rnd(i) * 60}
            y={140 + rnd(i + 30) * (time === 'night' ? 820 : 560)}
            s={5 + rnd(i + 9) * (time === 'night' ? 11 : 8)}
            fill={time === 'night' && i % 3 === 0 ? JEWEL.cream : JEWEL.gold}
          />
        ))}
      {!hidden && time === 'day' && <Sun cx={body[0]} cy={body[1] - 40} r={70} />}
      {time === 'day' &&
        clouds &&
        across(view.x0, view.x1, 520).map((x, i) => (
          <Cloud
            key={x}
            x={x + rnd(i + 3) * 200}
            y={560 + rnd(i + 11) * 260}
            w={200 + rnd(i) * 140}
            fill={i % 2 ? '#fbf3e0' : '#f6ead0'}
            seed={i}
          />
        ))}
      {!hidden && time === 'dusk' && <Crescent cx={body[0]} cy={body[1]} r={100} />}
      {!hidden && time === 'night' && <FullMoon cx={body[0]} cy={body[1]} r={88} />}
    </>
  );
};

/** Round folk tree: trunk and a scalloped canopy with a Gond dotted edge. Base at (x, base). */
export const RoundTree: React.FC<{
  x: number;
  base: number;
  h: number;
  r: number;
  fill: string;
  bark: string;
  dot?: string;
  pattern?: string;
  seed?: number;
}> = ({ x, base, h, r, fill, bark, dot = JEWEL.cream, pattern = 'lines-cream', seed = 0 }) => (
  <Cutout>
    <path
      d={`M${x - r * 0.14} ${base} Q${x - r * 0.06} ${base - h * 0.5} ${x - r * 0.04} ${base - h + r * 0.4} L${x + r * 0.04} ${base - h + r * 0.4} Q${x + r * 0.06} ${base - h * 0.5} ${x + r * 0.14} ${base} Z`}
      fill={bark}
    />
    <Gond
      d={scallopPath(x, base - h, r, r * 0.86, 9, 0.16, seed)}
      fill={fill}
      dot={dot}
      cx={x}
      cy={base - h}
      pattern={pattern}
      patternOpacity={0.22}
      gap={15}
      size={4.5}
    />
  </Cutout>
);

/** Coconut/toddy palm. Base at (x, base). */
export const Palm: React.FC<{
  x: number;
  base: number;
  h: number;
  fill: string;
  bark: string;
  lean?: number;
}> = ({ x, base, h, fill, bark, lean = 30 }) => {
  const tx = x + lean;
  const top = base - h;
  return (
    <Cutout>
      <path
        d={`M${x - 14} ${base} Q${x + lean * 0.2} ${base - h * 0.5} ${tx - 7} ${top} L${tx + 7} ${top} Q${x + lean * 0.2 + 20} ${base - h * 0.5} ${x + 14} ${base} Z`}
        fill={bark}
      />
      {[-150, -110, -70, -30, 15, 60, 110, 150].map((a, i) => {
        const len = 150 + (i % 3) * 25;
        const rad = ((a - 90) * Math.PI) / 180;
        const ex = tx + Math.cos(rad) * len;
        const ey = top + Math.sin(rad) * len * 0.6 + 70;
        const mx = tx + Math.cos(rad) * len * 0.5;
        const my = top + Math.sin(rad) * len * 0.5 - 30;
        return (
          <path
            key={a}
            d={`M${tx} ${top} Q${mx} ${my - 18} ${ex} ${ey} Q${mx} ${my + 14} ${tx} ${top + 10} Z`}
            fill={fill}
          />
        );
      })}
      <circle cx={tx - 10} cy={top + 14} r={11} fill={JEWEL.ochreDark} />
      <circle cx={tx + 10} cy={top + 16} r={11} fill={JEWEL.ochreDark} />
    </Cutout>
  );
};

/** Layered pine; `snow` lays white paper on each tier. Base at (x, base). */
export const FolkPine: React.FC<{
  x: number;
  base: number;
  h: number;
  fill: string;
  bark: string;
  snow?: string;
}> = ({ x, base, h, fill, bark, snow }) => {
  const w = h * 0.42;
  return (
    <Cutout>
      <rect x={x - h * 0.03} y={base - h * 0.16} width={h * 0.06} height={h * 0.16} fill={bark} />
      {[0, 1, 2, 3].map((i) => {
        const tb = base - h * 0.12 - i * h * 0.21;
        const tw = w * (1 - i * 0.2);
        const tt = tb - h * 0.34;
        return (
          <React.Fragment key={i}>
            <path
              d={`M${x - tw} ${tb} Q${x - tw * 0.4} ${tb - h * 0.12} ${x} ${tt} Q${x + tw * 0.4} ${tb - h * 0.12} ${x + tw} ${tb} Q${x} ${tb - h * 0.05} ${x - tw} ${tb} Z`}
              fill={fill}
            />
            {snow && (
              <path
                d={`M${x - tw * 0.55} ${tb - h * 0.12} Q${x - tw * 0.25} ${tb - h * 0.2} ${x} ${tt} Q${x + tw * 0.25} ${tb - h * 0.2} ${x + tw * 0.55} ${tb - h * 0.12} Q${x + tw * 0.2} ${tb - h * 0.1} ${x} ${tb - h * 0.15} Q${x - tw * 0.2} ${tb - h * 0.1} ${x - tw * 0.55} ${tb - h * 0.12} Z`}
                fill={snow}
              />
            )}
          </React.Fragment>
        );
      })}
    </Cutout>
  );
};

/** A far treeline of round trees and palms along `base`, across the padded view. */
export const Treeline: React.FC<{
  base: number;
  colors: string[];
  step?: number;
  seed?: number;
  palms?: boolean;
}> = ({ base, colors, step = 120, seed = 0, palms = true }) => {
  const v = useView();
  return (
    <Cutout>
      {across(v.x0, v.x1, step).map((x0, i) => {
        const x = x0 + rnd(i + 5 + seed) * 50;
        const h = 150 + rnd(i * 7 + seed) * 130;
        const c = colors[i % colors.length];
        if (palms && i % 4 === 1) {
          const top = base - h - 40;
          return (
            <g key={x0}>
              <path
                d={`M${x - 6} ${base} Q${x + 10} ${base - h / 2} ${x + 4} ${top} L${x + 14} ${top} Q${x + 22} ${base - h / 2} ${x + 8} ${base} Z`}
                fill={c}
              />
              {[-70, -35, 0, 35, 70].map((a) => (
                <path
                  key={a}
                  d={`M${x + 9} ${top} q${a * 0.9} ${-30 + Math.abs(a) * 0.5} ${a * 1.6} ${20 + Math.abs(a) * 0.6} q${-a * 0.5} ${-18} ${-a * 1.6} ${-20 - Math.abs(a) * 0.6} Z`}
                  fill={c}
                />
              ))}
            </g>
          );
        }
        const r = 55 + rnd(i * 3 + seed) * 40;
        return (
          <g key={x0}>
            <rect x={x - 8} y={base - h * 0.5} width={16} height={h * 0.5} fill={c} />
            <path d={scallopPath(x, base - h * 0.55, r, r * 0.85, 8, 0.14, i)} fill={c} />
            <path d={scallopPath(x - r * 0.6, base - h * 0.42, r * 0.7, r * 0.6, 7, 0.14, i + 1)} fill={c} />
            <path d={scallopPath(x + r * 0.6, base - h * 0.4, r * 0.65, r * 0.55, 7, 0.14, i + 2)} fill={c} />
          </g>
        );
      })}
      <rect x={v.x0} y={base - 10} width={v.w} height={90} fill={colors[0]} />
    </Cutout>
  );
};

/**
 * Mountain range: peaks [x, y] joined by valleys `depth` below the lower neighbour, filled down to
 * `base`; `snow` caps each peak down `cap` px with a jagged edge.
 */
export const Mountains: React.FC<{
  peaks: [number, number][];
  base: number;
  fill: string;
  snow?: string;
  shade?: string;
  cap?: number;
  depth?: number;
  pattern?: string;
}> = ({ peaks, base, fill, snow, shade, cap = 160, depth = 180, pattern = 'lines-cream' }) => {
  const v = useView();
  const valleys = peaks
    .slice(0, -1)
    .map(([x, y], i) => [(x + peaks[i + 1][0]) / 2, Math.max(y, peaks[i + 1][1]) + depth] as const);
  let d = `M${v.x0} ${base} L${v.x0} ${peaks[0][1] + depth * 1.4}`;
  peaks.forEach(([x, y], i) => {
    d += ` L${x} ${y}`;
    if (valleys[i]) d += ` L${valleys[i][0]} ${valleys[i][1]}`;
  });
  d += ` L${v.x1} ${peaks[peaks.length - 1][1] + depth * 1.4} L${v.x1} ${base} Z`;
  return (
    <Cutout>
      <Patterned d={d} fill={fill} pattern={pattern} opacity={0.12} />
      {shade &&
        peaks.map(([x, y], i) => {
          const r = valleys[i] ?? [x + 300, y + depth * 1.4];
          return (
            <path
              key={i}
              d={`M${x} ${y} L${r[0]} ${r[1]} L${x + (r[0] - x) * 0.25} ${r[1]} Z`}
              fill={shade}
              opacity={0.55}
            />
          );
        })}
      {snow &&
        peaks.map(([x, y], i) => {
          const l = valleys[i - 1] ?? [x - 300, y + depth * 1.4];
          const r = valleys[i] ?? [x + 300, y + depth * 1.4];
          const t = Math.min(0.55, cap / Math.max(1, r[1] - y));
          const lx = x + (l[0] - x) * t;
          const rx = x + (r[0] - x) * t;
          const yb = y + cap;
          const teeth = 5;
          let s = `M${x} ${y} L${rx} ${yb}`;
          for (let k = teeth; k >= 1; k--) {
            const px = lx + ((rx - lx) * (k - 0.5)) / teeth;
            const qx = lx + ((rx - lx) * (k - 1)) / teeth;
            s += ` L${px} ${yb - 34 - (k % 2) * 22} L${qx} ${yb + (k % 2 ? 10 : 0)}`;
          }
          return <path key={`s${i}`} d={`${s} Z`} fill={snow} />;
        })}
    </Cutout>
  );
};

/** Mud hut with a thatched roof, a Madhubani band and a door that glows with `lit`. Base centre (x, base). */
export const Hut: React.FC<{
  x: number;
  base: number;
  w: number;
  h: number;
  wall: string;
  wallDark: string;
  roof: string;
  lit: number;
  flip?: boolean;
}> = ({ x, base, w, h, wall, wallDark, roof, lit, flip = false }) => {
  const { url } = useDefs();
  const top = base - h;
  const dx = flip ? -w * 0.18 : w * 0.18;
  return (
    <>
      <Cutout>
        <rect x={x - w / 2} y={top} width={w} height={h} fill={wall} />
        <rect x={x - w / 2} y={base - 36} width={w} height={36} fill={wallDark} />
        <path
          d={`M${x - w / 2 - 40} ${top + 24} Q${x - w * 0.2} ${top - h * 0.75} ${x} ${top - h * 0.82} Q${x + w * 0.2} ${top - h * 0.75} ${x + w / 2 + 40} ${top + 24} Q${x} ${top + 6} ${x - w / 2 - 40} ${top + 24} Z`}
          fill={roof}
        />
        <path
          d={`M${x + dx - w * 0.12} ${base} L${x + dx - w * 0.12} ${base - h * 0.62} Q${x + dx} ${base - h * 0.8} ${x + dx + w * 0.12} ${base - h * 0.62} L${x + dx + w * 0.12} ${base} Z`}
          fill="#3a2234"
        />
        <path
          d={`M${x + dx - w * 0.09} ${base} L${x + dx - w * 0.09} ${base - h * 0.6} Q${x + dx} ${base - h * 0.74} ${x + dx + w * 0.09} ${base - h * 0.6} L${x + dx + w * 0.09} ${base} Z`}
          fill="#ffcf6e"
          opacity={lit * 0.95}
        />
      </Cutout>
      <path
        d={`M${x - w / 2 - 40} ${top + 24} Q${x - w * 0.2} ${top - h * 0.75} ${x} ${top - h * 0.82} Q${x + w * 0.2} ${top - h * 0.75} ${x + w / 2 + 40} ${top + 24} Q${x} ${top + 6} ${x - w / 2 - 40} ${top + 24} Z`}
        fill={url('lines-ink')}
        opacity={0.25}
      />
      <rect x={x - w / 2} y={top + 18} width={w} height={22} fill={url('zigzag-cream')} opacity={0.75} />
      <rect x={x - w / 2} y={base - 34} width={w} height={30} fill={url('dots-cream')} opacity={0.5} />
      {lit > 0 && (
        <circle
          cx={x + dx}
          cy={base - h * 0.35}
          r={w * 0.5}
          fill="#ffcf6e"
          opacity={0.28 * lit}
          filter={url('glow')}
        />
      )}
    </>
  );
};

/** Nagara temple spire (shikhara) with banded courses, an amalaka disc, a kalash and a pennant. */
export const Shikhara: React.FC<{
  x: number;
  base: number;
  w: number;
  h: number;
  fill: string;
  dark: string;
  flag?: string;
}> = ({ x, base, w, h, fill, dark, flag = JEWEL.vermilion }) => {
  const { url } = useDefs();
  const top = base - h;
  const d = `M${x - w / 2} ${base} L${x - w / 2} ${base - h * 0.28} C${x - w / 2} ${base - h * 0.62} ${x - w * 0.24} ${top + h * 0.12} ${x - w * 0.1} ${top + h * 0.06} L${x + w * 0.1} ${top + h * 0.06} C${x + w * 0.24} ${top + h * 0.12} ${x + w / 2} ${base - h * 0.62} ${x + w / 2} ${base - h * 0.28} L${x + w / 2} ${base} Z`;
  return (
    <>
      <Cutout>
        <path d={d} fill={fill} />
        <path
          d={`M${x - w * 0.08} ${base} L${x - w * 0.08} ${base - h * 0.3} C${x - w * 0.08} ${base - h * 0.6} ${x - w * 0.04} ${top + h * 0.15} ${x} ${top + h * 0.08} C${x + w * 0.04} ${top + h * 0.15} ${x + w * 0.08} ${base - h * 0.6} ${x + w * 0.08} ${base - h * 0.3} L${x + w * 0.08} ${base} Z`}
          fill={dark}
        />
        <ellipse cx={x} cy={top + h * 0.05} rx={w * 0.2} ry={h * 0.035} fill={dark} />
        <path
          d={`M${x - w * 0.06} ${top + h * 0.03} Q${x} ${top - h * 0.08} ${x + w * 0.06} ${top + h * 0.03} Z`}
          fill={JEWEL.gold}
        />
        <rect x={x - 2} y={top - h * 0.2} width={4} height={h * 0.14} fill={dark} />
        <path
          d={`M${x + 2} ${top - h * 0.2} L${x + w * 0.3} ${top - h * 0.16} L${x + 2} ${top - h * 0.11} Z`}
          fill={flag}
        />
      </Cutout>
      <path d={d} fill={url('lines-ink')} opacity={0.18} />
    </>
  );
};

/** Clay oil lamp (diya) with a flame; `lit` 0..1 drives flame and glow. Base centre (x, y). */
export const Diya: React.FC<{ x: number; y: number; s?: number; lit: number; flicker?: number }> = ({
  x,
  y,
  s = 1,
  lit,
  flicker = 1,
}) => {
  const { url } = useDefs();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {lit > 0 && (
        <circle cx={0} cy={-34} r={46} fill="#ffcf6e" opacity={0.45 * lit * flicker} filter={url('glow')} />
      )}
      <path d="M-26 -12 Q0 6 26 -12 L20 -2 Q0 8 -20 -2 Z" fill="#b8642a" />
      <path d="M-26 -12 Q0 -2 26 -12 Q0 -18 -26 -12 Z" fill="#7a3a1a" />
      {lit > 0 && (
        <path
          d="M0 -44 Q-9 -26 0 -14 Q9 -26 0 -44 Z"
          fill="#ffd27a"
          opacity={lit}
          transform={`scale(1 ${0.85 + 0.15 * flicker})`}
        />
      )}
    </g>
  );
};
