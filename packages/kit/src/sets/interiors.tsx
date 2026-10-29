import React from 'react';
import { INK, palettes } from '../palettes';
import { useDefs } from '../core/Filters';
import { C, Cutout, E, P, R } from '../core/Ink';
import { useView } from '../core/format';
import { useStopMotionTime, useTarget } from '../core/ShotContext';
import { seededRandom as rnd, shade } from '../core/math';
import { BG_H, BG_Y, type SetDef } from './types';

type Room = { wall: string; stripe: string; floor: string; rail: string; lamp: string };
const ROOMS: Record<string, Room> = {
  interiorWarm: { ...palettes.interiorWarm, floor: palettes.interiorWarm.wainscot },
  interiorDark: { ...palettes.interiorDark, rail: '#3a2630' },
  police: { ...palettes.police, rail: '#4a565e' },
  day: { wall: '#c9b48a', stripe: '#bba67c', floor: '#6b4428', rail: '#8a5a3a', lamp: '#ffe9b0' },
  parlour: { wall: '#2f4a3a', stripe: '#29412f', floor: '#3a2418', rail: '#6b4428', lamp: '#ffcf80' },
};
const room = (pal: string) => ROOMS[pal] ?? ROOMS.interiorWarm;

/** Wall with vertical stripes, a floor from `floorY`, and a rail. Spans the padded view. */
const StripedWall: React.FC<{ r: Room; floorY: number; rail?: boolean; stripes?: boolean }> = ({
  r,
  floorY,
  rail = true,
  stripes = true,
}) => {
  const v = useView();
  const start = -200 + 64 * Math.floor((v.x0 + 200) / 64);
  return (
    <>
      <rect x={v.x0} y={BG_Y} width={v.w} height={BG_H} fill={r.wall} />
      {stripes &&
        Array.from({ length: Math.ceil((v.x1 - start) / 64) + 1 }, (_, i) => start + i * 64).map((x) => (
          <rect key={x} x={x} y={BG_Y} width={26} height={floorY - BG_Y + 20} fill={r.stripe} />
        ))}
      <rect x={v.x0} y={floorY} width={v.w} height={900} fill={r.floor} />
      {rail && <rect x={v.x0} y={floorY - 10} width={v.w} height={20} fill={r.rail} />}
    </>
  );
};

const LampGlow: React.FC<{ x: number; y: number; color: string; id?: string }> = ({ x, y, color, id = 'lamp' }) => {
  const s = useTarget(id);
  return (
    <>
      <circle cx={x} cy={y} r={230} fill={color} opacity={0.45 * s.light} />
      <path d={`M${x - 60} ${y + 20} L${x + 60} ${y + 20} L${x + 30} ${y - 70} L${x - 30} ${y - 70} Z`} fill={s.light > 0.5 ? '#e6c070' : '#9a8050'} />
      <rect x={x - 5} y={y + 20} width={10} height={560} fill="#2a1a14" />
    </>
  );
};

/* ---------------- living_room_70s ---------------- */
const livingRoom: SetDef = {
  id: 'living_room_70s',
  description: '1970s living room: striped wallpaper, curtained window, framed picture, floor lamp glow. Blurred backdrop for waist/closeup shots.',
  palettes: ['interiorWarm', 'interiorDark'],
  params: {},
  defaults: {},
  anchors: { centre: [540, 1400], floor_y: [540, 1340], window: [215, 710], lamp: [930, 760] },
  elements: ['lamp', 'window_light'],
  fx: () => ({ dust: { x: 760, y: 540, w: 340, h: 500 }, lightCone: { x: 215, y: 520, width: 260, length: 1100 } }),
  far: ({ pal }) => {
    const r = room(pal);
    const win = useTarget('window_light');
    return (
      <>
        <StripedWall r={r} floorY={1340} />
        <rect x={70} y={500} width={290} height={420} fill="#e9dcc0" />
        <rect x={88} y={518} width={254} height={384} fill={win.light < 1 ? '#1d2b44' : '#3a4f6e'} />
        <rect x={40} y={480} width={80} height={520} fill="#a3483a" />
        <rect x={310} y={480} width={80} height={520} fill="#a3483a" />
        <rect x={640} y={520} width={210} height={160} fill="#c9b48a" />
        <rect x={660} y={540} width={170} height={120} fill="#7a6a4a" />
        <LampGlow x={930} y={760} color={r.lamp} />
        {/* only visible in landscape: bookshelf left, console TV right */}
        <rect x={-380} y={560} width={260} height={780} fill="#4a2f22" />
        {[640, 800, 960, 1120].map((y, i) => (
          <g key={y}>
            <rect x={-360} y={y} width={220} height={14} fill="#2f1d14" />
            {Array.from({ length: 7 }, (_, k) => (
              <rect key={k} x={-352 + k * 30} y={y - 110 + rnd(i * 9 + k) * 30} width={24} height={110 - rnd(i * 9 + k) * 30} fill={['#7a3a2a', '#3f5c4a', '#b8902e', '#2c3a54'][(k + i) % 4]} />
            ))}
          </g>
        ))}
        <rect x={1180} y={1060} width={300} height={280} fill="#6b4428" />
        <rect x={1205} y={1085} width={200} height={170} rx={24} fill="#9cc3d6" opacity={0.8} />
      </>
    );
  },
};

/* ---------------- apartment_interior ---------------- */
const apartment: SetDef = {
  id: 'apartment_interior',
  description: 'Bare room: back door ajar with a moonlit gap, small window with the moon, dark floor. Pair with table/chair/lamp_hanging props.',
  palettes: ['interiorDark', 'interiorWarm'],
  params: {},
  defaults: {},
  anchors: { floor_y: [540, 1220], table: [540, 1300], lamp_hang: [540, -50], door: [510, 1220] },
  elements: ['door_gap', 'window_light'],
  fx: () => ({ dust: { x: 300, y: 700, w: 480, h: 600 }, lightCone: { x: 609, y: 660, width: 40, length: 900 } }),
  far: ({ pal }) => {
    const r = room(pal);
    const gap = useTarget('door_gap');
    return (
      <>
        <StripedWall r={r} floorY={1220} rail={false} />
        <rect x={370} y={640} width={280} height={580} fill="#574036" />
        <rect x={390} y={660} width={240} height={560} fill="#3b2a24" />
        <rect x={598} y={660} width={22} height={560} fill="#6d8fb0" opacity={0.8 * gap.light} />
        <rect x={760} y={610} width={210} height={270} fill="#574036" />
        <rect x={775} y={625} width={180} height={240} fill="#1d2b44" />
        <circle cx={900} cy={690} r={26} fill="#e9e1c4" />
        {/* landscape-only: radiator and a coat on a hook */}
        <rect x={-300} y={1000} width={240} height={160} fill="#4a3a3a" />
        {Array.from({ length: 7 }, (_, k) => (
          <rect key={k} x={-290 + k * 33} y={1010} width={18} height={140} fill="#3a2a2a" />
        ))}
        <path d="M1260 700 C 1200 760 1190 1000 1220 1080 L1340 1080 C 1370 1000 1360 760 1300 700 Z" fill="#3a3040" />
      </>
    );
  },
};

/* ---------------- kitchen ---------------- */
const kitchen: SetDef = {
  id: 'kitchen',
  description: 'Small 70s kitchen: tiled splashback, wall cabinets, window over the sink, counter, checkered floor.',
  palettes: ['interiorWarm', 'day', 'interiorDark'],
  params: {},
  defaults: {},
  anchors: { counter_top: [540, 1180], floor_y: [540, 1420], window: [540, 760] },
  elements: ['window_light', 'lamp'],
  fx: () => ({ dust: { x: 360, y: 640, w: 360, h: 480 }, lightCone: { x: 540, y: 620, width: 280, length: 1000 } }),
  far: ({ pal }) => {
    const v = useView();
    const dark = pal === 'interiorDark';
    const wall = pal === 'day' ? '#d8c99c' : dark ? '#3a3328' : '#b8a678';
    const tile = shade(wall, 0.18);
    const win = useTarget('window_light');
    const lamp = useTarget('lamp');
    return (
      <>
        <rect x={v.x0} y={BG_Y} width={v.w} height={BG_H} fill={wall} />
        {Array.from({ length: Math.ceil(v.w / 60) }, (_, i) => v.x0 + i * 60).map((x) =>
          [820, 880, 940, 1000, 1060, 1120].map((y) => <rect key={`${x}-${y}`} x={x + 3} y={y + 3} width={54} height={54} fill={tile} />),
        )}
        {[-360, -80, 200, 700, 980, 1260].map((x) => (
          <g key={x}>
            <rect x={x} y={420} width={240} height={330} fill={dark ? '#4a3020' : '#8a5a34'} />
            <rect x={x + 20} y={440} width={95} height={290} fill={dark ? '#3a2418' : '#7a4a2a'} />
            <rect x={x + 125} y={440} width={95} height={290} fill={dark ? '#3a2418' : '#7a4a2a'} />
          </g>
        ))}
        <rect x={420} y={600} width={240} height={300} fill="#e9dcc0" />
        <rect x={436} y={616} width={208} height={268} fill={pal === 'day' ? '#a8cce0' : '#1d2b44'} opacity={win.light} />
        <path d="M420 600 C 470 660 470 760 440 900 L420 900 Z M660 600 C 610 660 610 760 640 900 L660 900 Z" fill="#c9a45a" />
        <circle cx={540} cy={300} r={140} fill="#ffe39a" opacity={0.3 * lamp.light} />
        <rect x={v.x0} y={1420} width={v.w} height={800} fill="#e8dcc0" />
        {Array.from({ length: Math.ceil(v.w / 80) }, (_, i) => v.x0 + i * 80).map((x, i) =>
          [1420, 1500, 1580, 1660, 1740, 1820].map((y, j) => ((i + j) % 2 ? <rect key={`${x}-${y}`} x={x} y={y} width={80} height={80} fill="#4a3a30" /> : null)),
        )}
      </>
    );
  },
  mid: ({ pal }) => {
    const v = useView();
    const dark = pal === 'interiorDark';
    return (
      <>
        <Cutout>
          <R x={v.x0 + 40} y={1180} w={v.w - 80} h={34} fill="#c9b48a" />
          <R x={v.x0 + 60} y={1214} w={v.w - 120} h={210} fill={dark ? '#4a3020' : '#8a5a34'} />
          <R x={440} y={1186} w={200} h={22} fill="#9aa4a8" />
        </Cutout>
        <Cutout>
          <R x={1300} y={560} w={200} h={864} fill="#d9d3c4" />
          <line x1={1300} y1={860} x2={1500} y2={860} stroke={INK} strokeWidth={3} />
          <R x={1320} y={600} w={14} h={120} fill="#9a948a" strokeWidth={2} />
        </Cutout>
      </>
    );
  },
};

/* ---------------- police_interview_room ---------------- */
const interview: SetDef = {
  id: 'police_interview_room',
  description: 'Bare interview room: cinder-block wall, one-way mirror, steel door, bare bulb overhead, metal table.',
  palettes: ['police'],
  params: { table: 'boolean metal table (default true)' },
  defaults: { table: true },
  anchors: { table_top: [540, 1300], chair_left: [240, 1600], chair_right: [840, 1600], floor_y: [540, 1260] },
  elements: ['bulb', 'mirror'],
  fx: () => ({ dust: { x: 300, y: 300, w: 480, h: 900 }, lightCone: { x: 540, y: 160, width: 120, length: 1300 } }),
  sky: () => {
    const v = useView();
    const r = ROOMS.police;
    return (
      <>
        <rect x={v.x0} y={BG_Y} width={v.w} height={BG_H} fill={r.wall} />
        {Array.from({ length: 24 }, (_, row) =>
          Array.from({ length: Math.ceil(v.w / 160) + 1 }, (_, c) => {
            const x = v.x0 + c * 160 - (row % 2) * 80;
            return <rect key={`${row}-${c}`} x={x + 3} y={BG_Y + row * 64 + 3} width={154} height={58} fill={shade(r.wall, (rnd(row * 37 + c) - 0.5) * 0.08)} />;
          }),
        )}
        <rect x={v.x0} y={1260} width={v.w} height={900} fill={r.floor} />
      </>
    );
  },
  far: () => {
    const mirror = useTarget('mirror');
    return (
      <>
        <rect x={-60} y={560} width={560} height={420} fill="#2a3034" />
        <rect x={-40} y={580} width={520} height={380} fill="#1a2228" opacity={mirror.light} />
        <path d="M30 600 L120 600 L-10 940 L-40 940 Z" fill="#fff" opacity={0.08} />
        <rect x={700} y={680} width={300} height={580} fill="#5e6a70" />
        <rect x={810} y={740} width={80} height={110} fill="#1a2228" />
        <circle cx={970} cy={980} r={12} fill="#9a9a9a" />
      </>
    );
  },
  mid: ({ v }) => {
    const { url } = useDefs();
    const bulb = useTarget('bulb');
    return (
      <>
        <path d="M480 150 L600 150 L900 1300 L180 1300 Z" fill="#e8f0ff" opacity={0.08 * bulb.light} filter={url('blur6')} />
        <path d="M540 -200 L540 130" stroke={INK} strokeWidth={4} />
        <circle cx={540} cy={150} r={140} fill="#d8e4ff" opacity={0.4 * bulb.light} filter={url('glow')} />
        <Cutout>
          <R x={520} y={110} w={40} h={24} fill="#5e6a70" />
          <E cx={540} cy={155} rx={22} ry={28} fill={bulb.light > 0.5 ? '#fbf6e0' : '#9a9a8a'} />
        </Cutout>
        {v.table && (
          <Cutout>
            <R x={150} y={1300} w={780} h={30} fill="#9aa4a8" />
            <R x={190} y={1330} w={30} h={700} fill="#6e787c" />
            <R x={860} y={1330} w={30} h={700} fill="#6e787c" />
          </Cutout>
        )}
      </>
    );
  },
};

/* ---------------- victorian_parlour ---------------- */
const parlour: SetDef = {
  id: 'victorian_parlour',
  description: "Victorian parlour (horror classics, The Monkey's Paw): damask wallpaper, fireplace with live fire glow, oval portrait, heavy curtains.",
  palettes: ['parlour', 'interiorWarm', 'interiorDark'],
  params: { fire: 'boolean fire lit (default true)' },
  defaults: { fire: true },
  anchors: { mantel_top: [540, 1020], hearth: [540, 1300], armchair_left: [180, 1500], floor_y: [540, 1340] },
  elements: ['fire', 'window_light'],
  fx: () => ({ dust: { x: 300, y: 600, w: 500, h: 600 } }),
  far: ({ pal, v }) => {
    const r = room(pal === 'parlour' ? 'parlour' : pal);
    const view = useView();
    const fire = useTarget('fire');
    const { url } = useDefs();
    const { tq } = useStopMotionTime();
    // fire boils on 12 fps time, like everything else that moves in a puppet show
    const flick = v.fire ? fire.light * (0.8 + 0.2 * rnd(Math.floor(tq * 12))) : 0;
    return (
      <>
        <rect x={view.x0} y={BG_Y} width={view.w} height={BG_H} fill={r.wall} />
        {Array.from({ length: Math.ceil(view.w / 120) + 1 }, (_, c) =>
          Array.from({ length: 12 }, (_, row) => {
            const x = view.x0 + c * 120 + (row % 2) * 60;
            const y = 80 + row * 110;
            return <path key={`${c}-${row}`} d={`M${x} ${y - 30} Q${x + 22} ${y} ${x} ${y + 30} Q${x - 22} ${y} ${x} ${y - 30} Z`} fill={r.stripe} />;
          }),
        )}
        <rect x={view.x0} y={1080} width={view.w} height={260} fill={shade(r.wall, -0.25)} />
        <rect x={view.x0} y={1070} width={view.w} height={14} fill={r.rail} />
        <rect x={view.x0} y={1340} width={view.w} height={900} fill={r.floor} />
        <ellipse cx={540} cy={1500} rx={520} ry={90} fill="#5a2230" opacity={0.7} />
        <ellipse cx={540} cy={680} rx={120} ry={150} fill="#8a6a34" />
        <ellipse cx={540} cy={680} rx={96} ry={126} fill="#3a3028" />
        <circle cx={540} cy={640} r={40} fill="#6a5a48" />
        <path d="M470 760 C 480 700 600 700 610 760 Z" fill="#6a5a48" />
        <rect x={300} y={1000} width={480} height={30} fill="#4a2f22" />
        <rect x={330} y={1030} width={420} height={310} fill="#6b4428" />
        <rect x={420} y={1110} width={240} height={230} fill="#140c0a" />
        {v.fire && (
          <>
            <circle cx={540} cy={1260} r={260} fill="#ff9a3a" opacity={0.3 * flick} filter={url('glow')} />
            <path d="M450 1340 C 460 1260 500 1250 510 1200 C 530 1250 560 1220 560 1170 C 600 1230 640 1260 630 1340 Z" fill="#ffb84a" opacity={0.6 + 0.4 * flick} />
            <path d="M490 1340 C 500 1290 530 1280 540 1240 C 560 1290 590 1300 590 1340 Z" fill="#ffe39a" />
          </>
        )}
        {[-380, 1140].map((x) => (
          <g key={x}>
            <rect x={x} y={300} width={300} height={800} fill="#2a1a24" />
            <path d={`M${x - 30} 280 C ${x + 40} 500 ${x + 30} 900 ${x - 20} 1140 L${x + 110} 1140 C ${x + 80} 800 ${x + 100} 500 ${x + 90} 280 Z`} fill="#6b2230" />
            <path d={`M${x + 330} 280 C ${x + 260} 500 ${x + 270} 900 ${x + 320} 1140 L${x + 190} 1140 C ${x + 220} 800 ${x + 200} 500 ${x + 210} 280 Z`} fill="#6b2230" />
          </g>
        ))}
      </>
    );
  },
  mid: () => (
    <Cutout>
      <P d="M60 1640 L60 1330 C 60 1250 300 1250 300 1330 L300 1640 Z" fill="#6b2230" />
      <R x={30} y={1450} w={300} h={190} fill="#5a1b28" />
      <C cx={45} cy={1450} r={36} fill="#5a1b28" />
      <C cx={315} cy={1450} r={36} fill="#5a1b28" />
    </Cutout>
  ),
};

export const INTERIORS: SetDef[] = [livingRoom, apartment, kitchen, interview, parlour];
