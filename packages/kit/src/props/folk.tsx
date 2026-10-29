// Folklore pack props in the diorama style: fern fronds, grass, a hanging lantern and a tiger rig.
import React from 'react';
import { useDefs } from '../core/Filters';
import { Cutout, Patterned, Rot } from '../core/Ink';
import { seededRandom as rnd, shade } from '../core/math';
import { useShot } from '../core/ShotContext';
import type { PropDef, PropProps } from './types';

/** A fern frond rising from (x, 0): a stem with alternating leaflets, leaning by `angle` degrees. */
export const Fern: React.FC<{ x: number; angle: number; len: number; color: string }> = ({ x, angle, len, color }) => {
  const n = 9;
  const leaflets = Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 1);
    const y = -len * t;
    const w = 70 * (1 - t * 0.7);
    const side = i % 2 ? 1 : -1;
    return `M0 ${y} Q${side * w * 0.6} ${y - 30} ${side * w} ${y - 52} Q${side * w * 0.4} ${y - 14} 0 ${y + 6} Z`;
  });
  return (
    <g transform={`translate(${x} 0) rotate(${angle})`}>
      <Cutout>
        <path d={`M-5 0 Q2 ${-len / 2} 0 ${-len} L5 ${-len} Q8 ${-len / 2} 5 0 Z`} fill={color} />
        {leaflets.map((d, i) => (
          <path key={i} d={d} fill={color} />
        ))}
      </Cutout>
    </g>
  );
};

/** Tall paper grass blades with one cattail; `flip` mirrors it for the right-hand corner. */
export const GrassClump: React.FC<{ flip: boolean; seed: number }> = ({ flip, seed }) => {
  const f = flip ? -1 : 1;
  const cols = ['#3f8a4a', '#1f6f6a', '#2c2a6a', '#b9702f', '#2a8a7a'];
  return (
    <Cutout>
      {Array.from({ length: 11 }, (_, i) => {
        const bx = f * (i * 22 - 40);
        const h = 220 + rnd(i + seed * 13) * 260;
        const lean = f * (20 + rnd(i + seed) * 70);
        return <path key={i} d={`M${bx - 10} 0 Q${bx + lean * 0.4} ${-h * 0.55} ${bx + lean} ${-h} Q${bx + lean * 0.3 + 6} ${-h * 0.5} ${bx + 10} 0 Z`} fill={cols[(i + seed) % cols.length]} />;
      })}
      <path d={`M${f * 30} 0 L${f * 36} ${-430} L${f * 42} ${-430} L${f * 38} 0 Z`} fill="#b9702f" />
      <rect x={f * 39 - 13} y={-520} width={26} height={100} rx={13} fill="#f0a93a" />
    </Cutout>
  );
};

/** Clay-and-brass lantern hanging from its handle (origin = the hand/hook). Glows with `light`. */
const Lantern: React.FC<PropProps> = ({ state }) => {
  const { url } = useDefs();
  const { t } = useShot();
  const on = state.light * (0.9 + 0.1 * Math.sin(t * 9) * Math.sin(t * 5.3));
  return (
    <>
      <circle cx={0} cy={120} r={190} fill="#ffcf6e" opacity={0.42 * on} filter={url('glow')} style={{ mixBlendMode: 'screen' }} />
      <Cutout>
        <path d="M-32 30 Q0 -40 32 30" fill="none" stroke="#3a2418" strokeWidth={7} />
        <path d="M-44 40 L44 40 L34 60 L-34 60 Z" fill="#7a4a2a" />
        <path d="M-40 60 Q-58 120 -36 180 L36 180 Q58 120 40 60 Z" fill="#b8642a" />
        <path d="M-22 80 Q-30 120 -20 160 L20 160 Q30 120 22 80 Z" fill="#ffd27a" opacity={0.5 + 0.5 * on} />
        <path d="M0 98 Q-12 120 0 142 Q12 120 0 98 Z" fill="#fff2b0" opacity={0.6 + 0.4 * on} />
        <path d="M-36 180 L36 180 L26 204 L-26 204 Z" fill="#7a4a2a" />
      </Cutout>
      <rect x={-40} y={60} width={80} height={12} fill={url('zigzag-gold')} opacity={0.9} />
    </>
  );
};

/**
 * A tiger in profile, facing left. Origin = ground between its paws. Head turns with head_turn/nod
 * (parts.head / headDy), legs step with walk_in_place (parts.legL / legR), the tail sways on its own.
 */
const Tiger: React.FC<PropProps> = ({ state }) => {
  const { t } = useShot();
  const tq = Math.floor(t * 12) / 12;
  const body = '#e8862e';
  const back = '#c96a1f';
  const dark = '#2a1a3a';
  const cream = '#f6e3c0';
  /** A tapered paper stripe hanging down from (x, y), curving by `lean`. */
  const stripe = (x: number, y: number, len: number, lean: number, w = 13) =>
    `M${x - w} ${y} Q${x + lean * 0.6 - w * 0.4} ${y + len * 0.55} ${x + lean} ${y + len} Q${x + lean * 0.6 + w * 0.4} ${y + len * 0.5} ${x + w} ${y} Z`;
  const frontLeg = 'M-34 0 C-36 60 -30 118 -28 150 C-46 160 -54 192 -24 192 L30 192 C42 190 38 170 24 158 C26 110 30 60 32 0 Z';
  const hindLeg = 'M-46 0 C-20 60 26 96 8 140 C2 158 -14 172 -32 178 C-54 188 -44 192 -14 192 L30 192 C42 184 30 162 34 140 C52 96 46 40 44 0 Z';
  const leg = (x: number, d: string, a: number, fill: string) => (
    <g transform={`translate(${x} -192)`}>
      <Rot a={a}>
        <Cutout>
          <path d={d} fill={fill} />
          <path d={stripe(-16, 40, 40, 24, 9)} fill={dark} />
          <path d={stripe(-16, 96, 34, 22, 8)} fill={dark} />
        </Cutout>
        <path d="M-30 186 l0 -10 M-14 188 l0 -12 M2 188 l0 -12" stroke={dark} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
      </Rot>
    </g>
  );
  const stride = state.parts.legL;
  const tail = 10 * Math.sin(tq * 2.2) - 4;
  const torso =
    'M-290 -250 C-298 -334 -236 -386 -140 -388 C-20 -394 120 -374 200 -392 C276 -406 326 -350 314 -278 C304 -218 262 -188 200 -190 C110 -200 -60 -172 -170 -180 C-244 -186 -284 -212 -290 -250 Z';
  return (
    <>
      {/* far-side legs first */}
      {leg(-170, frontLeg, -stride * 0.8, back)}
      {leg(220, hindLeg, stride * 0.8, back)}
      {/* tail */}
      <g transform="translate(300 -340)">
        <Rot a={tail}>
          <Cutout>
            <path d="M0 0 C70 -6 120 -60 128 -160 C130 -184 104 -188 100 -164 C92 -84 52 -38 -4 -28 Z" fill={body} />
            <path d="M44 -24 l12 -24 M82 -64 l22 -12 M104 -112 l24 -6" stroke={dark} strokeWidth={12} strokeLinecap="round" />
            <path d="M100 -164 C102 -190 132 -186 128 -160 C126 -148 118 -138 110 -134 Z" fill={dark} />
          </Cutout>
        </Rot>
      </g>
      {/* body: torso, shoulder and haunch plates, belly, stripes */}
      <Cutout>
        <path d={torso} fill={body} />
        <Patterned d="M-220 -196 C-120 -176 60 -186 200 -200 C190 -190 150 -186 120 -188 C40 -184 -120 -170 -200 -182 Z" fill={cream} pattern="dots-ink" opacity={0.3} />
        <ellipse cx={210} cy={-280} rx={96} ry={104} fill={shade(body, -0.06)} />
        <ellipse cx={-200} cy={-262} rx={84} ry={96} fill={shade(body, 0.05)} />
        {[
          [-120, -386, 120, 30],
          [-60, -390, 140, 34],
          [0, -390, 150, 28],
          [60, -384, 140, 34],
          [120, -386, 110, 26],
          [170, -392, 90, 30],
          [230, -390, 120, 52],
          [270, -370, 100, 40],
          [-190, -350, 90, 30],
          [-230, -320, 70, 26],
        ].map(([x, y, len, lean], i) => (
          <path key={i} d={stripe(x, y, len, lean)} fill={dark} />
        ))}
      </Cutout>
      {/* near-side legs */}
      {leg(-220, frontLeg, stride, body)}
      {leg(170, hindLeg, -stride, body)}
      {/* head */}
      <g transform={`translate(0 ${state.parts.headDy})`}>
        <Rot a={state.parts.head} cx={-250} cy={-300}>
          <Cutout>
            <circle cx={-348} cy={-444} r={28} fill={body} />
            <circle cx={-258} cy={-448} r={28} fill={body} />
            <circle cx={-348} cy={-442} r={14} fill={dark} />
            <circle cx={-258} cy={-446} r={14} fill={dark} />
            <path
              d="M-232 -430 C-262 -462 -332 -462 -362 -430 C-392 -400 -400 -362 -394 -334 L-412 -312 C-416 -290 -398 -276 -382 -278 C-370 -250 -340 -236 -300 -236 C-270 -236 -252 -250 -238 -262 L-214 -270 L-228 -290 L-206 -306 L-224 -322 C-210 -362 -212 -402 -232 -430 Z"
              fill={body}
            />
            <ellipse cx={-302} cy={-276} rx={56} ry={28} fill={cream} />
            <ellipse cx={-384} cy={-302} rx={36} ry={26} fill={cream} />
            <path d="M-418 -322 L-396 -330 L-398 -310 Z" fill={dark} />
            <path d="M-396 -292 Q-384 -280 -366 -286" fill="none" stroke={dark} strokeWidth={4} strokeLinecap="round" />
            <path d="M-364 -378 Q-346 -394 -326 -378 Q-346 -366 -364 -378 Z" fill="#9ccf4a" />
            <circle cx={-345} cy={-378} r={5} fill={dark} />
            <path d={stripe(-300, -458, 44, -6, 9)} fill={dark} />
            <path d={stripe(-274, -456, 36, 6, 8)} fill={dark} />
            <path d={stripe(-326, -456, 36, -8, 8)} fill={dark} />
            <path d="M-214 -360 L-256 -350 L-216 -340 Z M-216 -320 L-254 -316 L-220 -304 Z" fill={dark} />
          </Cutout>
        </Rot>
      </g>
    </>
  );
};

export const FOLK_PROPS: PropDef[] = [
  {
    id: 'lantern',
    description: 'Clay-and-brass hand lantern hanging from its handle; glows and flickers gently (folklore pack).',
    params: {},
    bbox: [-60, -40, 120, 260],
    pivots: { hang: [0, 0] },
    origin: 'top of the handle (hangs from a hand)',
    Component: (p) => <Lantern {...p} />,
  },
  {
    id: 'tiger',
    description: 'Bengal tiger in profile facing left, folk-patterned paper (folklore pack). head_turn/nod move the head, walk_in_place steps the legs, the tail sways by itself. Flip to face right.',
    params: {},
    bbox: [-400, -480, 800, 490],
    pivots: { base_left: [-300, 0], base_right: [300, 0] },
    origin: 'ground under the middle of the body',
    Component: (p) => <Tiger {...p} />,
  },
];
