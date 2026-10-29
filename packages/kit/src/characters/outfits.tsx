// Outfit tops (drawn on the torso) and bottoms (legs) in rig space.
import React from 'react';
import { INK } from '../palettes';
import { C, P, Patterned, R } from '../core/Ink';
import { useDefs } from '../core/Filters';
import { shade } from '../core/math';
import { torsoHalfWidth, type BaseDims } from './body';

export type TopKind =
  | 'button_shirt'
  | 'tshirt'
  | 'sweater'
  | 'suit_jacket'
  | 'police_uniform'
  | 'prison_jumpsuit'
  | 'dress'
  | 'jacket_70s'
  | 'choli'
  | 'kurta'
  | 'sherwani'
  | 'sari'
  | 'khaki_uniform';
export const TOPS: TopKind[] = [
  'button_shirt',
  'tshirt',
  'sweater',
  'suit_jacket',
  'police_uniform',
  'prison_jumpsuit',
  'dress',
  'jacket_70s',
  'choli',
  'kurta',
  'sherwani',
  'sari',
  'khaki_uniform',
];
export const BOTTOMS = ['jeans', 'slacks', 'skirt', 'ghagra', 'sari', 'dhoti', 'pajama'] as const;

/** Tops whose sleeves stop above the elbow. */
export const SHORT_SLEEVES: TopKind[] = ['tshirt', 'dress', 'choli', 'sari'];

/** Tops that cover the waist (no belt line drawn over them). */
export const LONG_TOPS: TopKind[] = ['kurta', 'sherwani'];

export const torsoPath = (b: BaseDims) =>
  `M ${540 - b.sw} 1250 C ${540 - b.sw + 20} 1170 460 1148 540 1148 C 620 1148 ${540 + b.sw - 20} 1170 ${540 + b.sw} 1250 L ${540 + b.hw} ${b.hipY} L ${540 - b.hw} ${b.hipY} Z`;

const Buttons: React.FC<{ from: number; to: number; x?: number; fill?: string }> = ({
  from,
  to,
  x = 552,
  fill = '#d8c79a',
}) => (
  <>
    {Array.from({ length: Math.max(0, Math.floor((to - from) / 100) + 1) }, (_, i) => from + i * 100).map(
      (y) => (
        <circle key={y} cx={x} cy={y} r={7} fill={fill} stroke={INK} strokeWidth={2} />
      ),
    )}
  </>
);

const Collar: React.FC<{ c: string }> = ({ c }) => (
  <>
    <P d="M462 1158 L540 1235 L495 1275 Z" fill={c} />
    <P d="M618 1158 L540 1235 L585 1275 Z" fill={c} />
  </>
);

/** Torso fill + details for a top. Drawn inside the torso cutout. */
export const Top: React.FC<{ kind: string; c: string; skin: string; b: BaseDims }> = ({
  kind,
  c,
  skin,
  b,
}) => {
  const hem = b.hipY;
  const band = (y: number, h: number, fill: string) => {
    const w0 = torsoHalfWidth(b, y);
    const w1 = torsoHalfWidth(b, y + h);
    return (
      <P
        d={`M${540 - w0} ${y} L${540 + w0} ${y} L${540 + w1} ${y + h} L${540 - w1} ${y + h} Z`}
        fill={fill}
      />
    );
  };
  const body = <P d={torsoPath(b)} fill={c} />;
  switch (kind as TopKind) {
    case 'tshirt':
      return (
        <>
          {body}
          <P d="M490 1150 C 500 1198 580 1198 590 1150 Z" fill={shade(skin, -0.06)} />
          <path
            d="M486 1150 C 498 1206 582 1206 594 1150"
            fill="none"
            stroke={shade(c, -0.2)}
            strokeWidth={6}
          />
        </>
      );
    case 'sweater': {
      const rib = shade(c, -0.18);
      return (
        <>
          {body}
          {band(1420, 44, shade(c, 0.22))}
          {band(hem - 56, 56, rib)}
          {Array.from({ length: 12 }, (_, i) => 540 - b.hw + 20 + (i * (2 * b.hw - 40)) / 11).map((x) => (
            <line key={x} x1={x} y1={hem - 52} x2={x} y2={hem - 4} stroke={shade(c, -0.32)} strokeWidth={2} />
          ))}
          <P
            d="M482 1150 C 495 1218 585 1218 598 1150 L 584 1150 C 574 1196 506 1196 496 1150 Z"
            fill={rib}
          />
          <P d="M496 1150 C 506 1196 574 1196 584 1150 Z" fill={shade(skin, -0.06)} />
        </>
      );
    }
    case 'suit_jacket':
      return (
        <>
          {body}
          <P d="M490 1150 L540 1340 L590 1150 Z" fill="#e8e0cc" />
          <P d="M530 1172 L550 1172 L557 1300 L540 1336 L523 1300 Z" fill="#6b2230" />
          <P d="M480 1152 L540 1344 L502 1390 L448 1204 Z" fill={shade(c, -0.12)} />
          <P d="M600 1152 L540 1344 L578 1390 L632 1204 Z" fill={shade(c, -0.12)} />
          <line x1={540} y1={1344} x2={540} y2={hem} stroke={INK} strokeWidth={3} />
          <Buttons from={1470} to={1570} x={556} fill={shade(c, -0.3)} />
          <R x={590} y={1280} w={70} h={14} fill={shade(c, -0.12)} strokeWidth={2} />
        </>
      );
    case 'police_uniform':
      return (
        <>
          {body}
          <line x1={540} y1={1230} x2={540} y2={hem} stroke={INK} strokeWidth={3} />
          <Buttons from={1300} to={hem - 140} />
          <P d="M530 1200 L550 1200 L556 1330 L540 1356 L524 1330 Z" fill={shade(c, -0.35)} />
          <Collar c={shade(c, 0.1)} />
          <R x={600} y={1300} w={80} h={66} fill={shade(c, -0.1)} />
          <P
            d="M440 1300 L476 1300 L476 1336 C 476 1352 458 1362 458 1362 C 458 1362 440 1352 440 1336 Z"
            fill="#c9a23a"
          />
          {band(hem - 60, 40, '#1f1a18')}
          <R x={524} y={hem - 58} w={32} h={36} fill="#c9a23a" strokeWidth={2} />
          <R x={540 - b.sw + 8} y={1236} w={70} h={22} fill={shade(c, -0.2)} strokeWidth={2} />
          <R x={540 + b.sw - 78} y={1236} w={70} h={22} fill={shade(c, -0.2)} strokeWidth={2} />
        </>
      );
    case 'prison_jumpsuit':
      return (
        <>
          {body}
          <P d="M496 1150 L540 1250 L584 1150 Z" fill={shade(skin, -0.06)} />
          <Collar c={shade(c, 0.08)} />
          <line x1={540} y1={1250} x2={540} y2={hem} stroke={shade(c, -0.35)} strokeWidth={4} />
          <R x={586} y={1300} w={96} h={44} fill="#e8e0cc" strokeWidth={2} />
          <line x1={598} y1={1322} x2={670} y2={1322} stroke={INK} strokeWidth={4} strokeDasharray="8 6" />
        </>
      );
    case 'dress':
      return (
        <>
          {body}
          <P d="M486 1150 C 492 1230 588 1230 594 1150 Z" fill={shade(skin, -0.06)} />
          {band(1560, 22, shade(c, -0.18))}
        </>
      );
    case 'jacket_70s':
      return (
        <>
          {body}
          <P d="M496 1150 L540 1300 L584 1150 Z" fill="#d8c79a" />
          <P d="M470 1150 L540 1300 L410 1300 Z" fill={shade(c, 0.12)} />
          <P d="M610 1150 L540 1300 L670 1300 Z" fill={shade(c, 0.12)} />
          <line x1={540} y1={1300} x2={540} y2={hem} stroke={INK} strokeWidth={3} />
          <Buttons from={1380} to={hem - 120} x={556} fill={shade(c, -0.3)} />
          <R x={440} y={1560} w={70} h={16} fill={shade(c, -0.15)} strokeWidth={2} />
          <R x={570} y={1560} w={70} h={16} fill={shade(c, -0.15)} strokeWidth={2} />
        </>
      );
    case 'choli':
      // fitted short blouse with a dupatta sash across the chest
      return (
        <>
          {body}
          <P d="M486 1150 C 494 1220 586 1220 594 1150 Z" fill={shade(skin, -0.06)} />
          {band(1250, 30, shade(c, -0.2))}
          <Patterned
            d={`M${540 - b.sw + 10} 1190 L${540 - b.sw + 70} 1170 L${540 + b.hw} ${b.hipY - 120} L${540 + b.hw - 50} ${b.hipY - 40} Z`}
            fill={shade(c, 0.35)}
            pattern="dots-gold"
            opacity={0.7}
          />
        </>
      );
    case 'kurta':
    case 'sherwani': {
      // band collar and a placket; the long skirt of the garment is drawn by TopOver
      const trim = kind === 'sherwani' ? '#f0c35a' : shade(c, -0.18);
      return (
        <>
          {body}
          <P d="M500 1150 L580 1150 L578 1186 L502 1186 Z" fill={trim} />
          <line
            x1={540}
            y1={1186}
            x2={540}
            y2={kind === 'sherwani' ? hem : 1420}
            stroke={shade(c, -0.25)}
            strokeWidth={3}
          />
          <Buttons
            from={1220}
            to={kind === 'sherwani' ? hem - 60 : 1400}
            x={556}
            fill={kind === 'sherwani' ? '#f0c35a' : shade(c, -0.3)}
          />
        </>
      );
    }
    case 'sari':
      // blouse; the pallu over the shoulder is drawn by TopOver
      return (
        <>
          {body}
          <P d="M486 1150 C 494 1220 586 1220 594 1150 Z" fill={shade(skin, -0.06)} />
          {band(1250, 26, shade(c, -0.22))}
          {band(1280, 70, skin)}
        </>
      );
    case 'khaki_uniform':
      // Indian police: khaki shirt, epaulettes with a red flash, name plate, lanyard, brown belt
      return (
        <>
          {body}
          <line x1={540} y1={1230} x2={540} y2={hem} stroke={shade(c, -0.3)} strokeWidth={3} />
          <Buttons from={1300} to={hem - 140} fill={shade(c, -0.35)} />
          <Collar c={shade(c, 0.06)} />
          <R x={440} y={1300} w={80} h={66} fill={shade(c, -0.08)} />
          <R x={600} y={1300} w={80} h={66} fill={shade(c, -0.08)} />
          <R x={598} y={1272} w={84} h={20} fill="#2c3a54" strokeWidth={2} />
          <R x={540 - b.sw + 8} y={1236} w={70} h={22} fill={shade(c, -0.15)} strokeWidth={2} />
          <R x={540 + b.sw - 78} y={1236} w={70} h={22} fill={shade(c, -0.15)} strokeWidth={2} />
          <R x={540 - b.sw + 30} y={1238} w={14} h={18} fill="#c43a2a" strokeWidth={0} />
          <R x={540 + b.sw - 44} y={1238} w={14} h={18} fill="#c43a2a" strokeWidth={0} />
          <path
            d={`M${540 - b.sw + 40} 1250 Q 470 1330 452 1370`}
            fill="none"
            stroke="#e8dcc0"
            strokeWidth={5}
          />
          {band(hem - 60, 40, '#4a2a1a')}
          <R x={522} y={hem - 58} w={36} h={36} fill="#c9a23a" strokeWidth={2} />
        </>
      );
    case 'button_shirt':
    default:
      return (
        <>
          {body}
          <line x1={540} y1={1230} x2={540} y2={hem} stroke={INK} strokeWidth={3} />
          <Buttons from={1300} to={hem - 100} />
          <R x={600} y={1300} w={80} h={70} fill={shade(c, -0.12)} />
          <Collar c={shade(c, 0.1)} />
        </>
      );
  }
};

/** One leg in leg-local space: hip pivot at (0,0), pointing down. Drawn as the left leg. */
export const Leg: React.FC<{ kind: string; c: string; skin: string; len: number; shoes: string }> = ({
  kind,
  c,
  skin,
  len,
  shoes,
}) => {
  const bare =
    kind === 'skirt' || kind === 'dress' || kind === 'ghagra' || kind === 'sari' || kind === 'dhoti';
  const w = bare ? 34 : 50;
  return (
    <>
      <P d={`M ${-w} -20 L ${-w + 4} ${len} L ${w - 4} ${len} L ${w} -20 Z`} fill={bare ? skin : c} />
      {kind === 'jeans' && (
        <line x1={-w + 18} y1={60} x2={-w + 20} y2={len - 10} stroke={shade(c, 0.25)} strokeWidth={2} />
      )}
      {kind === 'slacks' && (
        <line x1={0} y1={30} x2={0} y2={len - 10} stroke={shade(c, -0.25)} strokeWidth={2} />
      )}
      <P
        d={`M ${-w - 30} ${len + 40} C ${-w - 30} ${len + 10} ${-w} ${len - 4} ${-w + 4} ${len - 4} L ${w} ${len - 4} L ${w} ${len + 40} Z`}
        fill={shoes}
      />
    </>
  );
};

/** Skirt (or dress skirt) drawn over the tops of the legs. */
export const Skirt: React.FC<{ c: string; b: BaseDims }> = ({ c, b }) => (
  <>
    <P
      d={`M ${540 - b.hw} ${b.hipY - 40} L ${540 + b.hw} ${b.hipY - 40} L ${540 + b.hw + 60} ${b.hipY + 330} L ${540 - b.hw - 60} ${b.hipY + 330} Z`}
      fill={c}
    />
    <line x1={540 - 40} y1={b.hipY} x2={540 - 60} y2={b.hipY + 320} stroke={shade(c, -0.2)} strokeWidth={2} />
    <line x1={540 + 40} y1={b.hipY} x2={540 + 60} y2={b.hipY + 320} stroke={shade(c, -0.2)} strokeWidth={2} />
  </>
);

/** Belt line where trousers meet the top. */
export const Waistband: React.FC<{ c: string; b: BaseDims }> = ({ c, b }) => (
  <>
    <R x={540 - b.hw + 2} y={b.hipY - 34} w={2 * b.hw - 4} h={30} fill={shade(c, -0.15)} strokeWidth={2} />
    <C cx={540} cy={b.hipY - 19} r={7} fill="#c9a23a" strokeWidth={2} />
  </>
);

/** Long flared ghagra skirt from the waist to the ankles, with a Madhubani zigzag hem band. */
export const Ghagra: React.FC<{ c: string; b: BaseDims; feet: number }> = ({ c, b, feet }) => {
  const { url } = useDefs();
  const top = b.hipY - 60;
  const hem = feet - 70;
  const flare = b.hw + 170;
  const d = `M ${540 - b.hw + 10} ${top} L ${540 + b.hw - 10} ${top} C ${540 + b.hw + 60} ${top + 200} ${540 + flare} ${hem - 140} ${540 + flare} ${hem} L ${540 - flare} ${hem} C ${540 - flare} ${hem - 140} ${540 - b.hw - 60} ${top + 200} ${540 - b.hw + 10} ${top} Z`;
  return (
    <>
      <Patterned d={d} fill={c} pattern="dots-gold" opacity={0.45} />
      <rect x={540 - flare} y={hem - 64} width={2 * flare} height={64} fill={shade(c, -0.25)} />
      <rect x={540 - flare} y={hem - 56} width={2 * flare} height={48} fill={url('zigzag-gold')} />
      <rect x={540 - b.hw + 10} y={top} width={2 * b.hw - 20} height={26} fill={shade(c, -0.3)} />
    </>
  );
};

/**
 * Garment parts drawn over the bottoms: the long skirt of a kurta (to the knee) or sherwani (below
 * it), or a sari's pallu across the chest and over the left shoulder.
 */
export const TopOver: React.FC<{ kind: string; c: string; b: BaseDims; feet: number }> = ({
  kind,
  c,
  b,
  feet,
}) => {
  const { url } = useDefs();
  if (kind === 'kurta' || kind === 'sherwani') {
    const len = kind === 'sherwani' ? (feet - b.hipY) * 0.62 : (feet - b.hipY) * 0.42;
    const y0 = b.hipY - 40;
    const y1 = b.hipY + len;
    const d = `M ${540 - b.hw} ${y0} L ${540 + b.hw} ${y0} L ${540 + b.hw + 40} ${y1} L ${540 - b.hw - 40} ${y1} Z`;
    return (
      <>
        <P d={d} fill={c} />
        <line x1={540} y1={y0} x2={540} y2={y1} stroke={shade(c, -0.25)} strokeWidth={3} />
        <line
          x1={540 - b.hw - 10}
          y1={y1 - len * 0.45}
          x2={540 - b.hw - 34}
          y2={y1}
          stroke={shade(c, -0.3)}
          strokeWidth={3}
        />
        <line
          x1={540 + b.hw + 10}
          y1={y1 - len * 0.45}
          x2={540 + b.hw + 34}
          y2={y1}
          stroke={shade(c, -0.3)}
          strokeWidth={3}
        />
        {kind === 'sherwani' ? (
          <>
            <rect x={540 - b.hw - 40} y={y1 - 34} width={2 * b.hw + 80} height={30} fill="#f0c35a" />
            <rect
              x={540 - b.hw - 40}
              y={y1 - 32}
              width={2 * b.hw + 80}
              height={26}
              fill={url('zigzag-ink')}
              opacity={0.4}
            />
            <Buttons from={y0 + 40} to={y1 - 80} x={556} fill="#f0c35a" />
          </>
        ) : (
          <rect x={540 - b.hw - 40} y={y1 - 26} width={2 * b.hw + 80} height={20} fill={shade(c, -0.15)} />
        )}
      </>
    );
  }
  if (kind === 'sari') {
    // the pallu: from the right hip, across the chest, over the left shoulder, with a gold border
    const d = `M ${540 + b.hw - 60} ${b.hipY - 40} L ${540 - b.sw - 6} 1180 L ${540 - b.sw + 130} 1146 L ${540 + b.hw + 50} ${b.hipY - 230} Z`;
    return (
      <>
        <Patterned d={d} fill={c} pattern="dots-gold" opacity={0.35} />
        <path
          d={`M ${540 - b.sw + 130} 1146 L ${540 + b.hw + 50} ${b.hipY - 230}`}
          stroke="#f0c35a"
          strokeWidth={16}
        />
        <path
          d={`M ${540 - b.sw + 130} 1146 L ${540 + b.hw + 50} ${b.hipY - 230}`}
          stroke={shade(c, -0.3)}
          strokeWidth={4}
          strokeDasharray="10 10"
        />
      </>
    );
  }
  return null;
};

/** Sari skirt: straight to the ankles with front pleats and a gold border at the hem. */
export const SariSkirt: React.FC<{ c: string; b: BaseDims; feet: number }> = ({ c, b, feet }) => {
  const { url } = useDefs();
  const top = b.hipY - 60;
  const hem = feet - 40;
  const w = b.hw + 70;
  const d = `M ${540 - b.hw} ${top} L ${540 + b.hw} ${top} L ${540 + w} ${hem} L ${540 - w} ${hem} Z`;
  return (
    <>
      <Patterned d={d} fill={c} pattern="dots-gold" opacity={0.3} />
      {[-30, -10, 10, 30].map((dx) => (
        <line
          key={dx}
          x1={540 + dx}
          y1={b.hipY}
          x2={540 + dx * 2.2}
          y2={hem}
          stroke={shade(c, -0.22)}
          strokeWidth={3}
        />
      ))}
      <rect x={540 - w} y={hem - 46} width={2 * w} height={46} fill="#f0c35a" />
      <rect x={540 - w} y={hem - 42} width={2 * w} height={38} fill={url('zigzag-ink')} opacity={0.45} />
    </>
  );
};

/** Dhoti: white cloth wrapped from the waist to mid-calf, gathered pleats falling between the legs. */
export const Dhoti: React.FC<{ c: string; b: BaseDims; feet: number }> = ({ c, b, feet }) => {
  const top = b.hipY - 50;
  const low = feet - 250;
  const d = `M ${540 - b.hw - 6} ${top} L ${540 + b.hw + 6} ${top} C ${540 + b.hw + 40} ${top + 220} ${540 + b.hw + 30} ${low - 80} ${540 + b.hw + 10} ${low} L ${540 + 40} ${low} L ${540} ${low - 140} L ${540 - 40} ${low} L ${540 - b.hw - 10} ${low} C ${540 - b.hw - 30} ${low - 80} ${540 - b.hw - 40} ${top + 220} ${540 - b.hw - 6} ${top} Z`;
  return (
    <>
      <P d={d} fill={c} />
      <P
        d={`M 520 ${top + 40} L 560 ${top + 40} L 590 ${low + 30} L 490 ${low + 30} Z`}
        fill={shade(c, -0.06)}
      />
      {[505, 525, 545, 565].map((x) => (
        <line
          key={x}
          x1={x + 8}
          y1={top + 50}
          x2={x * 1.0 + (x - 540) * 0.6}
          y2={low + 26}
          stroke={shade(c, -0.2)}
          strokeWidth={2}
        />
      ))}
      <rect x={540 - b.hw - 6} y={top} width={2 * b.hw + 12} height={24} fill={shade(c, -0.1)} />
      <rect x={540 - b.hw - 6} y={top + 6} width={2 * b.hw + 12} height={6} fill="#c43a2a" />
    </>
  );
};
