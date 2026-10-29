import React from 'react';
import { INK } from '../palettes';
import { useDefs } from '../core/Filters';
import { C, Cutout, P, R } from '../core/Ink';
import type { PropDef, PropProps } from './types';

const Wheel: React.FC<{ x: number; angle: number }> = ({ x, angle }) => (
  <g transform={`translate(${x} 120)`}>
    <C cx={0} cy={0} r={44} fill="#1e1a18" />
    <C cx={0} cy={0} r={21} fill="#c8c8c8" />
    <g transform={`rotate(${angle})`}>
      <line x1={-20} y1={0} x2={20} y2={0} stroke={INK} strokeWidth={4} />
      <line x1={0} y1={-20} x2={0} y2={20} stroke={INK} strokeWidth={4} />
    </g>
  </g>
);

const SEDAN = 'M0 120 L 0 70 C 0 55 15 50 40 48 L 150 40 L 205 -12 L 362 -12 L 425 40 L 540 50 C 560 52 568 65 568 80 L 568 120 Z';

/** 70s sedan from the prototype. Origin: bottom centre of the wheels. Faces right. */
const Sedan: React.FC<PropProps & { police?: boolean }> = ({ params, state, police }) => {
  const { url } = useDefs();
  const body = police ? '#e9e3cf' : (params.color ?? '#2f5f52');
  return (
    <g transform="translate(-284 -164)">
      <Cutout>
        <P d={SEDAN} fill={police ? '#1f1a18' : body} />
        {police && <P d="M150 40 L 205 -12 L 362 -12 L 425 40 L 425 112 L 150 112 Z" fill={body} />}
        <P d="M215 0 L285 0 L285 38 L172 38Z" fill="#a9c9c6" />
        <P d="M296 0 L357 0 L408 38 L296 38Z" fill="#a9c9c6" />
        {!police && (
          <>
            <circle cx={335} cy={20} r={15} fill={INK} />
            <rect x={336} y={16} width={16} height={3} fill="#e9e3cf" />
          </>
        )}
        {police && (
          <>
            <R x={250} y={-32} w={34} h={20} fill="#c43a2a" />
            <R x={284} y={-32} w={34} h={20} fill="#3a5ac4" />
            <text x={290} y={92} textAnchor="middle" fontFamily="IM Fell English" fontSize={30} fill={INK}>
              POLICE
            </text>
          </>
        )}
        <line x1={10} y1={82} x2={558} y2={82} stroke="#e6dcc0" strokeWidth={4} />
        <R x={548} y={94} w={30} h={14} fill="#cfcfcf" />
        <R x={-10} y={94} w={30} h={14} fill="#cfcfcf" />
        <C cx={560} cy={70} r={9} fill="#ffe8a0" />
        <Wheel x={120} angle={state.wheel} />
        <Wheel x={450} angle={state.wheel} />
      </Cutout>
      <circle cx={600} cy={72} r={60} fill="#ffe8a0" opacity={0.35 * state.light} filter={url('glow')} />
      {police && (
        <circle cx={state.wheel % 40 < 20 ? 267 : 301} cy={-22} r={50} fill={state.wheel % 40 < 20 ? '#ff4a3a' : '#4a6aff'} opacity={0.35} filter={url('glow')} />
      )}
    </g>
  );
};

export const VEHICLES: PropDef[] = [
  {
    id: 'car_70s_sedan',
    description: '1970s four-door sedan, side view facing right, wheels spin with drive_in/drive_out.',
    params: { color: 'hex (default #2f5f52)' },
    bbox: [-300, -200, 610, 210],
    pivots: { base_left: [-284, 0], base_right: [284, 0] },
    origin: 'bottom centre of wheels',
    Component: (p) => <Sedan {...p} />,
  },
  {
    id: 'car_police',
    description: 'Black-and-white police cruiser with light bar, side view facing right.',
    params: {},
    bbox: [-300, -200, 610, 210],
    pivots: { base_left: [-284, 0], base_right: [284, 0] },
    origin: 'bottom centre of wheels',
    Component: (p) => <Sedan {...p} police />,
  },
];
