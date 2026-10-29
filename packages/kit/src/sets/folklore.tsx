// Indian folklore pack — sets in the diorama house style (layered flat paper, jewel palette) with the
// folk-pattern skin (Gond dots and lines, Madhubani bands). Fully code-drawn. Every set takes
// `time: day | dusk | night`, which swaps the whole palette (see folkWorld.tsx).
import React from 'react';
import { useDefs } from '../core/Filters';
import { Cutout, Gond, Patterned, Rot, scallopPath } from '../core/Ink';
import { useView } from '../core/format';
import { seededRandom as rnd } from '../core/math';
import { useShot } from '../core/ShotContext';
import { Fern, GrassClump } from '../props/folk';
import {
  across,
  Diya,
  folkPal,
  FolkPine,
  FolkSky,
  FOLK_TIMES,
  Hills,
  hillPath,
  Hut,
  JEWEL,
  Mountains,
  Palm,
  RoundTree,
  Shikhara,
  Treeline,
  type FolkTime,
} from './folkWorld';
import { BG_H, BG_Y, type SetDef } from './types';

export { JEWEL } from './folkWorld';

const TIME_PARAM = { time: 'day | dusk | night (default dusk)', moon: 'false hides the sun/moon (e.g. it was stolen)' };

/** Fireflies only make sense after sunset; dust motes by day. */
const folkFx = (groundY: number) => (v: { left: number; right: number; top: number; bottom: number }) => ({
  fireflies: { x: v.left + 80, y: 950, w: v.right - v.left - 160, h: 520 },
  dust: { x: v.left + 80, y: 900, w: v.right - v.left - 160, h: 500 },
  groundY,
});

/** Grass, cattails and ferns framing the bottom corners. */
const FolkCorners: React.FC<{ time: FolkTime }> = ({ time }) => {
  const v = useView(0);
  const b = v.bottom + 30;
  const pal = folkPal({ time });
  return (
    <>
      <g transform={`translate(${v.left + 70} ${b})`}>
        <GrassClump flip={false} seed={1} />
        <Fern x={60} angle={-12} len={420} color={pal.canopy[1]} />
        <Fern x={150} angle={14} len={340} color={pal.canopy[0]} />
      </g>
      <g transform={`translate(${v.right - 70} ${b})`}>
        <GrassClump flip seed={2} />
        <Fern x={-70} angle={10} len={400} color={pal.canopy[2]} />
        <Fern x={-170} angle={-16} len={330} color={JEWEL.vermilion} />
      </g>
    </>
  );
};

/** Two-band ground (near and far) the actors stand on. */
const Ground: React.FC<{ time: FolkTime; y?: number; fill?: string; dark?: string; pattern?: string }> = ({
  time,
  y = 1320,
  fill,
  dark,
  pattern = 'dots-cream',
}) => {
  const v = useView();
  const pal = folkPal({ time });
  return (
    <>
      <Cutout>
        <Patterned
          d={hillPath(v.x0, v.x1, y, 12, 600, 2)}
          fill={fill ?? pal.ground}
          pattern={pattern}
          opacity={0.08}
        />
      </Cutout>
      <Cutout>
        <Patterned
          d={hillPath(v.x0, v.x1, 1640, 18, 480, 7)}
          fill={dark ?? pal.groundDark}
          pattern="lines-cream"
          opacity={0.1}
        />
      </Cutout>
    </>
  );
};

const Bushes: React.FC<{ time: FolkTime; y: number; seed?: number }> = ({ time, y, seed = 0 }) => {
  const v = useView();
  const pal = folkPal({ time });
  return (
    <Cutout>
      {across(v.x0, v.x1, 150).map((x, i) => (
        <path
          key={x}
          d={scallopPath(
            x + rnd(i + 2 + seed) * 60,
            y,
            90 + rnd(i + seed) * 50,
            55 + rnd(i + 4) * 30,
            7,
            0.12,
            i,
          )}
          fill={pal.bush[(i + seed) % 4]}
        />
      ))}
    </Cutout>
  );
};

/* ------------------------------------------------------------------ jungle */

/** The banyan: patterned trunk, hanging aerial roots, layered canopy. Drawn around trunk base (bx, by). */
const Banyan: React.FC<{ bx: number; by: number; time: FolkTime }> = ({ bx, by, time }) => {
  const pal = folkPal({ time });
  const trunk = `M${bx - 120} ${by} C${bx - 60} ${by - 120} ${bx - 70} ${by - 380} ${bx - 40} ${by - 620} C${bx - 120} ${by - 700} ${bx - 260} ${by - 760} ${bx - 360} ${by - 800} L${bx - 340} ${by - 840} C${bx - 220} ${by - 810} ${bx - 90} ${by - 760} ${bx - 10} ${by - 700} C${bx + 30} ${by - 790} ${bx + 120} ${by - 860} ${bx + 260} ${by - 900} L${bx + 270} ${by - 860} C${bx + 150} ${by - 800} ${bx + 70} ${by - 720} ${bx + 60} ${by - 600} C${bx + 70} ${by - 380} ${bx + 90} ${by - 120} ${bx + 170} ${by} Z`;
  const inner = `M${bx - 30} ${by} C${bx - 10} ${by - 200} ${bx - 20} ${by - 420} ${bx + 5} ${by - 600} L${bx + 30} ${by - 600} C${bx + 25} ${by - 420} ${bx + 40} ${by - 200} ${bx + 70} ${by} Z`;
  const roots = [-300, -250, -190, -140, 130, 180, 230].map((dx, i) => ({
    x: bx + dx,
    top: by - 780 + (i % 3) * 30,
    len: 260 + rnd(i + 40) * 260,
    c: i % 2 ? JEWEL.vermilion : pal.canopy[0],
  }));
  const c = pal.canopy;
  const blobs: [number, number, number, string, string][] = [
    [bx - 330, by - 900, 150, c[0], 'dots-cream'],
    [bx + 260, by - 960, 180, c[0], 'dots-cream'],
    [bx - 150, by - 1000, 190, c[1], 'dots-gold'],
    [bx + 90, by - 1060, 200, c[2], 'dots-cream'],
    [bx - 400, by - 1060, 140, c[3], 'lines-gold'],
    [bx + 380, by - 1100, 160, c[1], 'dots-gold'],
    [bx - 60, by - 1160, 170, c[3], 'lines-cream'],
  ];
  return (
    <>
      {blobs.map(([x, y, r, col, pat], i) => (
        <Cutout key={i}>
          <Gond
            d={scallopPath(x, y, r, r * 0.8, 8 + (i % 3), 0.18, i)}
            fill={col}
            cx={x}
            cy={y}
            pattern={pat}
            patternOpacity={0.3}
            dot={i % 2 ? JEWEL.gold : JEWEL.cream}
          />
        </Cutout>
      ))}
      <Cutout>
        {roots.map((r, i) => (
          <path
            key={i}
            d={`M${r.x - 7} ${r.top} Q${r.x + 10} ${r.top + r.len / 2} ${r.x - 3} ${r.top + r.len} L${r.x + 7} ${r.top + r.len} Q${r.x + 22} ${r.top + r.len / 2} ${r.x + 7} ${r.top} Z`}
            fill={r.c}
          />
        ))}
      </Cutout>
      <Cutout>
        <Patterned d={trunk} fill={pal.bark} pattern="lines-gold" opacity={0.35} />
        <Patterned d={inner} fill={JEWEL.vermilion} pattern="dots-cream" opacity={0.6} />
        <rect x={bx - 95} y={by - 330} width={235} height={46} fill={JEWEL.gold} />
      </Cutout>
      <BandPattern x={bx - 95} y={by - 330} w={235} h={46} />
    </>
  );
};

/** A Madhubani zigzag band laid over a strip. */
const BandPattern: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => {
  const { url } = useDefs();
  return (
    <>
      <rect x={x} y={y + 6} width={w} height={h - 12} fill={url('zigzag-ink')} opacity={0.8} />
      <rect x={x} y={y + 2} width={w} height={4} fill={JEWEL.vermilion} />
      <rect x={x} y={y + h - 6} width={w} height={4} fill={JEWEL.vermilion} />
    </>
  );
};

const folkJungle: SetDef = {
  id: 'folk_jungle',
  description:
    'Indian folklore: a jungle clearing — jewel sky (sun, crescent or full moon by time), layered patterned hills, a far treeline, an ochre clearing to stand in, a great patterned banyan on the right, ferns and grass framing the bottom.',
  palettes: ['folk'],
  params: TIME_PARAM,
  defaults: { time: 'dusk' },
  anchors: {
    clearing: [480, 1480],
    clearing_left: [280, 1480],
    clearing_right: [680, 1480],
    banyan: [900, 1330],
  },
  elements: [],
  fx: folkFx(1330),
  sky: ({ v }) => <FolkSky time={v.time} hidden={v.moon === false} />,
  far: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Hills
          y={1060}
          amp={45}
          period={520}
          seed={1}
          fill={pal.hillFar}
          pattern="lines-cream"
          opacity={0.12}
        />
        <Hills
          y={1130}
          amp={38}
          period={420}
          seed={4}
          fill={pal.hillNear}
          pattern="dots-gold"
          opacity={0.28}
        />
        <Treeline base={1250} colors={pal.treeFar} />
      </>
    );
  },
  mid: ({ v }) => (
    <>
      <Bushes time={v.time} y={1300} />
      <Ground time={v.time} />
      <Banyan bx={930} by={1340} time={v.time} />
    </>
  ),
  fg: ({ v }) => <FolkCorners time={v.time} />,
};

/* ------------------------------------------------------------------ village */

/** Stone well with a wooden frame and a pot on the rim. Base left-centre (x, base). */
const Well: React.FC<{ x: number; base: number; time: FolkTime }> = ({ x, base, time }) => {
  const pal = folkPal({ time });
  return (
    <Cutout>
      <rect x={x - 8} y={base - 230} width={14} height={160} fill={pal.bark} />
      <rect x={x + 104} y={base - 230} width={14} height={160} fill={pal.bark} />
      <rect x={x - 20} y={base - 244} width={150} height={18} fill={pal.bark} />
      <rect x={x + 56} y={base - 226} width={3} height={90} fill={pal.bark} />
      <path
        d={`M${x + 42} ${base - 136} L${x + 74} ${base - 136} L${x + 70} ${base - 108} L${x + 46} ${base - 108} Z`}
        fill={pal.roof}
      />
      <Gond
        d={`M${x - 30} ${base} L${x - 30} ${base - 96} Q${x + 55} ${base - 116} ${x + 140} ${base - 96} L${x + 140} ${base} Z`}
        fill={pal.stone}
        dot={pal.stoneDark}
        cx={x + 55}
        cy={base - 50}
        inset={0.84}
        gap={14}
        size={5}
      />
      <path
        d={`M${x - 36} ${base - 96} Q${x + 55} ${base - 122} ${x + 146} ${base - 96} L${x + 146} ${base - 82} Q${x + 55} ${base - 106} ${x - 36} ${base - 82} Z`}
        fill={pal.stoneDark}
      />
      <circle cx={x + 120} cy={base - 112} r={20} fill={JEWEL.ochreDark} />
      <rect x={x + 110} y={base - 136} width={20} height={10} fill={JEWEL.ochreDark} />
    </Cutout>
  );
};

/** Rangoli on the ground: concentric petal rings, seen in perspective. Centre (x, y). */
const Rangoli: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <g transform={`translate(${x} ${y}) scale(1 0.32)`}>
    {[1, 0.72, 0.44].map((k, j) => (
      <path
        key={j}
        d={scallopPath(0, 0, r * k, r * k, 10, 0.25, j * 0.3)}
        fill={[JEWEL.vermilion, JEWEL.gold, JEWEL.peacock][j]}
      />
    ))}
    <circle r={r * 0.18} fill={JEWEL.cream} />
    {Array.from({ length: 12 }, (_, i) => (
      <circle
        key={i}
        cx={r * 1.15 * Math.cos((i / 12) * Math.PI * 2)}
        cy={r * 1.15 * Math.sin((i / 12) * Math.PI * 2)}
        r={10}
        fill={JEWEL.cream}
      />
    ))}
  </g>
);

const folkVillage: SetDef = {
  id: 'folk_village',
  description:
    'Indian folklore: a village courtyard — thatched mud huts with Madhubani bands (doors glow after dark), a stone well with a pot, a rangoli on the beaten-earth ground, palms and a treeline behind.',
  palettes: ['folk'],
  params: TIME_PARAM,
  defaults: { time: 'day' },
  anchors: {
    courtyard: [480, 1480],
    courtyard_left: [260, 1480],
    courtyard_right: [720, 1480],
    well: [540, 1360],
    hut_door: [930, 1320],
  },
  elements: [],
  fx: folkFx(1330),
  sky: ({ v }) => <FolkSky time={v.time} hidden={v.moon === false} body={[220, 700]} />,
  far: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Hills y={1080} amp={40} period={560} seed={3} fill={pal.hillFar} />
        <Treeline base={1210} colors={pal.treeFar} seed={4} />
        <Hut
          x={-260}
          base={1240}
          w={180}
          h={120}
          wall={pal.wallDark}
          wallDark={pal.roof}
          roof={pal.roof}
          lit={pal.lit}
        />
        <Hut
          x={1340}
          base={1240}
          w={180}
          h={120}
          wall={pal.wallDark}
          wallDark={pal.roof}
          roof={pal.roof}
          lit={pal.lit}
          flip
        />
      </>
    );
  },
  mid: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Palm x={-120} base={1320} h={560} fill={pal.canopy[2]} bark={pal.bark} lean={40} />
        <Palm x={1220} base={1320} h={520} fill={pal.canopy[1]} bark={pal.bark} lean={-50} />
        <Ground time={v.time} />
        <Hut
          x={150}
          base={1330}
          w={270}
          h={210}
          wall={pal.wall}
          wallDark={pal.wallDark}
          roof={pal.roof}
          lit={pal.lit}
        />
        <Hut
          x={880}
          base={1320}
          w={300}
          h={230}
          wall={pal.wall}
          wallDark={pal.wallDark}
          roof={pal.roof}
          lit={pal.lit}
          flip
        />
        <Well x={480} base={1360} time={v.time} />
        <Rangoli x={480} y={1700} r={170} />
      </>
    );
  },
  fg: ({ v }) => <FolkCorners time={v.time} />,
};

/* ------------------------------------------------------------------ river ghat */

/** Paper boat with a cane canopy, rocking on the water. Base centre (x, y). */
const Boat: React.FC<{ x: number; y: number; s: number; fill: string; canopy: string; rock: number }> = ({
  x,
  y,
  s,
  fill,
  canopy,
  rock,
}) => (
  <g transform={`translate(${x} ${y})`}>
    <Rot a={rock}>
      <g transform={`scale(${s})`}>
        <Cutout>
          <path
            d="M-70 -50 Q-40 -60 -20 -60 L20 -60 Q40 -60 70 -50 Q60 -76 0 -80 Q-60 -76 -70 -50 Z"
            fill={canopy}
          />
          <path d="M-160 -40 Q-130 0 0 0 Q130 0 160 -40 Q80 -26 0 -26 Q-80 -26 -160 -40 Z" fill={fill} />
          <rect x={-6} y={-60} width={6} height={36} fill={fill} />
        </Cutout>
      </g>
    </Rot>
  </g>
);

/** Small domed pavilion (chhatri) on four pillars. Base centre (x, base). */
const Chhatri: React.FC<{ x: number; base: number; w: number; fill: string; dark: string }> = ({
  x,
  base,
  w,
  fill,
  dark,
}) => {
  const h = w * 1.1;
  return (
    <Cutout>
      <rect x={x - w / 2 - 14} y={base - 30} width={w + 28} height={30} fill={dark} />
      {[-0.42, -0.14, 0.14, 0.42].map((k) => (
        <rect key={k} x={x + k * w - 9} y={base - h * 0.62} width={18} height={h * 0.62 - 30} fill={fill} />
      ))}
      <rect x={x - w / 2 - 20} y={base - h * 0.68} width={w + 40} height={22} fill={dark} />
      <path
        d={`M${x - w / 2} ${base - h * 0.68} Q${x - w / 2} ${base - h * 1.05} ${x} ${base - h * 1.1} Q${x + w / 2} ${base - h * 1.05} ${x + w / 2} ${base - h * 0.68} Z`}
        fill={fill}
      />
      <path
        d={`M${x - 8} ${base - h * 1.1} Q${x} ${base - h * 1.22} ${x + 8} ${base - h * 1.1} Z`}
        fill={JEWEL.gold}
      />
    </Cutout>
  );
};

const folkRiverGhat: SetDef = {
  id: 'folk_river_ghat',
  description:
    'Indian folklore: stone steps (ghat) down to a wide river — far bank with hills and treeline, boats rocking on the water, a small temple spire on the left, a domed chhatri on the right; floating diyas glow at dusk and night, the sun or moon reflects in the water.',
  palettes: ['folk'],
  params: TIME_PARAM,
  defaults: { time: 'dusk' },
  anchors: { steps: [480, 1480], steps_left: [280, 1480], steps_right: [700, 1480], water_edge: [480, 1330] },
  elements: [],
  fx: folkFx(1440),
  sky: ({ v }) => <FolkSky time={v.time} hidden={v.moon === false} body={[760, 640]} />,
  far: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Hills y={1010} amp={36} period={600} seed={5} fill={pal.hillFar} />
        <Treeline base={1090} colors={pal.treeFar} seed={8} step={110} />
      </>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const { t } = useShot();
    const pal = folkPal(v);
    const rows = across(1120, 1300, 26);
    return (
      <>
        {/* river with drifting ripples */}
        <rect x={view.x0} y={1090} width={view.w} height={300} fill={pal.water} />
        {rows.map((y, j) =>
          across(view.x0, view.x1, 140).map((x, i) => (
            <rect
              key={`${j}-${x}`}
              x={x + ((j * 53 + t * 14 * (j % 2 ? 1 : -1)) % 140)}
              y={y}
              width={40 + rnd(i + j * 9) * 50}
              height={5}
              rx={2.5}
              fill={pal.waterLight}
              opacity={0.35}
            />
          )),
        )}
        {/* the sun's or moon's path on the water */}
        <g opacity={v.time === 'day' ? 0.35 : 0.7}>
          {rows.map((y, j) => (
            <rect
              key={y}
              x={760 - 70 + (j % 2) * 20 - j * 3}
              y={y + 8}
              width={110 - j * 4}
              height={8}
              rx={4}
              fill={pal.waterLight}
            />
          ))}
        </g>
        <Boat
          x={200}
          y={1210}
          s={0.8}
          fill={JEWEL.vermilion}
          canopy={pal.roof}
          rock={2 * Math.sin(t * 1.6)}
        />
        <Boat
          x={1180}
          y={1170}
          s={0.6}
          fill={JEWEL.peacock}
          canopy={JEWEL.ochreDark}
          rock={2 * Math.sin(t * 1.3 + 1)}
        />
        {pal.lit > 0 &&
          [80, 330, 560, 690, 920, -200, 1300].map((x, i) => (
            <Diya
              key={x}
              x={x + 20 * Math.sin(t * 0.5 + i)}
              y={1150 + (i % 3) * 50}
              s={0.7}
              lit={pal.lit}
              flicker={0.85 + 0.15 * Math.sin(t * 9 + i)}
            />
          ))}
        {/* steps */}
        {[0, 1, 2, 3, 4].map((k) => (
          <Cutout key={k}>
            <rect
              x={view.x0}
              y={1330 + k * 26}
              width={view.w}
              height={30}
              fill={k % 2 ? pal.stoneDark : pal.stone}
            />
          </Cutout>
        ))}
        <Cutout>
          <Patterned
            d={`M${view.x0} 1458 L${view.x1} 1458 L${view.x1} ${BG_Y + BG_H} L${view.x0} ${BG_Y + BG_H} Z`}
            fill={pal.stone}
            pattern="lines-ink"
            opacity={0.07}
          />
        </Cutout>
        <Shikhara x={60} base={1340} w={210} h={480} fill={pal.wall} dark={pal.wallDark} />
        <Chhatri x={960} base={1350} w={230} fill={pal.stone} dark={pal.stoneDark} />
        {pal.lit > 0 &&
          [380, 560, 760].map((x) => (
            <Diya key={x} x={x} y={1462} s={0.8} lit={pal.lit} flicker={0.85 + 0.15 * Math.sin(t * 8 + x)} />
          ))}
      </>
    );
  },
};

/* ------------------------------------------------------------------ temple courtyard */

/** Pillared porch (mandapa) with a flat patterned roof and a hanging bell. Base centre (x, base). */
const Mandapa: React.FC<{ x: number; base: number; w: number; h: number; fill: string; dark: string }> = ({
  x,
  base,
  w,
  h,
  fill,
  dark,
}) => {
  const { t } = useShot();
  const swing = 3 * Math.sin(t * 2);
  return (
    <>
      <Cutout>
        <rect x={x - w / 2 - 20} y={base - 34} width={w + 40} height={34} fill={dark} />
        {[-0.45, -0.15, 0.15, 0.45].map((k) => (
          <React.Fragment key={k}>
            <rect x={x + k * w - 16} y={base - h} width={32} height={h - 34} fill={fill} />
            <rect x={x + k * w - 24} y={base - h} width={48} height={20} fill={dark} />
            <rect x={x + k * w - 24} y={base - 58} width={48} height={24} fill={dark} />
          </React.Fragment>
        ))}
        <Patterned
          d={`M${x - w / 2 - 50} ${base - h - 50} L${x + w / 2 + 50} ${base - h - 50} L${x + w / 2 + 30} ${base - h} L${x - w / 2 - 30} ${base - h} Z`}
          fill={fill}
          pattern="zigzag-ink"
          opacity={0.3}
        />
        <rect x={x - w / 2 - 60} y={base - h - 70} width={w + 120} height={22} fill={dark} />
      </Cutout>
      <g transform={`translate(${x} ${base - h})`}>
        <Rot a={swing}>
          <Cutout>
            <rect x={-2} y={0} width={4} height={60} fill={dark} />
            <path d="M-26 100 Q-24 60 0 56 Q24 60 26 100 Z" fill={JEWEL.gold} />
            <circle cx={0} cy={104} r={7} fill={JEWEL.ochreDark} />
          </Cutout>
        </Rot>
      </g>
    </>
  );
};

const folkTemple: SetDef = {
  id: 'folk_temple_courtyard',
  description:
    'Indian folklore: a village temple courtyard — a tall banded shikhara spire with a pennant, a pillared mandapa porch with a swinging bell, a sacred peepal tree on a platform tied with red threads, flagstone floor, diyas lit after dark.',
  palettes: ['folk'],
  params: TIME_PARAM,
  defaults: { time: 'dusk' },
  anchors: {
    courtyard: [480, 1480],
    courtyard_left: [260, 1480],
    courtyard_right: [720, 1480],
    porch: [760, 1360],
    tree: [110, 1400],
  },
  elements: [],
  fx: folkFx(1360),
  sky: ({ v }) => <FolkSky time={v.time} hidden={v.moon === false} body={[200, 640]} />,
  far: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Hills y={1100} amp={36} period={560} seed={9} fill={pal.hillFar} />
        <Treeline base={1230} colors={pal.treeFar} seed={11} palms={false} />
      </>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const { t } = useShot();
    const pal = folkPal(v);
    return (
      <>
        <Shikhara x={760} base={1240} w={380} h={820} fill={pal.wall} dark={pal.wallDark} />
        <Cutout>
          <rect x={view.x0} y={1240} width={view.w} height={40} fill={pal.wallDark} />
          <Patterned
            d={`M${view.x0} 1270 L${view.x1} 1270 L${view.x1} ${BG_Y + BG_H} L${view.x0} ${BG_Y + BG_H} Z`}
            fill={pal.stone}
            pattern="lines-ink"
            opacity={0.09}
          />
        </Cutout>
        {across(1300, 1900, 90).map((y, j) => (
          <rect
            key={y}
            x={view.x0}
            y={y + j * 6}
            width={view.w}
            height={3}
            fill={pal.stoneDark}
            opacity={0.6}
          />
        ))}
        <Mandapa x={760} base={1380} w={420} h={300} fill={pal.stone} dark={pal.stoneDark} />
        {/* the peepal on its platform, tied with red threads */}
        <Cutout>
          <rect x={-20} y={1380} width={260} height={50} fill={pal.stoneDark} />
          <rect x={-10} y={1360} width={240} height={26} fill={pal.stone} />
        </Cutout>
        <RoundTree
          x={110}
          base={1370}
          h={600}
          r={250}
          fill={pal.canopy[1]}
          bark={pal.bark}
          pattern="dots-gold"
          seed={3}
        />
        {[0, 1, 2].map((k) => (
          <rect key={k} x={84} y={1180 + k * 22} width={52} height={6} fill={JEWEL.vermilion} />
        ))}
        {pal.lit > 0 &&
          [560, 640, 880, 960].map((x, i) => (
            <Diya key={x} x={x} y={1378} s={0.8} lit={pal.lit} flicker={0.85 + 0.15 * Math.sin(t * 8 + i)} />
          ))}
      </>
    );
  },
  fg: ({ v }) => <FolkCorners time={v.time} />,
};

/* ------------------------------------------------------------------ mountain pass */

/** Prayer flags strung from (x0, y0) to (x1, y1), sagging, fluttering. */
const PrayerFlags: React.FC<{ x0: number; y0: number; x1: number; y1: number }> = ({ x0, y0, x1, y1 }) => {
  const { t } = useShot();
  const n = 12;
  const cols = ['#3a6fd0', '#f6ead0', JEWEL.vermilion, '#3f8a4a', JEWEL.gold];
  const cy = Math.max(y0, y1) + 80;
  return (
    <>
      <path
        d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${cy} ${x1} ${y1}`}
        fill="none"
        stroke="#3a2a3a"
        strokeWidth={3}
      />
      {Array.from({ length: n }, (_, i) => {
        const s = (i + 0.5) / n;
        const x = (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * ((x0 + x1) / 2) + s * s * x1;
        const y = (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * cy + s * s * y1;
        const f = 4 * Math.sin(t * 5 + i);
        return (
          <path
            key={i}
            d={`M${x - 16} ${y} L${x + 16} ${y} L${x + 14 + f} ${y + 40} L${x - 18 + f} ${y + 40} Z`}
            fill={cols[i % cols.length]}
          />
        );
      })}
    </>
  );
};

const folkMountainPass: SetDef = {
  id: 'folk_mountain_pass',
  description:
    'Indian folklore / world: a Himalayan mountain pass — far snow-tipped ranges, nearer rocky slopes, a winding ochre path climbing to a notch, pines on either side and prayer flags fluttering across the path.',
  palettes: ['folk'],
  params: TIME_PARAM,
  defaults: { time: 'day' },
  anchors: { path: [480, 1480], path_left: [300, 1480], path_right: [680, 1480], notch: [520, 1240] },
  elements: [],
  fx: folkFx(1360),
  sky: ({ v }) => <FolkSky time={v.time} hidden={v.moon === false} body={[860, 620]} />,
  far: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Mountains
          peaks={[
            [-500, 760],
            [-160, 620],
            [180, 760],
            [520, 560],
            [900, 700],
            [1260, 600],
            [1600, 740],
          ]}
          base={1300}
          fill={pal.mountainFar}
          snow={pal.snow}
          shade={pal.snowShade}
          cap={120}
        />
        <Mountains
          peaks={[
            [-400, 1000],
            [0, 900],
            [330, 1040],
            [760, 920],
            [1150, 1010],
            [1500, 930],
          ]}
          base={1400}
          fill={pal.rock[0]}
          shade={pal.rock[1]}
          depth={140}
          pattern="dots-cream"
        />
      </>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const pal = folkPal(v);
    return (
      <>
        <Hills y={1180} amp={60} period={700} seed={2} fill={pal.hillNear} />
        <Cutout>
          <Patterned
            d={`M${view.x0} 1330 Q${view.cx} 1280 ${view.x1} 1330 L${view.x1} ${BG_Y + BG_H} L${view.x0} ${BG_Y + BG_H} Z`}
            fill={pal.hillFar}
            pattern="lines-cream"
            opacity={0.1}
          />
        </Cutout>
        <Cutout>
          <path
            d="M480 1240 Q560 1260 520 1300 Q440 1340 520 1380 Q640 1440 560 1520 Q480 1600 520 1960 L780 1960 Q700 1600 760 1520 Q840 1430 700 1380 Q600 1340 640 1300 Q680 1260 560 1240 Z"
            fill={pal.ground}
          />
        </Cutout>
        {[-260, -60, 120, 980, 1160, 1360].map((x, i) => (
          <FolkPine
            key={x}
            x={x}
            base={1340 + (i % 2) * 40}
            h={420 + (i % 3) * 80}
            fill={pal.canopy[i % 4]}
            bark={pal.bark}
          />
        ))}
        <Cutout>
          <rect x={130} y={1080} width={10} height={300} fill={pal.bark} />
          <rect x={880} y={1060} width={10} height={320} fill={pal.bark} />
        </Cutout>
        <PrayerFlags x0={135} y0={1086} x1={885} y1={1066} />
      </>
    );
  },
  fg: ({ v }) => <FolkCorners time={v.time} />,
};

/* ------------------------------------------------------------------ snow peaks */

const folkSnowPeaks: SetDef = {
  id: 'folk_snow_peaks',
  description:
    'World / folklore: high snow-capped peaks above a snowfield — great white-capped mountains, snow-laden pines, soft snow drifts to stand on. Cold and quiet; pairs well with the fog fx.',
  palettes: ['folk'],
  params: TIME_PARAM,
  defaults: { time: 'day' },
  anchors: { snowfield: [480, 1480], snowfield_left: [280, 1480], snowfield_right: [700, 1480] },
  elements: [],
  fx: folkFx(1360),
  sky: ({ v }) => <FolkSky time={v.time} hidden={v.moon === false} body={[180, 640]} clouds={false} />,
  far: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Mountains
          peaks={[
            [-460, 700],
            [-80, 500],
            [300, 660],
            [640, 440],
            [1000, 640],
            [1380, 520],
            [1700, 700],
          ]}
          base={1300}
          fill={pal.rock[1]}
          snow={pal.snow}
          shade={pal.rock[2]}
          cap={300}
          depth={240}
        />
        <Mountains
          peaks={[
            [-380, 1000],
            [60, 920],
            [420, 1020],
            [820, 900],
            [1220, 1000],
            [1560, 940],
          ]}
          base={1400}
          fill={pal.rock[0]}
          snow={pal.snow}
          shade={pal.snowShade}
          cap={90}
          depth={130}
        />
      </>
    );
  },
  mid: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Hills
          y={1210}
          amp={40}
          period={620}
          seed={6}
          fill={pal.snowShade}
          pattern="dots-cream"
          opacity={0.2}
        />
        {[-300, -120, 1080, 1260, 1440].map((x, i) => (
          <FolkPine
            key={x}
            x={x}
            base={1300 + (i % 2) * 30}
            h={380 + (i % 3) * 70}
            fill={pal.treeFar[i % 3]}
            bark={pal.bark}
            snow={pal.snow}
          />
        ))}
        <Hills y={1310} amp={22} period={520} seed={1} fill={pal.snow} pattern="dots-ink" opacity={0.05} />
        <FolkPine x={60} base={1380} h={520} fill={pal.treeFar[0]} bark={pal.bark} snow={pal.snow} />
        <FolkPine x={960} base={1400} h={600} fill={pal.treeFar[1]} bark={pal.bark} snow={pal.snow} />
        <Hills
          y={1640}
          amp={26}
          period={460}
          seed={4}
          fill={pal.snowShade}
          pattern="dots-cream"
          opacity={0.15}
        />
      </>
    );
  },
  fg: ({ v }) => {
    const view = useView(0);
    const pal = folkPal(v);
    return (
      <Cutout>
        <path
          d={`M${view.left - 60} ${view.bottom + 40} Q${view.left + 60} ${view.bottom - 160} ${view.left + 260} ${view.bottom + 40} Z`}
          fill={pal.snow}
        />
        <path
          d={`M${view.right + 60} ${view.bottom + 40} Q${view.right - 80} ${view.bottom - 130} ${view.right - 300} ${view.bottom + 40} Z`}
          fill={pal.snowShade}
        />
      </Cutout>
    );
  },
};

/* ------------------------------------------------------------------ fields */

const folkFields: SetDef = {
  id: 'folk_fields',
  description:
    'Indian folklore / world: open farmland — rows of mustard (golden by day) running to the horizon, a hut and palms far off, hills behind, a dirt path in front to stand on.',
  palettes: ['folk'],
  params: TIME_PARAM,
  defaults: { time: 'day' },
  anchors: { path: [480, 1480], path_left: [260, 1480], path_right: [720, 1480], far_hut: [880, 1150] },
  elements: [],
  fx: folkFx(1400),
  sky: ({ v }) => <FolkSky time={v.time} hidden={v.moon === false} body={[820, 660]} />,
  far: ({ v }) => {
    const pal = folkPal(v);
    return (
      <>
        <Hills y={1040} amp={50} period={640} seed={7} fill={pal.hillFar} />
        <Treeline base={1150} colors={pal.treeFar} seed={2} step={160} />
        <Hut
          x={880}
          base={1170}
          w={150}
          h={100}
          wall={pal.wall}
          wallDark={pal.wallDark}
          roof={pal.roof}
          lit={pal.lit}
        />
      </>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const { url } = useDefs();
    const pal = folkPal(v);
    const rows = [1180, 1215, 1255, 1300, 1350];
    return (
      <>
        {rows.map((y, j) => (
          <React.Fragment key={y}>
            <Cutout>
              <path
                d={hillPath(view.x0, view.x1, y, 6 + j * 2, 500, j)}
                fill={j % 2 ? pal.field : pal.hillNear}
              />
            </Cutout>
            {j % 2 === 1 && (
              <path
                d={hillPath(view.x0, view.x1, y, 6 + j * 2, 500, j)}
                fill={url('dots-ink')}
                opacity={0.12}
              />
            )}
          </React.Fragment>
        ))}
        <Palm x={-220} base={1300} h={480} fill={pal.canopy[1]} bark={pal.bark} lean={30} />
        <Palm x={1260} base={1290} h={520} fill={pal.canopy[2]} bark={pal.bark} lean={-40} />
        <Ground time={v.time} y={1400} />
      </>
    );
  },
  fg: ({ v }) => <FolkCorners time={v.time} />,
};

/* ------------------------------------------------------------------ palace hall */

/** Cusped (multifoil) arch, base corners at x±w/2, springing at `spring`, apex at `top`. */
const archPath = (x: number, base: number, w: number, spring: number, top: number) => {
  const l = x - w / 2;
  const r = x + w / 2;
  const k = (spring - top) / 3;
  return `M${l} ${base} L${l} ${spring} Q${l} ${spring - k} ${l + w * 0.12} ${spring - k * 1.2} Q${l + w * 0.12} ${spring - k * 2.2} ${l + w * 0.3} ${spring - k * 2.3} Q${x - w * 0.12} ${top + 10} ${x} ${top} Q${x + w * 0.12} ${top + 10} ${r - w * 0.3} ${spring - k * 2.3} Q${r - w * 0.12} ${spring - k * 2.2} ${r - w * 0.12} ${spring - k * 1.2} Q${r} ${spring - k} ${r} ${spring} L${r} ${base} Z`;
};

const PALACE: Record<
  FolkTime,
  { wall: string; wallDark: string; floor: string; floorDark: string; lamp: number }
> = {
  day: { wall: '#c8485a', wallDark: '#9a3048', floor: '#e8d2a8', floorDark: '#c9ae80', lamp: 0.3 },
  dusk: { wall: '#9a3a5a', wallDark: '#742a48', floor: '#d6a87a', floorDark: '#b08060', lamp: 0.8 },
  night: { wall: '#4a2a5a', wallDark: '#361e46', floor: '#8a6a7a', floorDark: '#6e5266', lamp: 1 },
};

const folkPalaceHall: SetDef = {
  id: 'folk_palace_hall',
  description:
    'Indian folklore / history: a Rajput palace hall — rose-red walls with cusped arch windows showing the sky outside (time of day), gilded pillars, a patterned marble floor, hanging brass lamps that glow at dusk and night.',
  palettes: ['folk'],
  params: TIME_PARAM,
  defaults: { time: 'dusk' },
  anchors: { hall: [480, 1480], hall_left: [240, 1480], hall_right: [720, 1480], throne: [480, 1330] },
  elements: [],
  fx: folkFx(1360),
  sky: ({ v }) => <FolkSky time={v.time} hidden={v.moon === false} body={[480, 900]} />,
  far: ({ v }) => {
    const view = useView();
    const { url } = useDefs();
    const c = PALACE[(v.time as FolkTime) ?? 'dusk'];
    const arches = across(view.x0 + 100, view.x1, 340);
    // the wall with arch-shaped holes cut in it (evenodd), so the sky shows through
    const wall = `M${view.x0} ${BG_Y} L${view.x1} ${BG_Y} L${view.x1} ${BG_Y + BG_H} L${view.x0} ${BG_Y + BG_H} Z ${arches.map((x) => archPath(x + 30, 1240, 220, 900, 700)).join(' ')}`;
    return (
      <>
        <Cutout>
          <path d={wall} fill={c.wall} fillRule="evenodd" />
        </Cutout>
        <path d={wall} fill={url('dots-gold')} fillRule="evenodd" opacity={0.18} />
        {arches.map((x) => (
          <React.Fragment key={x}>
            <path
              d={archPath(x + 30, 1240, 250, 900, 680)}
              fill="none"
              stroke={JEWEL.gold}
              strokeWidth={10}
            />
            <rect x={x + 30 - 130} y={1240} width={260} height={24} fill={c.wallDark} />
          </React.Fragment>
        ))}
        <rect x={view.x0} y={560} width={view.w} height={40} fill={c.wallDark} />
        <rect x={view.x0} y={568} width={view.w} height={24} fill={url('zigzag-gold')} opacity={0.8} />
      </>
    );
  },
  mid: ({ v }) => {
    const view = useView();
    const { url } = useDefs();
    const { t } = useShot();
    const c = PALACE[(v.time as FolkTime) ?? 'dusk'];
    const pillars = across(view.x0 + 100, view.x1, 340).map((x) => x + 30 + 170);
    return (
      <>
        <Cutout>
          <Patterned
            d={`M${view.x0} 1300 L${view.x1} 1300 L${view.x1} ${BG_Y + BG_H} L${view.x0} ${BG_Y + BG_H} Z`}
            fill={c.floor}
            pattern="lines-ink"
            opacity={0.08}
          />
        </Cutout>
        {/* floor tiles in perspective: rows of diamonds growing toward the camera */}
        {[1340, 1420, 1530, 1680, 1860].map((y, j) =>
          across(view.x0, view.x1, 120 + j * 40).map((x, i) => (
            <path
              key={`${j}-${x}`}
              d={`M${x + (j % 2) * (60 + j * 20)} ${y} l${30 + j * 10} ${-12 - j * 4} l${30 + j * 10} ${12 + j * 4} l${-30 - j * 10} ${12 + j * 4} Z`}
              fill={i % 2 ? c.floorDark : JEWEL.peacock}
              opacity={0.7}
            />
          )),
        )}
        {pillars.map((x) => (
          <React.Fragment key={x}>
            <Cutout>
              <rect x={x - 26} y={620} width={52} height={680} fill={JEWEL.gold} />
              <rect x={x - 50} y={1260} width={100} height={44} fill={c.wallDark} />
              <rect x={x - 50} y={600} width={100} height={36} fill={c.wallDark} />
            </Cutout>
            <rect x={x - 26} y={640} width={52} height={620} fill={url('zigzag-ink')} opacity={0.18} />
          </React.Fragment>
        ))}
        {[180, 780].map((x, i) => (
          <g key={x} transform={`translate(${x} 410)`}>
            <Rot a={2 * Math.sin(t * 1.5 + i)}>
              <circle cx={0} cy={330} r={150} fill="#ffcf6e" opacity={0.35 * c.lamp} filter={url('glow')} />
              <Cutout>
                <rect x={-2} y={0} width={4} height={280} fill="#3a2418" />
                <path d="M-50 280 L50 280 L36 340 Q0 370 -36 340 Z" fill="#c9a23a" />
                <path
                  d="M-30 300 L30 300 L22 334 Q0 350 -22 334 Z"
                  fill="#ffd27a"
                  opacity={0.4 + 0.6 * c.lamp}
                />
              </Cutout>
            </Rot>
          </g>
        ))}
      </>
    );
  },
};

export const FOLKLORE: SetDef[] = [
  folkJungle,
  folkVillage,
  folkRiverGhat,
  folkTemple,
  folkMountainPass,
  folkSnowPeaks,
  folkFields,
  folkPalaceHall,
].map((d) => ({
  ...d,
  pack: 'folklore',
  style: 'diorama' as const,
  variants: FOLK_TIMES.map((time) => ({ time })),
}));
