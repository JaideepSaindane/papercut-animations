import React from 'react';
import { useDefs } from '../core/Filters';
import { Cutout, P, R, Rot } from '../core/Ink';
import { seededRandom as rnd, shade } from '../core/math';
import { basePivots, type PropDef } from './types';

/** Pine tree from the prototype: trunk + four stacked triangles. Origin: base of trunk. */
export const Pine: React.FC<{ h: number; w: number; col: string }> = ({ h, w, col }) => (
  <Cutout>
    <R x={-14} y={-h * 0.18} w={28} h={h * 0.18} fill="#4a2f22" />
    {[0, 1, 2, 3].map((i) => {
      const y0 = -h * 0.15 - i * h * 0.21;
      const ww = w * (1 - i * 0.2);
      return <P key={i} d={`M${-ww / 2} ${y0} L0 ${y0 - h * 0.36} L${ww / 2} ${y0} Z`} fill={col} />;
    })}
  </Cutout>
);

/** Fern cluster from the prototype (fronds leaning away from `side`). Origin: base centre. */
export const Fern: React.FC<{ flip?: boolean; seed?: number; scale?: number }> = ({ flip = false, seed = 0, scale = 1 }) => {
  const f = flip ? -1 : 1;
  return (
    <Cutout>
      {Array.from({ length: 9 }, (_, i) => {
        const bx = f * (i * 26 - 104);
        const h = (260 + rnd(i + f * 7 + seed) * 220) * scale;
        const lean = f * (40 + rnd(i + 3 + seed) * 90);
        return (
          <P
            key={i}
            d={`M${bx - 14} 0 Q ${bx + lean * 0.3} ${-h * 0.6} ${bx + lean} ${-h} Q ${bx + lean * 0.2 + 8} ${-h * 0.5} ${bx + 14} 0 Z`}
            fill={i % 2 ? '#1f3326' : '#2a4632'}
          />
        );
      })}
    </Cutout>
  );
};

export const GrassTuft: React.FC<{ color?: string }> = ({ color = '#3d5a34' }) => (
  <Cutout>
    <P d="M-60 0 L-50 -70 L-34 0 L-22 -110 L-6 0 L8 -90 L20 0 L34 -120 L44 0 L56 -64 L66 0 Z" fill={color} />
  </Cutout>
);

export const Bush: React.FC<{ color?: string }> = ({ color = '#3d4a35' }) => (
  <Cutout>
    <P
      d="M-150 0 C -170 -60 -130 -110 -90 -100 C -80 -160 -10 -170 10 -130 C 40 -170 120 -150 110 -90 C 160 -90 170 -30 150 0 Z"
      fill={color}
    />
    <path d="M-60 -60 Q -40 -80 -20 -60 M 40 -80 Q 60 -100 80 -80" fill="none" stroke={shade(color, -0.3)} strokeWidth={2} />
  </Cutout>
);

export const OUTDOOR: PropDef[] = [
  {
    id: 'mailbox',
    description: 'Rural mailbox on a post with a red flag.',
    params: {},
    bbox: [-70, -400, 140, 404],
    pivots: basePivots(12),
    origin: 'base of the post',
    Component: () => (
      <g transform="translate(-214 -1760)">
        <Cutout>
          <R x={203} y={1460} w={22} h={300} fill="#5a3a28" />
          <P d="M150 1470 L150 1415 C150 1390 280 1390 280 1415 L280 1470 Z" fill="#8b9094" />
          <R x={272} y={1370} w={10} h={55} fill="#b23a2a" />
        </Cutout>
      </g>
    ),
  },
  {
    id: 'pine_tree',
    description: 'Stylised pine tree (stacked triangles).',
    params: { h: 'number height (default 1150)', w: 'number width (default 330)', color: 'hex (default #1f3329)' },
    bbox: [-170, -1160, 340, 1164],
    pivots: basePivots(14),
    origin: 'base of the trunk',
    Component: ({ params }) => <Pine h={params.h ?? 1150} w={params.w ?? 330} col={params.color ?? '#1f3329'} />,
  },
  {
    id: 'bush',
    description: 'Rounded bush.',
    params: { color: 'hex' },
    bbox: [-160, -170, 320, 174],
    pivots: basePivots(150),
    origin: 'base centre',
    Component: ({ params }) => <Bush color={params.color} />,
  },
  {
    id: 'grass_tuft',
    description: 'Spiky grass tuft for foregrounds.',
    params: { color: 'hex' },
    bbox: [-70, -125, 140, 129],
    pivots: basePivots(60),
    origin: 'base centre',
    Component: ({ params }) => <GrassTuft color={params.color} />,
  },
  {
    id: 'fern',
    description: 'Cluster of fern fronds for foreground framing (flip leans them the other way).',
    params: { seed: 'number', size: 'number scale (default 1)' },
    bbox: [-150, -500, 300, 504],
    pivots: basePivots(110),
    origin: 'base centre',
    Component: ({ params }) => <Fern seed={params.seed ?? 0} scale={params.size ?? 1} />,
  },
  {
    id: 'moon',
    description: 'Full moon with soft glow.',
    params: { r: 'number radius (default 70)' },
    bbox: [-200, -200, 400, 400],
    origin: 'centre',
    Component: ({ params, state }) => {
      const { url } = useDefs();
      const r = params.r ?? 70;
      return (
        <>
          <circle cx={0} cy={0} r={r * 2.9} fill="#efe6c8" opacity={0.25 * state.light} filter={url('glow')} />
          <circle cx={0} cy={0} r={r} fill="#efe6c8" />
        </>
      );
    },
  },
  {
    id: 'sun',
    description: 'Low sun disc with warm glow.',
    params: { r: 'number radius (default 95)' },
    bbox: [-270, -270, 540, 540],
    origin: 'centre',
    Component: ({ params, state }) => {
      const { url } = useDefs();
      const r = params.r ?? 95;
      return (
        <>
          <circle cx={0} cy={0} r={r * 2.7} fill="#ffd38a" opacity={0.35 * state.light} filter={url('glow')} />
          <circle cx={0} cy={0} r={r} fill="#ffe6a8" />
        </>
      );
    },
  },
  {
    id: 'streetlight',
    description: 'Curved street lamp with a light pool. Responds to flicker.',
    params: {},
    bbox: [-60, -920, 340, 924],
    pivots: basePivots(20),
    origin: 'base of the pole',
    Component: ({ state }) => {
      const { url } = useDefs();
      return (
        <>
          <path d="M210 -830 L120 0 L320 0 Z" fill="#ffe39a" opacity={0.16 * state.light} filter={url('blur6')} />
          <circle cx={210} cy={-830} r={110} fill="#ffe39a" opacity={0.4 * state.light} filter={url('glow')} />
          <Cutout>
            <R x={-14} y={-860} w={28} h={860} fill="#2e3236" />
            <P d="M0 -860 C 0 -910 200 -910 210 -860" fill="none" strokeWidth={14} />
            <P d="M170 -860 L250 -860 L230 -820 L190 -820 Z" fill="#2e3236" />
            <circle cx={210} cy={-818} r={12} fill="#fff2b0" opacity={0.3 + 0.7 * state.light} />
          </Cutout>
        </>
      );
    },
  },
  {
    id: 'fence',
    description: 'White picket fence section.',
    params: { width: 'number (default 600)', color: 'hex (default #e3dccb)' },
    bbox: [-310, -230, 620, 234],
    pivots: basePivots(300),
    origin: 'base centre',
    Component: ({ params }) => {
      const w = params.width ?? 600;
      const c = params.color ?? '#e3dccb';
      const n = Math.floor(w / 60);
      return (
        <Cutout>
          <R x={-w / 2} y={-170} w={w} h={20} fill={shade(c, -0.08)} />
          <R x={-w / 2} y={-70} w={w} h={20} fill={shade(c, -0.08)} />
          {Array.from({ length: n }, (_, i) => -w / 2 + 10 + i * 60).map((x) => (
            <P key={x} d={`M${x} 0 L${x} -200 L${x + 18} -224 L${x + 36} -200 L${x + 36} 0 Z`} fill={c} />
          ))}
        </Cutout>
      );
    },
  },
  {
    id: 'shovel',
    description: 'Long-handled shovel, planted at a lean (blade buried).',
    params: { lean: 'number degrees (default -16)' },
    bbox: [-170, -440, 260, 450],
    origin: 'where the blade enters the ground',
    Component: ({ params }) => (
      <Rot a={params.lean ?? -16}>
        <g transform="translate(-601 -1330)">
          <Cutout>
            <R x={590} y={940} w={22} h={400} fill="#8a5a34" />
            <P d="M570 905 L632 905 L632 945 L570 945 Z" fill="#8a5a34" fillOpacity={0} />
            <P d="M578 905 C 578 880 624 880 624 905 L 624 945 L 612 945 L 612 915 L 590 915 L 590 945 L 578 945 Z" fill="#8a5a34" />
            <P d="M568 1300 L634 1300 L638 1385 C 622 1415 580 1415 564 1385 Z" fill="#8f918c" />
          </Cutout>
        </g>
      </Rot>
    ),
  },
  {
    id: 'dirt_mound',
    description: 'Freshly dug mound of earth; withShovel plants a shovel in it.',
    params: { withShovel: 'boolean (default false)' },
    bbox: [-310, -180, 620, 184],
    origin: 'base centre',
    Component: ({ params }) => {
      const clods: [number, number][] = [
        [380, 1360],
        [460, 1320],
        [650, 1330],
        [740, 1380],
        [560, 1300],
      ];
      const shovel = OUTDOOR.find((d) => d.id === 'shovel')!.Component;
      return (
        <g transform="translate(-550 -1430)">
          <Cutout>
            <P d="M250 1430 C 330 1300 470 1268 560 1268 C 690 1268 800 1320 850 1430 Z" fill="#4b3527" />
            {clods.map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx={14 + i * 2} ry={9} fill="#3a281c" />
            ))}
          </Cutout>
          {params.withShovel && (
            <g transform="translate(601 1330)">{React.createElement(shovel, { params: {}, state: undefined as any })}</g>
          )}
          {params.withShovel && (
            <Cutout>
              <P d="M470 1432 C 520 1372 660 1372 720 1432 Z" fill="#4b3527" />
            </Cutout>
          )}
        </g>
      );
    },
  },
];
