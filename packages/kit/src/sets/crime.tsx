// Indian true crime + drama pack — everyday Indian places in the diorama house style, muted and
// grounded (no folk patterns). Every set takes `time: day | night`; interiors light their tube lights
// and lamps at night, windows show the sky outside.
import React from 'react';
import { useDefs } from '../core/Filters';
import { Cutout, Patterned, Rot } from '../core/Ink';
import { useView } from '../core/format';
import { seededRandom as rnd, shade } from '../core/math';
import { useShot } from '../core/ShotContext';
import { across, Cloud, FullMoon, hillPath, RoundTree, Star } from './folkWorld';
import { BG_H, BG_Y, type SetDef } from './types';

const TIME_PARAM = { time: 'day | night (default night)' };
const VARIANTS = [{ time: 'day' }, { time: 'night' }];
const isNight = (v: Record<string, any>) => (v.time ?? 'night') !== 'day';
/** Pick the day or night value. */
const dn = <T,>(v: Record<string, any>, day: T, night: T): T => (isNight(v) ? night : day);

const FLOOR_Y = 1300;
const BOTTOM = BG_Y + BG_H;

const crimeFx = (groundY: number) => (v: { left: number; right: number; top: number; bottom: number }) => ({
  dust: { x: v.left + 80, y: 800, w: v.right - v.left - 160, h: 600 },
  fireflies: { x: v.left + 80, y: 950, w: v.right - v.left - 160, h: 400 },
  groundY,
});

/* ------------------------------------------------------------------ shared pieces */

/** Plain outdoor sky: soft gradient, a few clouds by day, moon and sparse stars at night. */
const CitySky: React.FC<{ v: Record<string, any>; moon?: [number, number] }> = ({ v, moon = [820, 560] }) => {
  const view = useView();
  const { id, url } = useDefs();
  const night = isNight(v);
  const stops = night ? ['#0e1324', '#1c2440', '#2c3352'] : ['#8fbccc', '#c8dcd6', '#ece2c6'];
  const gid = night ? 'citySkyN' : 'citySkyD';
  return (
    <>
      <defs>
        <linearGradient id={id(gid)} x1="0" y1="0" x2="0" y2="1">
          {stops.map((c, i) => (
            <stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <rect x={view.x0} y={BG_Y} width={view.w} height={BG_H} fill={url(gid)} />
      {night &&
        across(view.x0, view.x1, 150).map((x, i) => (
          <Star
            key={x}
            x={x + rnd(i) * 80}
            y={180 + rnd(i + 7) * 600}
            s={4 + rnd(i + 2) * 5}
            fill="#e8e0c8"
          />
        ))}
      {night && <FullMoon cx={moon[0]} cy={moon[1]} r={70} />}
      {!night &&
        across(view.x0, view.x1, 600).map((x, i) => (
          <Cloud key={x} x={x + rnd(i) * 200} y={560 + rnd(i + 3) * 200} w={220} fill="#f2ede0" seed={i} />
        ))}
    </>
  );
};

/** Back wall + dado + tiled floor for an interior. */
const Room: React.FC<{ wall: string; dado: string; floor: string; tile?: string; dadoTop?: number }> = ({
  wall,
  dado,
  floor,
  tile,
  dadoTop = 1060,
}) => {
  const view = useView();
  return (
    <>
      <Cutout>
        <Patterned
          d={`M${view.x0} ${BG_Y} L${view.x1} ${BG_Y} L${view.x1} ${FLOOR_Y} L${view.x0} ${FLOOR_Y} Z`}
          fill={wall}
          pattern="lines-ink"
          opacity={0.05}
        />
        <rect x={view.x0} y={dadoTop} width={view.w} height={FLOOR_Y - dadoTop} fill={dado} />
        <rect x={view.x0} y={dadoTop - 10} width={view.w} height={12} fill={shade(dado, -0.2)} />
      </Cutout>
      <Cutout>
        <rect x={view.x0} y={FLOOR_Y} width={view.w} height={BOTTOM - FLOOR_Y} fill={floor} />
        {tile &&
          [1340, 1400, 1490, 1620, 1800].map((y) => (
            <rect key={y} x={view.x0} y={y} width={view.w} height={3} fill={tile} opacity={0.6} />
          ))}
        {tile &&
          across(view.x0, view.x1, 180).map((x) => (
            <path
              key={x}
              d={`M${x + 90} ${FLOOR_Y} L${540 + (x + 90 - 540) * 2.6} ${BOTTOM}`}
              stroke={tile}
              strokeWidth={3}
              opacity={0.5}
            />
          ))}
      </Cutout>
    </>
  );
};

/** Window in a wall: sky seen through it, a frame and grill bars. */
const Window: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  v: Record<string, any>;
  frame: string;
  bars?: number;
}> = ({ x, y, w, h, v, frame, bars = 4 }) => (
  <Cutout>
    <rect x={x - 14} y={y - 14} width={w + 28} height={h + 28} fill={frame} />
    <rect x={x} y={y} width={w} height={h} fill={dn(v, '#b8d4d6', '#1c2440')} />
    {isNight(v) && <circle cx={x + w * 0.7} cy={y + h * 0.3} r={Math.min(w, h) * 0.12} fill="#efe6c8" />}
    {Array.from({ length: bars }, (_, i) => (
      <rect
        key={i}
        x={x + ((i + 1) * w) / (bars + 1) - 3}
        y={y}
        width={6}
        height={h}
        fill={shade(frame, -0.25)}
      />
    ))}
    <rect x={x} y={y + h / 2 - 4} width={w} height={8} fill={shade(frame, -0.25)} />
  </Cutout>
);

/** Ceiling fan hanging from (x, y); blades turn. */
const CeilingFan: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const { t } = useShot();
  const a = (t * 420) % 360;
  // the fan seen nearly edge-on: three blades whose lengths swing as they turn
  return (
    <Cutout>
      <rect x={x - 4} y={y} width={8} height={120} fill="#4a4a4a" />
      <ellipse cx={x} cy={y + 130} rx={30} ry={16} fill="#6a6a6a" />
      {[0, 120, 240].map((k) => {
        const c = Math.cos(((a + k) * Math.PI) / 180);
        return (
          <ellipse key={k} cx={x + c * 120} cy={y + 132} rx={Math.abs(c) * 110 + 14} ry={8} fill="#7a7a72" />
        );
      })}
    </Cutout>
  );
};

/** Tube light on the wall, glowing at night. */
const TubeLight: React.FC<{ x: number; y: number; lit: number }> = ({ x, y, lit }) => {
  const { url } = useDefs();
  return (
    <>
      {lit > 0 && (
        <ellipse
          cx={x}
          cy={y + 120}
          rx={360}
          ry={260}
          fill="#e8f4ff"
          opacity={0.18 * lit}
          filter={url('glow')}
        />
      )}
      <Cutout>
        <rect x={x - 130} y={y - 6} width={260} height={18} rx={6} fill="#d8d4c8" />
        <rect x={x - 120} y={y} width={240} height={10} rx={5} fill={lit ? '#f4fbff' : '#e8e8e0'} />
      </Cutout>
    </>
  );
};

/** Panelled door; `n` paints a house number plate above it. */
const Door: React.FC<{
  x: number;
  base: number;
  w: number;
  h: number;
  fill: string;
  open?: number;
  plate?: string;
}> = ({ x, base, w, h, fill, open = 0, plate }) => (
  <Cutout>
    <rect x={x - w / 2 - 14} y={base - h - 14} width={w + 28} height={h + 14} fill={shade(fill, -0.25)} />
    <rect x={x - w / 2} y={base - h} width={w} height={h} fill={open ? '#1a1418' : fill} />
    {!open && (
      <>
        <rect
          x={x - w / 2 + 16}
          y={base - h + 20}
          width={w - 32}
          height={h * 0.38}
          fill={shade(fill, -0.08)}
        />
        <rect
          x={x - w / 2 + 16}
          y={base - h * 0.52}
          width={w - 32}
          height={h * 0.42}
          fill={shade(fill, -0.08)}
        />
        <circle cx={x + w / 2 - 22} cy={base - h * 0.48} r={7} fill="#c9a23a" />
      </>
    )}
    {open > 0 && <rect x={x - w / 2} y={base - h} width={w * 0.25} height={h} fill={fill} />}
    {plate && <rect x={x - 30} y={base - h - 56} width={60} height={30} fill="#e8e0cc" />}
  </Cutout>
);

/** Distant city skyline: blocks with windows (lit at night). */
const Skyline: React.FC<{ v: Record<string, any>; base: number }> = ({ v, base }) => {
  const view = useView();
  const night = isNight(v);
  const fill = dn(v, '#9aa6b0', '#232a40');
  return (
    <Cutout>
      {across(view.x0, view.x1, 130).map((x, i) => {
        const h = 220 + rnd(i * 3) * 380;
        const w = 100 + rnd(i + 5) * 40;
        return (
          <g key={x}>
            <rect x={x} y={base - h} width={w} height={h} fill={shade(fill, (i % 3) * 0.05)} />
            {across(base - h + 30, base - 40, 46).map((y, j) =>
              [0, 1, 2].map((k) => (
                <rect
                  key={`${j}-${k}`}
                  x={x + 14 + k * (w - 28) * 0.36}
                  y={y}
                  width={16}
                  height={22}
                  fill={
                    night && rnd(i * 31 + j * 7 + k) > 0.55 ? '#f2d27a' : shade(fill, night ? -0.2 : 0.12)
                  }
                />
              )),
            )}
          </g>
        );
      })}
    </Cutout>
  );
};

/* ------------------------------------------------------------------ chawl corridor */

const crimeChawl: SetDef = {
  id: 'crime_chawl_corridor',
  description:
    'Indian true crime/drama: the shared corridor of a Mumbai chawl — a row of numbered doors on a pastel wall, a clothesline of drying clothes overhead, steel buckets, tube lights glowing at night, a window to the street at one end.',
  palettes: ['crime'],
  params: TIME_PARAM,
  defaults: { time: 'night' },
  anchors: {
    corridor: [480, 1480],
    corridor_left: [260, 1480],
    corridor_right: [720, 1480],
    door_mid: [480, 1300],
  },
  elements: [],
  fx: crimeFx(FLOOR_Y),
  far: ({ v }) => {
    const view = useView();
    const wall = dn(v, '#9cc4b4', '#4a6460');
    return (
      <>
        <Room
          wall={wall}
          dado={dn(v, '#6c9a8a', '#344a48')}
          floor={dn(v, '#b0a090', '#4a4440')}
          tile={dn(v, '#8a7a6a', '#36302e')}
        />
        {across(view.x0 + 60, view.x1, 330).map((x, i) => (
          <Door
            key={x}
            x={x}
            base={FLOOR_Y}
            w={150}
            h={340}
            fill={['#6a4a7a', '#3a6a8a', '#8a5a3a', '#4a7a5a'][i % 4]}
            plate="n"
            open={i === 3 ? 1 : 0}
          />
        ))}
        <TubeLight x={300} y={640} lit={dn(v, 0, 1)} />
        <TubeLight x={1000} y={640} lit={dn(v, 0, 1)} />
      </>
    );
  },
  mid: () => {
    const view = useView();
    const { t } = useShot();
    const cols = ['#d4532b', '#f0c35a', '#3a6fd0', '#f6ead0', '#2a8a7a', '#b04a6a'];
    return (
      <>
        <path d={`M${view.x0} 650 Q 540 710 ${view.x1} 650`} fill="none" stroke="#3a3030" strokeWidth={3} />
        {across(view.x0 + 40, view.x1, 120).map((x, i) => {
          const y = 660 + 30 * (1 - ((x - 540) / (view.w / 2)) ** 2);
          const sway = 1.5 * Math.sin(t * 1.4 + i);
          return (
            <g key={x} transform={`translate(${x} ${y})`}>
              <Rot a={sway}>
                <Cutout>
                  {i % 3 === 0 ? (
                    <path d="M-40 0 L40 0 L44 120 L-44 120 Z" fill={cols[i % cols.length]} />
                  ) : i % 3 === 1 ? (
                    <path
                      d="M-50 0 L50 0 L50 30 L30 30 L30 110 L-30 110 L-30 30 L-50 30 Z"
                      fill={cols[i % cols.length]}
                    />
                  ) : (
                    <path d="M-30 0 L30 0 L36 160 L-36 160 Z" fill={cols[i % cols.length]} />
                  )}
                </Cutout>
              </Rot>
            </g>
          );
        })}
        <Cutout>
          {[180, 820].map((x) => (
            <g key={x}>
              <path d={`M${x - 40} 1290 L${x + 40} 1290 L${x + 32} 1380 L${x - 32} 1380 Z`} fill="#a8aab0" />
              <rect x={x - 42} y={1286} width={84} height={10} fill="#8a8c92" />
            </g>
          ))}
        </Cutout>
      </>
    );
  },
};

/* ------------------------------------------------------------------ bungalow */

const crimeBungalow: SetDef = {
  id: 'crime_bungalow',
  description:
    'Indian true crime/drama: an old colonial-era bungalow behind a compound wall — whitewashed walls, a red-tiled sloping roof, a pillared verandah, shuttered windows (lit at night), a gulmohar tree and a gravel driveway to stand on.',
  palettes: ['crime'],
  params: TIME_PARAM,
  defaults: { time: 'night' },
  anchors: {
    driveway: [480, 1480],
    driveway_left: [260, 1480],
    driveway_right: [720, 1480],
    verandah: [540, 1220],
  },
  elements: [],
  fx: crimeFx(1330),
  sky: ({ v }) => <CitySky v={v} moon={[140, 600]} />,
  far: ({ v }) => {
    const view = useView();
    return (
      <Cutout>
        <path d={hillPath(view.x0, view.x1, 1100, 30, 500, 3)} fill={dn(v, '#5e8a5a', '#1e2c2a')} />
      </Cutout>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const { url } = useDefs();
    const wall = dn(v, '#ece6d6', '#7a7a8a');
    const roof = dn(v, '#b04a32', '#5a2a2a');
    const lit = dn(v, 0, 1);
    return (
      <>
        <RoundTree
          x={-120}
          base={1250}
          h={560}
          r={240}
          fill={dn(v, '#c8442a', '#5a2a30')}
          bark={dn(v, '#5a3a2a', '#2a1a1a')}
          dot={dn(v, '#f0c35a', '#8a6a4a')}
          pattern="dots-cream"
        />
        <Cutout>
          <rect x={100} y={880} width={880} height={370} fill={wall} />
          <path d="M60 900 L540 700 L1020 900 Z" fill={roof} />
          <rect x={60} y={890} width={960} height={22} fill={shade(roof, -0.2)} />
          <rect x={160} y={1250} width={760} height={30} fill={dn(v, '#c8c0ae', '#5a5a6a')} />
          {[200, 360, 720, 880].map((x) => (
            <rect key={x} x={x - 18} y={960} width={36} height={290} fill={shade(wall, 0.04)} />
          ))}
          <rect x={160} y={940} width={760} height={24} fill={shade(wall, -0.1)} />
          {[280, 800].map((x) => (
            <g key={x}>
              <rect x={x - 50} y={1010} width={100} height={160} fill={lit ? '#f2c66a' : '#3a4048'} />
              <rect x={x - 66} y={1000} width={30} height={180} fill="#3a6a5a" />
              <rect x={x + 36} y={1000} width={30} height={180} fill="#3a6a5a" />
            </g>
          ))}
          <rect x={480} y={1020} width={120} height={230} fill={lit ? '#e8b85a' : '#4a3a2a'} />
        </Cutout>
        <path d="M60 900 L540 700 L1020 900 Z" fill={url('lines-ink')} opacity={0.12} />
        {lit > 0 && (
          <ellipse cx={540} cy={1140} rx={420} ry={160} fill="#ffcf6e" opacity={0.18} filter={url('glow')} />
        )}
        <Cutout>
          <rect
            x={view.x0}
            y={1300}
            width={view.w}
            height={BOTTOM - 1300}
            fill={dn(v, '#c8b490', '#4a4450')}
          />
          <path
            d={`M${view.x0} 1330 L${view.x1} 1330`}
            stroke={dn(v, '#a8946e', '#3a3442')}
            strokeWidth={6}
          />
        </Cutout>
        {/* compound wall with a gate gap in the middle */}
        <Cutout>
          <rect x={view.x0} y={1250} width={370 - view.x0} height={80} fill={dn(v, '#d8d0bc', '#6a6a78')} />
          <rect x={710} y={1250} width={view.x1 - 710} height={80} fill={dn(v, '#d8d0bc', '#6a6a78')} />
          <rect x={340} y={1180} width={40} height={150} fill={dn(v, '#c8c0aa', '#5a5a6a')} />
          <rect x={700} y={1180} width={40} height={150} fill={dn(v, '#c8c0aa', '#5a5a6a')} />
        </Cutout>
      </>
    );
  },
};

/* ------------------------------------------------------------------ haveli courtyard */

const crimeHaveli: SetDef = {
  id: 'crime_haveli_courtyard',
  description:
    'Indian drama/true crime: the inner courtyard of an old family haveli — faded ochre walls, a row of scalloped arches below a carved wooden balcony (jharokha), a heavy studded door, a tulsi planter in the middle of the stone floor. Lamps glow at night.',
  palettes: ['crime'],
  params: TIME_PARAM,
  defaults: { time: 'night' },
  anchors: {
    courtyard: [480, 1480],
    courtyard_left: [260, 1480],
    courtyard_right: [720, 1480],
    door: [880, 1300],
    tulsi: [540, 1360],
  },
  elements: [],
  fx: crimeFx(FLOOR_Y),
  sky: ({ v }) => <CitySky v={v} moon={[540, 300]} />,
  far: ({ v }) => {
    const view = useView();
    const { url } = useDefs();
    const wall = dn(v, '#d8a86a', '#5a4a52');
    const dark = shade(wall, -0.25);
    const arches = across(view.x0 + 40, view.x1, 260);
    const archD = (x: number) =>
      `M${x - 90} 1300 L${x - 90} 1080 Q${x - 90} 980 ${x} 960 Q${x + 90} 980 ${x + 90} 1080 L${x + 90} 1300 Z`;
    const wallD = `M${view.x0} 560 L${view.x1} 560 L${view.x1} 1300 L${view.x0} 1300 Z ${arches.map(archD).join(' ')}`;
    return (
      <>
        <Cutout>
          <path d={wallD} fill={wall} fillRule="evenodd" />
        </Cutout>
        {arches.map((x) => (
          <path key={x} d={archD(x)} fill={dn(v, '#5a3a2a', '#1a1216')} />
        ))}
        <path d={wallD} fill={url('lines-ink')} fillRule="evenodd" opacity={0.06} />
        {/* jharokha balcony running along the upper floor */}
        <Cutout>
          <rect x={view.x0} y={840} width={view.w} height={30} fill={dark} />
          {across(view.x0, view.x1, 60).map((x) => (
            <rect key={x} x={x} y={760} width={18} height={80} fill={dn(v, '#7a4a2a', '#3a2620')} />
          ))}
          <rect x={view.x0} y={740} width={view.w} height={24} fill={dn(v, '#7a4a2a', '#3a2620')} />
        </Cutout>
        <Cutout>
          <rect x={790} y={1010} width={180} height={290} fill="#5a3420" />
          {across(1030, 1280, 50).map((y) =>
            [820, 880, 940].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={6} fill="#c9a23a" />),
          )}
        </Cutout>
      </>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const { url } = useDefs();
    const { t } = useShot();
    const lit = dn(v, 0, 1);
    return (
      <>
        <Cutout>
          <rect
            x={view.x0}
            y={FLOOR_Y}
            width={view.w}
            height={BOTTOM - FLOOR_Y}
            fill={dn(v, '#c8b8a0', '#4a4450')}
          />
        </Cutout>
        {[1340, 1420, 1540, 1720].map((y) => (
          <rect key={y} x={view.x0} y={y} width={view.w} height={3} fill={dn(v, '#a8987e', '#36323e')} />
        ))}
        <Cutout>
          <rect x={470} y={1240} width={140} height={110} fill={dn(v, '#b04a32', '#5a2a2a')} />
          <rect x={460} y={1230} width={160} height={20} fill={dn(v, '#8a3a2a', '#4a2222')} />
          {[-40, -20, 0, 20, 40].map((dx, i) => (
            <path
              key={dx}
              d={`M${540 + dx} 1232 Q${540 + dx * 1.6} ${1180 - (i % 2) * 20} ${540 + dx * 2} ${1150 - (i % 3) * 16} Q${540 + dx * 1.2} 1190 ${540 + dx + 4} 1232 Z`}
              fill={dn(v, '#3f8a4a', '#1f4a3a')}
            />
          ))}
        </Cutout>
        {[120, 960].map((x, i) => (
          <g key={x}>
            {lit > 0 && (
              <circle
                cx={x}
                cy={1000}
                r={120}
                fill="#ffcf6e"
                opacity={0.3 * (0.9 + 0.1 * Math.sin(t * 8 + i))}
                filter={url('glow')}
              />
            )}
            <Cutout>
              <path d={`M${x - 20} 1010 L${x + 20} 1010 L${x + 12} 1040 L${x - 12} 1040 Z`} fill="#8a6a3a" />
              {lit > 0 && (
                <path d={`M${x} 980 Q${x - 8} 996 ${x} 1008 Q${x + 8} 996 ${x} 980 Z`} fill="#ffd27a" />
              )}
            </Cutout>
          </g>
        ))}
      </>
    );
  },
};

/* ------------------------------------------------------------------ city street */

const crimeCityStreet: SetDef = {
  id: 'crime_city_street',
  description:
    'Indian true crime/drama: a busy city street (Mumbai/Delhi) — a row of small shops with rolling shutters and plain coloured signboards, a tea stall awning, tangled overhead wires, a street lamp (lit at night), apartment blocks behind, a pavement to stand on.',
  palettes: ['crime'],
  params: TIME_PARAM,
  defaults: { time: 'night' },
  anchors: {
    pavement: [480, 1480],
    pavement_left: [260, 1480],
    pavement_right: [720, 1480],
    shop: [560, 1300],
    lamp: [960, 1320],
  },
  elements: [],
  fx: crimeFx(1320),
  sky: ({ v }) => <CitySky v={v} />,
  far: ({ v }) => <Skyline v={v} base={1000} />,
  mid: ({ v }) => {
    const view = useView();
    const { url } = useDefs();
    const lit = dn(v, 0, 1);
    const shops = across(view.x0 + 20, view.x1, 280);
    const signs = ['#c8442a', '#2a6a8a', '#e0a83a', '#3a7a4a', '#8a3a6a'];
    return (
      <>
        <Cutout>
          <rect x={view.x0} y={760} width={view.w} height={540} fill={dn(v, '#c8b490', '#4a4250')} />
          {across(view.x0, view.x1, 140).map((x, i) => (
            <rect
              key={x}
              x={x + 30}
              y={800}
              width={80}
              height={110}
              fill={lit && i % 3 !== 1 ? '#e8c06a' : dn(v, '#7a8a90', '#2a2a38')}
            />
          ))}
        </Cutout>
        {shops.map((x, i) => (
          <Cutout key={x}>
            <rect x={x} y={960} width={260} height={70} fill={signs[i % signs.length]} />
            <rect x={x + 30} y={985} width={200} height={10} fill="#f6ead0" opacity={0.7} />
            <rect x={x + 60} y={1005} width={140} height={8} fill="#f6ead0" opacity={0.5} />
            <rect
              x={x + 10}
              y={1040}
              width={240}
              height={260}
              fill={i % 2 ? dn(v, '#8a8c92', '#3a3c44') : lit ? '#f0c878' : '#5a4a3a'}
            />
            {i % 2 === 1 &&
              across(1050, 1290, 18).map((y) => (
                <rect key={y} x={x + 10} y={y} width={240} height={3} fill={dn(v, '#6a6c72', '#2a2c34')} />
              ))}
          </Cutout>
        ))}
        {/* tea stall awning */}
        <Cutout>
          <path d="M60 1040 L420 1040 L450 1100 L30 1100 Z" fill={dn(v, '#2a7a8a', '#1a4450')} />
        </Cutout>
        <path d="M60 1040 L420 1040 L450 1100 L30 1100 Z" fill={url('lines-cream')} opacity={0.3} />
        {/* overhead wires */}
        {[0, 1, 2].map((k) => (
          <path
            key={k}
            d={`M${view.x0} ${700 + k * 30} Q 540 ${780 + k * 40} ${view.x1} ${690 + k * 26}`}
            fill="none"
            stroke="#1a1a20"
            strokeWidth={3}
          />
        ))}
        <Cutout>
          <rect x={view.x0} y={1300} width={view.w} height={40} fill={dn(v, '#b8b0a0', '#4a4852')} />
          <rect
            x={view.x0}
            y={1340}
            width={view.w}
            height={BOTTOM - 1340}
            fill={dn(v, '#8a8a8a', '#2e2e36')}
          />
          {across(view.x0, view.x1, 220).map((x) => (
            <rect key={x} x={x} y={1600} width={120} height={14} fill={dn(v, '#e8e0cc', '#8a8a7a')} />
          ))}
        </Cutout>
        {/* street lamp */}
        {lit > 0 && (
          <ellipse cx={940} cy={1200} rx={260} ry={300} fill="#ffcf6e" opacity={0.22} filter={url('glow')} />
        )}
        <Cutout>
          <rect x={950} y={780} width={14} height={540} fill="#3a3a40" />
          <path d="M957 790 Q 957 760 900 760 L 900 770 Q 946 770 946 790 Z" fill="#3a3a40" />
          <path d="M870 760 L930 760 L922 780 L878 780 Z" fill={lit ? '#fff1b0' : '#c8c8b8'} />
        </Cutout>
      </>
    );
  },
};

/* ------------------------------------------------------------------ police station */

const crimePoliceStation: SetDef = {
  id: 'crime_police_station',
  description:
    'Indian true crime: a district police station (thana) — two-tone green-and-cream wall, a wooden desk piled with case files, a steel almirah, a notice board, a ceiling fan and tube light, a barred lockup on the right.',
  palettes: ['crime'],
  params: TIME_PARAM,
  defaults: { time: 'night' },
  anchors: { desk: [380, 1480], front: [480, 1480], lockup: [920, 1400], left: [200, 1480] },
  elements: [],
  fx: crimeFx(FLOOR_Y),
  sky: ({ v }) => <CitySky v={v} />,
  far: ({ v }) => (
    <>
      <Room
        wall={dn(v, '#e4dcc0', '#8a8670')}
        dado={dn(v, '#5a8a6a', '#2e4a3a')}
        floor={dn(v, '#9a8a78', '#3e3632')}
        tile={dn(v, '#7a6a5a', '#2a2420')}
      />
      <Window x={60} y={720} w={240} h={260} v={v} frame={dn(v, '#4a6a5a', '#2a3a32')} />
      <TubeLight x={560} y={640} lit={dn(v, 0, 1)} />
      <Cutout>
        <rect x={380} y={760} width={260} height={200} fill="#8a6a4a" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={400 + (i % 3) * 78}
            y={780 + Math.floor(i / 3) * 90}
            width={60}
            height={70}
            fill={['#f6ead0', '#e8d8a8', '#f0e0c8'][i % 3]}
            transform={`rotate(${i % 2 ? 3 : -2} ${430 + (i % 3) * 78} ${815 + Math.floor(i / 3) * 90})`}
          />
        ))}
        <rect x={700} y={900} width={200} height={400} fill="#6a7a80" />
        <rect x={798} y={910} width={4} height={380} fill="#4a5a60" />
        <circle cx={784} cy={1100} r={6} fill="#c9c9c9" />
      </Cutout>
    </>
  ),
  mid: () => {
    return (
      <>
        <CeilingFan x={420} y={380} />
        {/* lockup bars on the right */}
        <Cutout>
          <rect x={1000} y={700} width={600} height={30} fill="#3a3a40" />
          {across(1010, 1600, 46).map((x) => (
            <rect key={x} x={x} y={730} width={12} height={570} fill="#4a4a52" />
          ))}
          <rect x={1000} y={1000} width={600} height={14} fill="#3a3a40" />
        </Cutout>
        {/* desk with files */}
        <Cutout>
          <rect x={60} y={1250} width={440} height={30} fill="#7a4a2a" />
          <rect x={80} y={1280} width={30} height={170} fill="#5a3a20" />
          <rect x={450} y={1280} width={30} height={170} fill="#5a3a20" />
          <rect x={110} y={1290} width={340} height={80} fill="#6a4026" />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={120 + (i % 2) * 6}
              y={1236 - i * 16}
              width={150}
              height={14}
              fill={['#d8b878', '#c8a868', '#e0c890', '#b89858'][i]}
            />
          ))}
          <rect x={330} y={1222} width={100} height={28} fill="#2a2a2a" />
          <path d="M340 1222 Q 380 1190 420 1222" fill="none" stroke="#2a2a2a" strokeWidth={6} />
        </Cutout>
      </>
    );
  },
};

/* ------------------------------------------------------------------ courtroom */

const crimeCourtroom: SetDef = {
  id: 'crime_courtroom',
  description:
    "Indian true crime/drama: a district courtroom — dark wood panelling, the judge's raised bench in the middle under a wall clock, a witness box on the left, a wooden railing, ceiling fans, tall windows.",
  palettes: ['crime'],
  params: TIME_PARAM,
  defaults: { time: 'day' },
  anchors: {
    floor: [480, 1480],
    floor_left: [240, 1480],
    floor_right: [720, 1480],
    bench: [540, 1120],
    witness_box: [140, 1300],
  },
  elements: [],
  fx: crimeFx(FLOOR_Y),
  sky: ({ v }) => <CitySky v={v} />,
  far: ({ v }) => {
    const view = useView();
    const { t } = useShot();
    const wood = dn(v, '#7a4a2a', '#4a2a1a');
    return (
      <>
        <Room
          wall={dn(v, '#e8dcc0', '#7a7060')}
          dado={wood}
          floor={dn(v, '#a88a60', '#4a3a2a')}
          tile={dn(v, '#8a6a40', '#3a2a1a')}
          dadoTop={900}
        />
        {across(view.x0 + 40, view.x1, 360)
          .filter((x) => Math.abs(x - 540) > 300)
          .map((x) => (
            <Window
              key={x}
              x={x - 70}
              y={520}
              w={140}
              h={300}
              v={v}
              frame={dn(v, '#6a4a2a', '#3a2a1a')}
              bars={2}
            />
          ))}
        <Cutout>
          {across(view.x0, view.x1, 90).map((x) => (
            <rect key={x} x={x + 8} y={920} width={74} height={360} fill={shade(wood, 0.06)} />
          ))}
        </Cutout>
        {/* wall clock */}
        <Cutout>
          <circle cx={540} cy={620} r={70} fill="#f6ead0" />
          <circle cx={540} cy={620} r={70} fill="none" stroke={wood} strokeWidth={12} />
          <g transform="translate(540 620)">
            <Rot a={(t * 6) % 360}>
              <rect x={-2} y={-56} width={4} height={56} fill="#2a1a10" />
            </Rot>
            <rect x={-3} y={-36} width={6} height={36} fill="#2a1a10" transform="rotate(120)" />
          </g>
        </Cutout>
      </>
    );
  },
  mid: ({ v }) => {
    const wood = dn(v, '#6a3a1e', '#3e2214');
    return (
      <>
        <CeilingFan x={180} y={340} />
        <CeilingFan x={900} y={340} />
        <Cutout>
          {/* judge's bench */}
          <rect x={300} y={1000} width={480} height={300} fill={wood} />
          <rect x={280} y={980} width={520} height={30} fill={shade(wood, -0.15)} />
          <rect x={460} y={760} width={160} height={230} fill="#8a2a2a" />
          <rect x={448} y={748} width={184} height={24} fill={shade(wood, -0.1)} />
          {[340, 460, 580, 700].map((x) => (
            <rect key={x} x={x} y={1040} width={80} height={220} fill={shade(wood, 0.08)} />
          ))}
          {/* witness box */}
          <rect x={20} y={1150} width={240} height={150} fill={wood} />
          <rect x={10} y={1136} width={260} height={20} fill={shade(wood, -0.15)} />
          {/* railing */}
          <rect x={-400} y={1240} width={1900} height={16} fill={shade(wood, -0.1)} />
          {across(-400, 1500, 60).map((x) => (
            <rect key={x} x={x} y={1256} width={12} height={60} fill={shade(wood, -0.05)} />
          ))}
        </Cutout>
      </>
    );
  },
};

/* ------------------------------------------------------------------ newsroom */

const crimeNewsroom: SetDef = {
  id: 'crime_newsroom',
  description:
    'Indian true crime/drama: a newspaper newsroom — rows of desks with old monitors and typewriters, stacks of newspapers, a wall clock, pinned front pages on a board, windows onto the city (lit skyline at night).',
  palettes: ['crime'],
  params: TIME_PARAM,
  defaults: { time: 'night' },
  anchors: { desk: [480, 1480], desk_left: [240, 1480], desk_right: [720, 1480], board: [300, 1300] },
  elements: [],
  fx: crimeFx(FLOOR_Y),
  sky: ({ v }) => <CitySky v={v} />,
  far: ({ v }) => (
    <>
      <Skyline v={v} base={1100} />
      <Room
        wall={dn(v, '#d8d4c8', '#5a5a66')}
        dado={dn(v, '#a8a49a', '#44444e')}
        floor={dn(v, '#7a7a80', '#2e2e36')}
      />
      {[600, 900, 1200].map((x) => (
        <Window
          key={x}
          x={x - 120}
          y={560}
          w={240}
          h={380}
          v={v}
          frame={dn(v, '#5a5a62', '#2a2a32')}
          bars={1}
        />
      ))}
      <Cutout>
        <rect x={60} y={620} width={380} height={300} fill="#8a6a4a" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <rect
              x={80 + (i % 3) * 120}
              y={640 + Math.floor(i / 3) * 140}
              width={100}
              height={124}
              fill="#efe8d8"
            />
            <rect
              x={88 + (i % 3) * 120}
              y={650 + Math.floor(i / 3) * 140}
              width={84}
              height={14}
              fill="#2a2a2a"
            />
            {[0, 1, 2, 3].map((k) => (
              <rect
                key={k}
                x={88 + (i % 3) * 120}
                y={672 + k * 12 + Math.floor(i / 3) * 140}
                width={84}
                height={5}
                fill="#9a9a9a"
              />
            ))}
          </g>
        ))}
      </Cutout>
      <TubeLight x={300} y={540} lit={dn(v, 0, 1)} />
    </>
  ),
  mid: ({ v }) => {
    const view = useView();
    const lit = dn(v, 0, 1);
    return (
      <Cutout>
        {across(view.x0 + 60, view.x1, 420).map((x, i) => (
          <g key={x}>
            <rect x={x} y={1200} width={340} height={24} fill="#6a5a4a" />
            <rect x={x + 20} y={1224} width={20} height={120} fill="#4a3a2a" />
            <rect x={x + 300} y={1224} width={20} height={120} fill="#4a3a2a" />
            <rect x={x + 40} y={1090} width={130} height={110} fill="#d8d0b8" />
            <rect x={x + 54} y={1102} width={102} height={78} fill={lit ? '#7ad0a0' : '#4a6a5a'} />
            <rect x={x + 200} y={1170} width={110} height={30} fill="#3a3a3a" />
            {[0, 1, 2].map((k) => (
              <rect
                key={k}
                x={x + 196 + k * 3}
                y={1150 - k * 10}
                width={110}
                height={10}
                fill={['#efe8d8', '#e0d8c4', '#f4eedf'][k]}
              />
            ))}
            {i % 2 === 0 && <rect x={x + 180} y={1100} width={8} height={50} fill="#2a2a2a" />}
          </g>
        ))}
      </Cutout>
    );
  },
};

/* ------------------------------------------------------------------ village road */

const crimeVillageRoad: SetDef = {
  id: 'crime_village_road',
  description:
    'Indian true crime/drama: a lonely village road — a dusty road running into flat fields, a white-and-yellow milestone, a lone neem tree, a roadside tea stall with a bench, electric poles receding into the distance. Moonlit at night.',
  palettes: ['crime'],
  params: TIME_PARAM,
  defaults: { time: 'night' },
  anchors: {
    road: [480, 1480],
    road_left: [260, 1480],
    road_right: [720, 1480],
    stall: [880, 1300],
    milestone: [200, 1320],
  },
  elements: [],
  fx: crimeFx(1320),
  sky: ({ v }) => <CitySky v={v} moon={[220, 620]} />,
  far: ({ v }) => {
    const view = useView();
    return (
      <>
        <Cutout>
          <path d={hillPath(view.x0, view.x1, 1150, 14, 700, 5)} fill={dn(v, '#8aa05a', '#2a3428')} />
        </Cutout>
        <Cutout>
          {[-300, -40, 220, 1240, 1450].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={1150 - 110 + i * 6}
              width={8}
              height={120}
              fill={dn(v, '#5a5a5a', '#22242a')}
            />
          ))}
        </Cutout>
        <path
          d={`M${view.x0} 1050 Q 0 1070 220 1050 Q 700 1080 1240 1055 Q 1400 1070 ${view.x1} 1060`}
          fill="none"
          stroke={dn(v, '#3a3a3a', '#141418')}
          strokeWidth={2}
        />
      </>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const { url } = useDefs();
    const lit = dn(v, 0, 1);
    return (
      <>
        <Cutout>
          <rect
            x={view.x0}
            y={1160}
            width={view.w}
            height={BOTTOM - 1160}
            fill={dn(v, '#b8a060', '#3a3a30')}
          />
          <path
            d={`M470 1160 L610 1160 L${1100} ${BOTTOM} L${-20} ${BOTTOM} Z`}
            fill={dn(v, '#d0b080', '#4e4a48')}
          />
        </Cutout>
        <RoundTree
          x={-60}
          base={1300}
          h={520}
          r={210}
          fill={dn(v, '#4a7a3a', '#1e3026')}
          bark={dn(v, '#5a4030', '#20181a')}
          dot={dn(v, '#c8d8a0', '#4a5a4a')}
          pattern="dots-cream"
        />
        {/* milestone */}
        <Cutout>
          <path d="M160 1340 L160 1240 Q 200 1200 240 1240 L240 1340 Z" fill="#f2efe6" />
          <path d="M160 1260 Q 200 1218 240 1260 L240 1250 Q 200 1206 160 1250 Z" fill="#e8b830" />
          <rect x={160} y={1240} width={80} height={22} fill="#e8b830" />
        </Cutout>
        {/* tea stall */}
        {lit > 0 && (
          <ellipse cx={880} cy={1200} rx={220} ry={160} fill="#ffcf6e" opacity={0.22} filter={url('glow')} />
        )}
        <Cutout>
          <path d="M720 1080 L1060 1080 L1080 1120 L700 1120 Z" fill={dn(v, '#2a6a7a', '#1a3a44')} />
          <rect x={730} y={1120} width={10} height={180} fill="#4a3a2a" />
          <rect x={1040} y={1120} width={10} height={180} fill="#4a3a2a" />
          <rect x={760} y={1200} width={260} height={100} fill="#7a5a3a" />
          <rect x={800} y={1170} width={40} height={30} fill="#9a9a9a" />
          <rect x={980} y={1260} width={160} height={14} fill="#5a4030" />
          {lit > 0 && <circle cx={890} cy={1140} r={12} fill="#fff1b0" />}
        </Cutout>
      </>
    );
  },
};

export const CRIME: SetDef[] = [
  crimeChawl,
  crimeBungalow,
  crimeHaveli,
  crimeCityStreet,
  crimePoliceStation,
  crimeCourtroom,
  crimeNewsroom,
  crimeVillageRoad,
].map((d) => ({
  ...d,
  pack: 'crime',
  style: 'diorama' as const,
  variants: VARIANTS,
}));
