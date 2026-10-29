// Face parts in rig space. Expressions swap brows, eyes and mouth (spec 7.2).
import React from 'react';
import type { CharacterSpec } from '@papercut/schema';
import { INK } from '../palettes';
import { P } from '../core/Ink';
import { shade } from '../core/math';

export const EXPRESSIONS = ['neutral', 'vacant', 'worried', 'angry', 'shocked', 'smile', 'sad'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

const LIP = '#8a4a3a';
const EYE_L = 486;
const EYE_R = 594;
const EYE_Y = 990;

/** Brow endpoints [outerY, innerY] per expression; x spans are fixed. */
const BROW_Y: Record<Expression, [number, number]> = {
  neutral: [938, 938],
  vacant: [936, 944],
  worried: [946, 926],
  angry: [924, 952],
  shocked: [912, 908],
  smile: [932, 930],
  sad: [948, 928],
};

const BROW_WIDTH: Record<CharacterSpec['face']['brows'], number> = { flat: 9, heavy: 14, thin: 5, arched: 8 };

const Brows: React.FC<{ expr: Expression; style: CharacterSpec['face']['brows']; color: string }> = ({
  expr,
  style,
  color,
}) => {
  const [o, i] = BROW_Y[expr];
  const w = BROW_WIDTH[style];
  const common = { fill: 'none', stroke: color, strokeWidth: w, strokeLinecap: 'round' as const };
  if (style === 'arched') {
    return (
      <>
        <path d={`M452 ${o} Q484 ${Math.min(o, i) - 14} 516 ${i}`} {...common} />
        <path d={`M564 ${i} Q596 ${Math.min(o, i) - 14} 628 ${o}`} {...common} />
      </>
    );
  }
  return (
    <>
      <line x1={452} y1={o} x2={516} y2={i} {...common} />
      <line x1={564} y1={i} x2={628} y2={o} {...common} />
    </>
  );
};

const Eyes: React.FC<{ expr: Expression; blink: boolean; gaze: [number, number] }> = ({
  expr,
  blink,
  gaze,
}) => {
  const [gx, gy] = gaze;
  if (blink) {
    return (
      <>
        <line x1={EYE_L - 10} y1={EYE_Y} x2={EYE_L + 10} y2={EYE_Y} stroke={INK} strokeWidth={4} />
        <line x1={EYE_R - 10} y1={EYE_Y} x2={EYE_R + 10} y2={EYE_Y} stroke={INK} strokeWidth={4} />
      </>
    );
  }
  if (expr === 'smile') {
    return (
      <>
        {[EYE_L, EYE_R].map((x) => (
          <path
            key={x}
            d={`M${x - 11} ${EYE_Y + 4} Q${x} ${EYE_Y - 10} ${x + 11} ${EYE_Y + 4}`}
            fill="none"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
          />
        ))}
      </>
    );
  }
  if (expr === 'shocked') {
    return (
      <>
        {[EYE_L, EYE_R].map((x) => (
          <g key={x}>
            <circle cx={x} cy={EYE_Y} r={15} fill="#fbf4e2" stroke={INK} strokeWidth={3} />
            <circle cx={x + gx} cy={EYE_Y + gy} r={6} fill={INK} />
          </g>
        ))}
      </>
    );
  }
  const dy = expr === 'sad' ? 3 : 0;
  return (
    <>
      <circle cx={EYE_L + gx} cy={EYE_Y + gy + dy} r={7} fill={INK} />
      <circle cx={EYE_R + gx} cy={EYE_Y + gy + dy} r={7} fill={INK} />
    </>
  );
};

const MOUTH: Record<Expression, string> = {
  neutral: 'M512 1088 L568 1088',
  vacant: 'M508 1090 C 530 1086 552 1086 572 1089',
  worried: 'M508 1092 Q522 1082 536 1092 Q550 1102 564 1092 Q570 1088 574 1090',
  angry: 'M510 1096 Q540 1076 570 1096',
  shocked: '',
  smile: 'M505 1078 Q540 1112 575 1078',
  sad: 'M512 1098 Q540 1080 568 1098',
};

const Mouth: React.FC<{ expr: Expression }> = ({ expr }) =>
  expr === 'shocked' ? (
    <ellipse cx={540} cy={1094} rx={16} ry={22} fill="#5a2a22" stroke={INK} strokeWidth={3} />
  ) : (
    <path d={MOUTH[expr]} fill="none" stroke={LIP} strokeWidth={5} strokeLinecap="round" />
  );

const Glasses: React.FC<{ kind: CharacterSpec['face']['glasses'] }> = ({ kind }) => {
  const frame = '#3b2a20';
  switch (kind) {
    case 'large_square':
      return (
        <>
          <rect
            x={438}
            y={948}
            width={96}
            height={76}
            rx={18}
            fill="#fff6dc"
            fillOpacity={0.22}
            stroke={frame}
            strokeWidth={7}
          />
          <rect
            x={546}
            y={948}
            width={96}
            height={76}
            rx={18}
            fill="#fff6dc"
            fillOpacity={0.22}
            stroke={frame}
            strokeWidth={7}
          />
          <line x1={534} y1={975} x2={546} y2={975} stroke={frame} strokeWidth={6} />
        </>
      );
    case 'round':
      return (
        <>
          <circle
            cx={EYE_L}
            cy={EYE_Y}
            r={40}
            fill="#fff6dc"
            fillOpacity={0.18}
            stroke={frame}
            strokeWidth={6}
          />
          <circle
            cx={EYE_R}
            cy={EYE_Y}
            r={40}
            fill="#fff6dc"
            fillOpacity={0.18}
            stroke={frame}
            strokeWidth={6}
          />
          <path d="M526 984 Q540 974 554 984" fill="none" stroke={frame} strokeWidth={5} />
        </>
      );
    case 'aviator':
      return (
        <>
          {[EYE_L, EYE_R].map((x) => (
            <path
              key={x}
              d={`M${x - 46} 958 L${x + 46} 958 C ${x + 50} 1000 ${x + 30} 1036 ${x} 1036 C ${x - 30} 1036 ${x - 50} 1000 ${x - 46} 958 Z`}
              fill="#5a4a3a"
              fillOpacity={0.45}
              stroke="#a8915a"
              strokeWidth={5}
            />
          ))}
          <line x1={532} y1={962} x2={548} y2={962} stroke="#a8915a" strokeWidth={5} />
        </>
      );
    default:
      return null;
  }
};

const JAW =
  'M 418 1010 C 420 1110 480 1150 540 1150 C 600 1150 660 1110 662 1010 C 640 1060 616 1078 600 1080 C 580 1062 500 1062 480 1080 C 464 1078 440 1060 418 1010 Z';
const MOUSTACHE =
  'M 500 1072 C 515 1052 535 1058 540 1064 C 545 1058 565 1052 580 1072 C 565 1082 550 1076 540 1074 C 530 1076 515 1082 500 1072 Z';

export const FacialHair: React.FC<{ kind: CharacterSpec['face']['facialHair']; color: string }> = ({
  kind,
  color,
}) => {
  switch (kind) {
    case 'moustache':
      return <P d={MOUSTACHE} fill={color} />;
    case 'beard':
      return (
        <>
          <P d={JAW} fill={color} />
          <P d={MOUSTACHE} fill={color} />
        </>
      );
    case 'stubble':
      return <path d={JAW} fill={shade(color, -0.2)} opacity={0.28} />;
    default:
      return null;
  }
};

export const Face: React.FC<{
  spec: CharacterSpec;
  expr: Expression;
  blink: boolean;
  gaze: [number, number];
  hairColor: string;
  lines?: boolean;
}> = ({ spec, expr, blink, gaze, hairColor, lines }) => (
  <>
    {lines && (
      <>
        <path d="M478 900 Q540 890 602 900" fill="none" stroke={INK} strokeWidth={2} opacity={0.6} />
        <path d="M488 916 Q540 908 592 916" fill="none" stroke={INK} strokeWidth={2} opacity={0.6} />
      </>
    )}
    <Brows expr={expr} style={spec.face.brows} color={shade(hairColor, -0.2)} />
    <Eyes expr={expr} blink={blink} gaze={gaze} />
    <Glasses kind={spec.face.glasses} />
    <path d="M540 1010 C 530 1040 528 1052 550 1054" fill="none" stroke={INK} strokeWidth={3} />
    <FacialHair kind={spec.face.facialHair} color={hairColor} />
    <Mouth expr={expr} />
  </>
);
