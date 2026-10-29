import React from 'react';
import { INK } from '../palettes';
import { useDefs } from '../core/Filters';
import { C, Cutout, E, P, R } from '../core/Ink';
import { shade } from '../core/math';
import { basePivots, type PropDef, type PropProps } from './types';

const FELL = 'IM Fell English';
const PAPERY = '#e8dcc0';

const Bottle: React.FC = () => (
  <Cutout>
    <P d="M-28 0 L-28 -150 C -28 -175 -12 -185 -12 -205 L -12 -250 L 12 -250 L 12 -205 C 12 -185 28 -175 28 -150 L 28 0 Z" fill="#5a3216" />
    <R x={-26} y={-110} w={52} h={50} fill={PAPERY} strokeWidth={2} />
    <rect x={-26} y={-95} width={52} height={12} fill="#a8322a" />
  </Cutout>
);

/** Hanging lamp: origin at the hang point; the shade sits `cord` px below. Glows and casts a cone. */
const LampHanging: React.FC<PropProps> = ({ params, state }) => {
  const { url } = useDefs();
  const cord = params.cord ?? 880;
  const on = state.light;
  const sy = cord + 75;
  return (
    <>
      <path d={`M0 0 L0 ${cord}`} stroke={INK} strokeWidth={5} />
      {params.cone !== false && (
        <path d={`M-60 ${sy} L60 ${sy} L220 ${sy + 415} L-220 ${sy + 415}Z`} fill="#ffe39a" opacity={0.22 * on} filter={url('blur3')} />
      )}
      <Cutout>
        <P d={`M-70 ${sy} L70 ${sy} L35 ${cord} L-35 ${cord}Z`} fill={params.color ?? '#2e5a52'} />
      </Cutout>
      <circle cx={0} cy={sy + 5} r={18} fill="#fff2b0" opacity={0.3 + 0.7 * on} />
      <circle cx={0} cy={sy + 5} r={120} fill="#ffe39a" opacity={0.35 * on} filter={url('glow')} />
    </>
  );
};

const LampFloor: React.FC<PropProps> = ({ state }) => {
  const { url } = useDefs();
  return (
    <>
      <circle cx={0} cy={-580} r={200} fill="#ffd990" opacity={0.35 * state.light} filter={url('glow')} />
      <Cutout>
        <R x={-6} y={-560} w={12} h={560} fill="#2a1a14" />
        <E cx={0} cy={-4} rx={60} ry={12} fill="#2a1a14" />
        <P d="M-60 -560 L60 -560 L36 -660 L-36 -660 Z" fill={state.light > 0.5 ? '#e6c070' : '#a8884a'} />
      </Cutout>
    </>
  );
};

const Paper: React.FC<{ w: number; h: number; fill?: string; children?: React.ReactNode }> = ({ w, h, fill = PAPERY, children }) => (
  <Cutout>
    <R x={-w / 2} y={-h} w={w} h={h} fill={fill} />
    {children}
  </Cutout>
);

const ruled = (x0: number, x1: number, y0: number, n: number, gap: number, width = 2) =>
  Array.from({ length: n }, (_, i) => (
    <line key={i} x1={x0} y1={y0 + i * gap} x2={x1} y2={y0 + i * gap} stroke={INK} strokeWidth={width} opacity={0.55} />
  ));

const clockHands = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return { hour: ((h % 12) + (m || 0) / 60) * 30, minute: (m || 0) * 6 };
};

export const INDOOR: PropDef[] = [
  {
    id: 'beer_bottle',
    description: 'Brown beer bottle with cream label.',
    params: {},
    bbox: [-32, -256, 64, 260],
    pivots: basePivots(28),
    origin: 'base centre',
    Component: () => <Bottle />,
  },
  {
    id: 'glass',
    description: 'Tumbler glass, half full.',
    params: { fill: 'hex liquid colour (default amber)' },
    bbox: [-34, -100, 68, 104],
    pivots: basePivots(24),
    origin: 'base centre',
    Component: ({ params }) => (
      <Cutout>
        <P d="M-30 -96 L30 -96 L24 0 L-24 0 Z" fill="#d8e8e4" fillOpacity={0.55} />
        <P d="M-27 -50 L27 -50 L24 0 L-24 0 Z" fill={params.fill ?? '#c08a3a'} fillOpacity={0.8} />
      </Cutout>
    ),
  },
  {
    id: 'table',
    description: 'Plain wooden table, side-on. Things placed on it sit at its origin height.',
    params: { width: 'number (default 860)' },
    bbox: [-440, -10, 880, 760],
    pivots: basePivots(430),
    origin: 'centre of the table top surface',
    Component: ({ params }) => {
      const w = params.width ?? 860;
      return (
        <Cutout>
          <R x={-w / 2} y={0} w={w} h={42} fill="#6b4428" />
          <R x={-w / 2 + 40} y={42} w={40} h={700} fill="#4f321f" />
          <R x={w / 2 - 80} y={42} w={40} h={700} fill="#4f321f" />
          <R x={-w / 2 + 20} y={42} w={w - 40} h={40} fill="#5a3a24" />
        </Cutout>
      );
    },
  },
  {
    id: 'chair',
    description: 'Wooden kitchen chair, side-on, back on the left.',
    params: {},
    bbox: [-90, -485, 180, 490],
    pivots: { base_left: [-85, 0], base_right: [81, 0] },
    origin: 'base centre (floor)',
    Component: () => (
      <g transform="translate(-875 -1440)">
        <Cutout>
          <R x={790} y={960} w={28} h={330} fill="#5a3a28" />
          <R x={790} y={1180} w={170} h={26} fill="#6b4428" />
          <R x={930} y={1180} w={26} h={260} fill="#5a3a28" />
          <R x={800} y={1180} w={22} h={260} fill="#5a3a28" />
          <R x={800} y={1010} w={10} h={170} fill="#5a3a28" strokeWidth={2} />
        </Cutout>
      </g>
    ),
  },
  {
    id: 'lamp_hanging',
    description: 'Ceiling lamp on a cord with a light cone. Responds to swing and flicker.',
    params: { cord: 'number (px, default 880)', color: 'hex shade colour', cone: 'boolean (default true)' },
    bbox: [-230, 0, 460, 1380],
    pivots: { hang: [0, 0] },
    origin: 'hang point at the ceiling',
    Component: (p) => <LampHanging {...p} />,
  },
  {
    id: 'lamp_floor',
    description: 'Standing floor lamp with fabric shade and warm glow. Responds to flicker.',
    params: {},
    bbox: [-200, -780, 400, 790],
    pivots: basePivots(60),
    origin: 'base centre',
    Component: (p) => <LampFloor {...p} />,
  },
  {
    id: 'phone_rotary',
    description: 'Rotary telephone with handset.',
    params: { color: 'hex (default #2c2a28)' },
    bbox: [-110, -150, 220, 154],
    pivots: basePivots(100),
    origin: 'base centre',
    Component: ({ params }) => {
      const c = params.color ?? '#2c2a28';
      return (
        <Cutout>
          <P d="M-100 0 L-80 -90 L80 -90 L100 0 Z" fill={c} />
          <C cx={0} cy={-50} r={34} fill="#e8e0cc" strokeWidth={2} />
          <C cx={0} cy={-50} r={10} fill={c} strokeWidth={2} />
          <P d="M-110 -100 C -110 -150 -70 -130 -60 -120 L 60 -120 C 70 -130 110 -150 110 -100 L 80 -96 L -80 -96 Z" fill={shade(c, 0.12)} />
        </Cutout>
      );
    },
  },
  {
    id: 'newspaper',
    description: 'Folded newspaper with masthead and a big headline (text param). Good with slam.',
    params: { headline: 'string (≤ 30 chars)', masthead: 'string (default THE DAILY HERALD)', date: 'string' },
    bbox: [-240, -330, 480, 334],
    pivots: basePivots(230),
    origin: 'bottom centre',
    Component: ({ params }) => (
      <Paper w={460} h={320} fill="#ece4d0">
        <text x={0} y={-284} textAnchor="middle" fontFamily={FELL} fontSize={34} fill={INK}>
          {params.masthead ?? 'THE DAILY HERALD'}
        </text>
        <line x1={-210} y1={-270} x2={210} y2={-270} stroke={INK} strokeWidth={2} />
        {params.date && (
          <text x={0} y={-252} textAnchor="middle" fontFamily={FELL} fontSize={16} fill={INK}>
            {params.date}
          </text>
        )}
        <text x={0} y={-200} textAnchor="middle" fontFamily={FELL} fontSize={44} fill={INK} fontWeight="bold">
          {(params.headline ?? 'MISSING').toUpperCase()}
        </text>
        <R x={-210} y={-170} w={150} h={110} fill="#9a948a" strokeWidth={2} />
        {ruled(-40, 210, -160, 7, 18)}
        {ruled(-210, 210, -40, 2, 16)}
      </Paper>
    ),
  },
  {
    id: 'polaroid',
    description: 'Instant photo with a hand-written caption (text param).',
    params: { caption: 'string', tint: 'hex photo colour' },
    bbox: [-115, -275, 230, 280],
    pivots: basePivots(110),
    origin: 'bottom centre',
    Component: ({ params }) => (
      <Paper w={220} h={270} fill="#f3eee2">
        <R x={-96} y={-252} w={192} h={180} fill={params.tint ?? '#5a6a70'} strokeWidth={2} />
        <C cx={0} cy={-190} r={36} fill={shade(params.tint ?? '#5a6a70', -0.3)} strokeWidth={0} />
        <P d="M-50 -72 C -50 -130 50 -130 50 -72 Z" fill={shade(params.tint ?? '#5a6a70', -0.3)} strokeWidth={0} />
        <text x={0} y={-28} textAnchor="middle" fontFamily={FELL} fontSize={26} fill={INK}>
          {params.caption ?? ''}
        </text>
      </Paper>
    ),
  },
  {
    id: 'evidence_bag',
    description: 'Clear evidence bag with red label strip.',
    params: { label: 'string (default EVIDENCE)' },
    bbox: [-125, -310, 250, 315],
    pivots: basePivots(120),
    origin: 'bottom centre',
    Component: ({ params }) => (
      <Cutout>
        <R x={-120} y={-300} w={240} h={300} fill="#dfe8e6" fillOpacity={0.75} />
        <R x={-120} y={-300} w={240} h={30} fill="#c9d4d2" strokeWidth={2} />
        <R x={-100} y={-250} w={200} h={46} fill="#b8322a" strokeWidth={2} />
        <text x={0} y={-217} textAnchor="middle" fontFamily={FELL} fontSize={30} fill="#f3ead8">
          {params.label ?? 'EVIDENCE'}
        </text>
        {ruled(-90, 90, -180, 4, 22)}
      </Cutout>
    ),
  },
  {
    id: 'case_file',
    description: 'Manila case folder with tab and typed label.',
    params: { label: 'string' },
    bbox: [-185, -270, 370, 275],
    pivots: basePivots(180),
    origin: 'bottom centre',
    Component: ({ params }) => (
      <Cutout>
        <P d="M-180 0 L-180 -240 L-60 -240 L-40 -262 L60 -262 L80 -240 L180 -240 L180 0 Z" fill="#d6b77a" />
        <R x={-110} y={-190} w={220} h={50} fill="#f3ead8" strokeWidth={2} />
        <text x={0} y={-155} textAnchor="middle" fontFamily={FELL} fontSize={28} fill={INK}>
          {params.label ?? 'CASE No. 1978-06'}
        </text>
        <R x={60} y={-80} w={90} h={36} fill="none" stroke="#a8322a" strokeWidth={3} transform="rotate(-8 105 -62)" />
      </Cutout>
    ),
  },
  {
    id: 'suitcase',
    description: 'Old leather suitcase with handle and straps.',
    params: { color: 'hex (default #6b4428)' },
    bbox: [-165, -260, 330, 264],
    pivots: basePivots(160),
    origin: 'base centre',
    Component: ({ params }) => {
      const c = params.color ?? '#6b4428';
      return (
        <Cutout>
          <P d="M-40 -220 L-40 -255 L40 -255 L40 -220 L28 -220 L28 -242 L-28 -242 L-28 -220 Z" fill="#3a2a20" />
          <R x={-160} y={-220} w={320} h={220} fill={c} />
          <R x={-110} y={-220} w={24} h={220} fill={shade(c, -0.2)} strokeWidth={2} />
          <R x={86} y={-220} w={24} h={220} fill={shade(c, -0.2)} strokeWidth={2} />
          <R x={-16} y={-196} w={32} h={20} fill="#c9a23a" strokeWidth={2} />
        </Cutout>
      );
    },
  },
  {
    id: 'luggage_tag',
    description: 'Paper luggage tag on a string (text param).',
    params: { text: 'string' },
    bbox: [-90, -170, 180, 174],
    pivots: { hang: [0, -170] },
    origin: 'bottom centre',
    Component: ({ params }) => (
      <Cutout>
        <path d="M0 -170 L0 -130" stroke={INK} strokeWidth={3} />
        <P d="M-80 0 L-80 -100 L-40 -130 L40 -130 L80 -100 L80 0 Z" fill="#d6b77a" />
        <C cx={0} cy={-110} r={8} fill="#f3ead8" strokeWidth={2} />
        <text x={0} y={-50} textAnchor="middle" fontFamily={FELL} fontSize={24} fill={INK}>
          {params.text ?? ''}
        </text>
      </Cutout>
    ),
  },
  {
    id: 'letter',
    description: 'Hand-written letter, one page.',
    params: { text: 'string (first line, optional)' },
    bbox: [-125, -330, 250, 335],
    pivots: basePivots(120),
    origin: 'bottom centre',
    Component: ({ params }) => (
      <Paper w={240} h={320} fill="#f1e9d6">
        {params.text && (
          <text x={-100} y={-280} fontFamily={FELL} fontSize={22} fill={INK}>
            {params.text}
          </text>
        )}
        {ruled(-100, 100, -250, 9, 26)}
      </Paper>
    ),
  },
  {
    id: 'envelope',
    description: 'Sealed envelope with stamp.',
    params: {},
    bbox: [-165, -215, 330, 220],
    pivots: basePivots(160),
    origin: 'bottom centre',
    Component: () => (
      <Cutout>
        <R x={-160} y={-210} w={320} h={210} fill="#e3d5b2" />
        <P d="M-160 -210 L0 -90 L160 -210" fill="none" />
        <R x={100} y={-196} w={44} h={52} fill="#b8322a" strokeWidth={2} />
        {ruled(-60, 70, -60, 3, 18)}
      </Cutout>
    ),
  },
  {
    id: 'calendar',
    description: 'Wall calendar page showing a month and day.',
    params: { month: 'string (e.g. JUNE)', day: 'string/number', year: 'string' },
    bbox: [-130, -320, 260, 324],
    pivots: { ...basePivots(125), hang: [0, -310] },
    origin: 'bottom centre',
    Component: ({ params }) => (
      <Cutout>
        <R x={-125} y={-300} w={250} h={300} fill="#f3eee2" />
        <R x={-125} y={-300} w={250} h={70} fill="#a8322a" />
        <text x={0} y={-252} textAnchor="middle" fontFamily={FELL} fontSize={40} fill="#f3ead8">
          {params.month ?? 'JUNE'}
        </text>
        <text x={0} y={-80} textAnchor="middle" fontFamily={FELL} fontSize={140} fill={INK}>
          {params.day ?? '18'}
        </text>
        <text x={0} y={-24} textAnchor="middle" fontFamily={FELL} fontSize={28} fill={INK}>
          {params.year ?? '1978'}
        </text>
        <C cx={-60} cy={-310} r={8} fill="#8a8a8a" strokeWidth={2} />
        <C cx={60} cy={-310} r={8} fill="#8a8a8a" strokeWidth={2} />
      </Cutout>
    ),
  },
  {
    id: 'clock',
    description: 'Round wall clock showing a time.',
    params: { time: 'HH:MM (default 11:45)' },
    bbox: [-125, -125, 250, 250],
    pivots: { hang: [0, -120] },
    origin: 'centre of the face',
    Component: ({ params }) => {
      const { hour, minute } = clockHands(params.time ?? '11:45');
      return (
        <Cutout>
          <C cx={0} cy={0} r={120} fill="#6b4428" />
          <C cx={0} cy={0} r={100} fill="#f3eee2" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={0} y1={-86} x2={0} y2={-74} stroke={INK} strokeWidth={4} transform={`rotate(${i * 30})`} />
          ))}
          <line x1={0} y1={0} x2={0} y2={-50} stroke={INK} strokeWidth={8} strokeLinecap="round" transform={`rotate(${hour})`} />
          <line x1={0} y1={0} x2={0} y2={-78} stroke={INK} strokeWidth={5} strokeLinecap="round" transform={`rotate(${minute})`} />
          <circle cx={0} cy={0} r={7} fill={INK} />
        </Cutout>
      );
    },
  },
  {
    id: 'tv_crt',
    description: 'Wood-cabinet CRT television; the screen glows (responds to flicker).',
    params: { screen: 'hex screen colour (default cold blue)' },
    bbox: [-170, -330, 340, 334],
    pivots: basePivots(160),
    origin: 'base centre',
    Component: ({ params, state }) => {
      const { url } = useDefs();
      const scr = params.screen ?? '#9cc3d6';
      return (
        <>
          <circle cx={-30} cy={-180} r={160} fill={scr} opacity={0.3 * state.light} filter={url('glow')} />
          <Cutout>
            <R x={-160} y={-290} w={320} h={250} fill="#6b4428" />
            <rect x={-136} y={-268} width={210} height={200} rx={30} fill={state.light > 0.4 ? scr : '#2a3034'} stroke={INK} strokeWidth={3} />
            <C cx={118} cy={-230} r={14} fill="#c8c8c8" strokeWidth={2} />
            <C cx={118} cy={-180} r={14} fill="#c8c8c8" strokeWidth={2} />
            <R x={-130} y={-40} w={20} h={40} fill="#3a2a20" />
            <R x={110} y={-40} w={20} h={40} fill="#3a2a20" />
            <path d="M-40 -290 L-90 -330 M40 -290 L90 -330" stroke={INK} strokeWidth={4} />
          </Cutout>
        </>
      );
    },
  },
  {
    id: 'radio',
    description: 'Arched wooden table radio with dial.',
    params: {},
    bbox: [-125, -250, 250, 254],
    pivots: basePivots(120),
    origin: 'base centre',
    Component: () => (
      <Cutout>
        <P d="M-120 0 L-120 -150 C -120 -270 120 -270 120 -150 L 120 0 Z" fill="#8a5a34" />
        <P d="M-80 -60 L-80 -150 C -80 -210 80 -210 80 -150 L 80 -60 Z" fill="#d6b77a" />
        {[-50, -25, 0, 25, 50].map((x) => (
          <line key={x} x1={x} y1={-190} x2={x} y2={-70} stroke={INK} strokeWidth={2} opacity={0.6} />
        ))}
        <C cx={-55} cy={-30} r={14} fill="#3a2a20" strokeWidth={2} />
        <C cx={55} cy={-30} r={14} fill="#3a2a20" strokeWidth={2} />
      </Cutout>
    ),
  },
  {
    id: 'door',
    description: 'Panelled interior door; opens with door_open (hinge on the left).',
    params: { color: 'hex', open: 'number 0..1 (initial)' },
    bbox: [-150, -560, 300, 564],
    pivots: basePivots(140),
    origin: 'base centre',
    Component: ({ params, state }) => {
      const c = params.color ?? '#6a2c23';
      const open = state.open ?? params.open ?? 0;
      const sx = Math.max(0.08, Math.cos((open * Math.PI) / 2.4));
      return (
        <>
          <Cutout>
            <R x={-150} y={-560} w={300} h={560} fill="#4a3226" />
            <R x={-130} y={-540} w={260} h={540} fill="#140c0a" />
          </Cutout>
          <g transform={`translate(-130 0) scale(${sx} 1) translate(130 0)`}>
            <Cutout>
              <R x={-130} y={-540} w={260} h={540} fill={c} />
              <R x={-100} y={-500} w={200} h={200} fill={shade(c, -0.12)} strokeWidth={2} />
              <R x={-100} y={-260} w={200} h={220} fill={shade(c, -0.12)} strokeWidth={2} />
              <C cx={100} cy={-270} r={10} fill="#e0b86a" strokeWidth={2} />
            </Cutout>
          </g>
        </>
      );
    },
  },
  {
    id: 'window',
    description: 'Sash window; pane colour = what is outside; lit windows glow (light).',
    params: { outside: 'hex (default night blue)', lit: 'boolean', moon: 'boolean' },
    bbox: [-125, -290, 250, 294],
    pivots: basePivots(115),
    origin: 'bottom centre of the frame',
    Component: ({ params, state }) => {
      const { url } = useDefs();
      const lit = params.lit;
      return (
        <>
          {lit && <circle cx={0} cy={-140} r={160} fill="#ffb84a" opacity={0.35 * state.light} filter={url('glow')} />}
          <Cutout>
            <R x={-115} y={-280} w={230} h={280} fill="#574036" />
            <R x={-100} y={-265} w={200} h={250} fill={lit ? '#ffcf6e' : (params.outside ?? '#1d2b44')} />
            {params.moon && <circle cx={50} cy={-200} r={24} fill="#e9e1c4" />}
            <line x1={0} y1={-265} x2={0} y2={-15} stroke={INK} strokeWidth={4} />
            <line x1={-100} y1={-140} x2={100} y2={-140} stroke={INK} strokeWidth={4} />
          </Cutout>
        </>
      );
    },
  },
  {
    id: 'map_pin_board',
    description: 'Corkboard with photos, pins and red string (investigation board).',
    params: {},
    bbox: [-265, -370, 530, 374],
    pivots: basePivots(260),
    origin: 'bottom centre',
    Component: () => {
      const pins: [number, number][] = [
        [-170, -280],
        [120, -300],
        [-60, -150],
        [180, -120],
        [-180, -70],
      ];
      return (
        <Cutout>
          <R x={-260} y={-360} w={520} h={360} fill="#6b4428" />
          <R x={-240} y={-340} w={480} h={320} fill="#b8925a" />
          {pins.map(([x, y], i) => (
            <R key={i} x={x - 40} y={y - 10} w={80} h={90} fill={i % 2 ? '#e8dcc0' : '#f3eee2'} strokeWidth={2} transform={`rotate(${(i - 2) * 4} ${x} ${y})`} />
          ))}
          <path d={`M${pins.map(([x, y]) => `${x} ${y}`).join(' L')}`} fill="none" stroke="#b8322a" strokeWidth={3} />
          {pins.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={8} fill="#c43a2a" stroke={INK} strokeWidth={2} />
          ))}
        </Cutout>
      );
    },
  },
  {
    id: 'handcuffs',
    description: 'Pair of steel handcuffs.',
    params: {},
    bbox: [-120, -90, 240, 94],
    pivots: basePivots(110),
    origin: 'bottom centre',
    Component: () => (
      <Cutout>
        <circle cx={-60} cy={-45} r={42} fill="none" stroke={INK} strokeWidth={22} />
        <circle cx={-60} cy={-45} r={42} fill="none" stroke="#b8b8b8" strokeWidth={15} />
        <circle cx={60} cy={-45} r={42} fill="none" stroke={INK} strokeWidth={22} />
        <circle cx={60} cy={-45} r={42} fill="none" stroke="#b8b8b8" strokeWidth={15} />
        <R x={-20} y={-52} w={40} h={14} fill="#9a9a9a" strokeWidth={2} />
      </Cutout>
    ),
  },
  {
    id: 'badge',
    description: 'Police badge (shield).',
    params: {},
    bbox: [-80, -190, 160, 194],
    pivots: basePivots(60),
    origin: 'bottom centre',
    Component: () => (
      <Cutout>
        <P d="M-75 -180 L0 -150 L75 -180 L70 -80 C 60 -30 30 -10 0 0 C -30 -10 -60 -30 -70 -80 Z" fill="#c9a23a" />
        <P d="M0 -130 L12 -102 L42 -100 L18 -82 L26 -52 L0 -68 L-26 -52 L-18 -82 L-42 -100 L-12 -102 Z" fill="#e9cf72" strokeWidth={2} />
      </Cutout>
    ),
  },
  {
    id: 'key',
    description: 'Old brass key.',
    params: {},
    bbox: [-110, -50, 220, 54],
    pivots: basePivots(100),
    origin: 'bottom centre',
    Component: () => (
      <Cutout>
        <circle cx={-70} cy={-25} r={32} fill="#c9a23a" stroke={INK} strokeWidth={3} />
        <circle cx={-70} cy={-25} r={12} fill="#2b1d17" />
        <P d="M-40 -34 L100 -34 L100 -16 L80 -16 L80 0 L64 0 L64 -16 L50 -16 L50 -6 L36 -6 L36 -16 L-40 -16 Z" fill="#c9a23a" />
      </Cutout>
    ),
  },
  {
    id: 'monkey_paw',
    description: "A shrivelled monkey's paw with three curled fingers (The Monkey's Paw).",
    params: {},
    bbox: [-90, -230, 180, 234],
    pivots: basePivots(40),
    origin: 'wrist (bottom centre)',
    Component: () => {
      const c = '#6b4a30';
      return (
        <Cutout>
          <P d="M-30 0 C -40 -60 -50 -100 -40 -130 L 40 -130 C 50 -100 40 -60 30 0 Z" fill={c} />
          <P d="M-42 -126 C -70 -170 -60 -210 -40 -205 C -28 -200 -36 -170 -22 -134 Z" fill={c} />
          <P d="M-14 -130 C -20 -190 0 -230 18 -220 C 28 -210 10 -180 12 -130 Z" fill={c} />
          <P d="M18 -128 C 40 -180 70 -190 76 -170 C 80 -155 50 -150 42 -122 Z" fill={c} />
          <P d="M30 -70 C 60 -80 80 -110 72 -120 C 60 -126 50 -100 34 -92 Z" fill={shade(c, -0.1)} />
          {[-80, -60, -40].map((y) => (
            <path key={y} d={`M-24 ${y} Q 0 ${y - 6} 24 ${y}`} fill="none" stroke={INK} strokeWidth={2} />
          ))}
        </Cutout>
      );
    },
  },
];
