// The parametric paper-puppet rig (spec 7.2). Every part is its own die-cut cutout rotating about a pivot.
import React from 'react';
import type { CharacterSpec } from '@papercut/schema';
import { INK, colour } from '../palettes';
import { Cutout, E, Mirror, P, R, Rot } from '../core/Ink';
import { shade } from '../core/math';
import { useStyle } from '../core/style';
import type { HandShape, TargetState } from '../core/actions';
import {
  BASES,
  FORE_ARM,
  NECK,
  POSES,
  UPPER_ARM,
  feetY,
  handPosition,
  shoulders,
  type BaseDims,
  type Framing,
} from './body';
import { HAIR } from './hair';
import { Face, type Expression } from './face';
import { Hand } from './hands';
import {
  Dhoti,
  Ghagra,
  Leg,
  LONG_TOPS,
  SariSkirt,
  SHORT_SLEEVES,
  Skirt,
  Top,
  TopOver,
  Waistband,
  type TopKind,
} from './outfits';

const SHOES = '#3a2a20';

/** Two-segment arm, drawn as a left arm and mirrored for the right. */
const Arm: React.FC<{
  side: 'L' | 'R';
  b: BaseDims;
  upper: number;
  fore: number;
  hand: HandShape;
  sleeve: string;
  skin: string;
  short: boolean;
}> = ({ side, b, upper, fore, hand, sleeve, skin, short }) => {
  const [x, y] = shoulders(b)[side];
  const u = UPPER_ARM * b.arm;
  const f = FORE_ARM * b.arm;
  const upperPath = `M -32 0 C -32 -42 32 -42 32 0 C 36 ${u * 0.4} 34 ${u * 0.8} 29 ${u + 14} L -29 ${u + 14} C -34 ${u * 0.8} -36 ${u * 0.4} -32 0 Z`;
  // without the die-cut border the diorama arm reads thin, so it is cut a little wider
  const k = useStyle() === 'diorama' ? 1.22 : 1;
  const forePath = `M -29 -6 C -30 ${f * 0.5} -27 ${f * 0.8} -25 ${f + 6} L 25 ${f + 6} C 27 ${f * 0.8} 30 ${f * 0.5} 29 -6 C 29 -34 -29 -34 -29 -6 Z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <Mirror on={side === 'R'}>
        <Rot a={upper}>
          <Cutout>
            <g transform={`scale(${k} 1)`}>
              <P d={upperPath} fill={short ? skin : sleeve} />
              {short && <P d="M -32 0 C -32 -42 32 -42 32 0 L 34 110 L -34 110 Z" fill={sleeve} />}
            </g>
          </Cutout>
          <g transform={`translate(0 ${u})`}>
            <Rot a={-fore}>
              <Cutout>
                <P d={forePath} fill={short ? skin : sleeve} transform={`scale(${k} 1)`} />
                {!short && <line x1={-25} y1={f - 14} x2={25} y2={f - 14} stroke={INK} strokeWidth={2} />}
                <g transform={`translate(0 ${f})`}>
                  <Hand shape={hand} skin={skin} />
                </g>
              </Cutout>
            </Rot>
          </g>
        </Rot>
      </Mirror>
    </g>
  );
};

const Head: React.FC<{
  spec: CharacterSpec;
  b: BaseDims;
  expr: Expression;
  blink: boolean;
  gaze: [number, number];
}> = ({ spec, b, expr, blink, gaze }) => {
  const skin = colour(spec.skin);
  const hair = colour(spec.hair.color);
  const style = HAIR[spec.hair.style] ?? HAIR.crew;
  const rx = b.faceRx;
  return (
    <Cutout>
      {style.back?.(hair)}
      <E cx={540 - rx + 9} cy={1000} rx={22} ry={34} fill={skin} />
      <E cx={540 + rx - 9} cy={1000} rx={22} ry={34} fill={skin} />
      <E cx={540} cy={990} rx={rx} ry={150} fill={skin} />
      {style.front?.(hair)}
      <Face spec={spec} expr={expr} blink={blink} gaze={gaze} hairColor={hair} lines={b.lines} />
    </Cutout>
  );
};

export type PuppetProps = {
  spec: CharacterSpec;
  framing: Framing;
  pose: string;
  expression?: string;
  state: TargetState;
  /** a prop to draw in the right hand (rendered by the caller-provided renderer) */
  held?: React.ReactNode;
};

/** Hands-only framing: two big forearms rising from below, palms up, holding `held` between them. */
const HandsOnly: React.FC<PuppetProps> = ({ spec, pose, state, held }) => {
  const skin = colour(spec.skin);
  const sleeve = colour(spec.outfit.topColor);
  const p = POSES[pose] ?? POSES.hands_open_offering;
  const shape = (s: 'L' | 'R') => state.hands[s] ?? (p.hands[s] === 'relaxed' ? 'open_palm' : p.hands[s]);
  const fore = (side: 'L' | 'R', x: number, a: number) => (
    <g transform={`translate(${x} 760)`}>
      <Mirror on={side === 'R'}>
        <Rot a={a + (side === 'L' ? state.parts.upperArmL : state.parts.upperArmR)}>
          <g transform="scale(2.4)">
            <Cutout>
              <P d="M -29 0 L -27 -260 L 27 -260 L 29 0 Z" fill={sleeve} />
              <R x={-31} y={-110} w={62} h={26} fill={shade(sleeve, -0.15)} strokeWidth={2} />
              <P d="M -26 -84 L -24 -270 L 24 -270 L 26 -84 Z" fill={skin} />
              <g transform="translate(0 -270) rotate(180)">
                <Hand shape={shape(side)} skin={skin} />
              </g>
            </Cutout>
          </g>
        </Rot>
      </Mirror>
    </g>
  );
  return (
    <>
      {fore('L', 300, 12)}
      {fore('R', 780, 12)}
      {/* held prop sits between the palms */}
      {held && <g transform="translate(540 150)">{held}</g>}
    </>
  );
};

export const Puppet: React.FC<PuppetProps> = (props) => {
  const { spec, framing, pose, expression, state: s, held } = props;
  if (framing === 'hands') return <HandsOnly {...props} />;
  const b = BASES[spec.base] ?? BASES.adult_m;
  const skin = colour(spec.skin);
  const topC = colour(spec.outfit.topColor);
  const botC = colour(spec.outfit.bottomColor);
  const topKind = spec.outfit.top as TopKind;
  const isDress = topKind === 'dress' || topKind === 'prison_jumpsuit';
  const legKind = topKind === 'dress' ? 'dress' : spec.outfit.bottom;
  const legC = topKind === 'prison_jumpsuit' ? topC : botC;
  const p = POSES[pose] ?? POSES.idle;
  const uL = p.uL + s.parts.upperArmL;
  const uR = p.uR + s.parts.upperArmR;
  const fL = p.fL + s.parts.foreArmL;
  const fR = p.fR + s.parts.foreArmR;
  const hands = { L: s.hands.L ?? p.hands.L, R: s.hands.R ?? p.hands.R };
  const expr = (s.expression ?? expression ?? spec.defaultExpression) as Expression;
  const gaze: [number, number] = [(p.gaze?.[0] ?? 0) + s.gaze[0], (p.gaze?.[1] ?? 0) + s.gaze[1]];
  const short = SHORT_SLEEVES.includes(topKind);
  const arm = (side: 'L' | 'R') => (
    <Arm
      side={side}
      b={b}
      upper={side === 'L' ? uL : uR}
      fore={side === 'L' ? fL : fR}
      hand={hands[side]}
      sleeve={topC}
      skin={skin}
      short={short}
    />
  );
  // Arms folded across the body are drawn in front of the torso; hanging arms tuck behind it.
  const inFront = (f: number) => f > 40;
  const hipY = b.hipY - 30;
  const leg = (side: 'L' | 'R') => (
    <g transform={`translate(${side === 'L' ? 540 - 62 : 540 + 62} ${hipY})`}>
      <Mirror on={side === 'R'}>
        <Rot a={side === 'L' ? s.parts.legL : -s.parts.legR}>
          <Cutout>
            <Leg kind={legKind} c={legC} skin={skin} len={b.legLen} shoes={SHOES} />
          </Cutout>
        </Rot>
      </Mirror>
    </g>
  );
  const handR = handPosition(b, 'R', uR, fR);
  return (
    <g transform={`translate(0 ${s.parts.bodyDy})`}>
      {leg('L')}
      {leg('R')}
      {!inFront(fL) && arm('L')}
      {!inFront(fR) && arm('R')}
      <Cutout>
        <R x={505} y={1070} w={70} h={110} fill={shade(skin, -0.06)} />
        <Top kind={topKind} c={topC} skin={skin} b={b} />
        {legKind === 'skirt' && <Skirt c={botC} b={b} />}
        {legKind === 'ghagra' && <Ghagra c={botC} b={b} feet={feetY(b)} />}
        {legKind === 'sari' && <SariSkirt c={botC} b={b} feet={feetY(b)} />}
        {legKind === 'dhoti' && <Dhoti c={botC} b={b} feet={feetY(b)} />}
        {topKind === 'dress' && <Skirt c={topC} b={b} />}
        <TopOver kind={topKind} c={topC} b={b} feet={feetY(b)} />
        {!isDress &&
          !['skirt', 'ghagra', 'sari', 'dhoti'].includes(legKind) &&
          topKind !== 'suit_jacket' &&
          !LONG_TOPS.includes(topKind) && <Waistband c={botC} b={b} />}
      </Cutout>
      {inFront(fL) && arm('L')}
      {inFront(fR) && arm('R')}
      {held && <g transform={`translate(${handR[0]} ${handR[1]})`}>{held}</g>}
      <g transform={`translate(${s.parts.headDx} ${(p.headDy ?? 0) + s.parts.headDy})`}>
        <Rot a={(p.head ?? 0) + s.parts.head} cx={NECK[0]} cy={NECK[1]}>
          <Head spec={spec} b={b} expr={expr} blink={s.blink} gaze={gaze} />
        </Rot>
      </g>
    </g>
  );
};

export { BASES, POSES };
