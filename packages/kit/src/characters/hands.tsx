import React from 'react';
import { INK } from '../palettes';
import { C, E, P } from '../core/Ink';
import type { HandShape } from '../core/actions';

export const HAND_SHAPES: HandShape[] = ['relaxed', 'fist', 'open_palm', 'point', 'thumb_up', 'holding'];

/**
 * A hand in arm-local space: wrist at (0, 0), the arm pointing down +y. Drawn for the left arm; the right
 * arm is mirrored by the rig, so thumbs land on the correct side. `-x` is "up" when the arm is raised outward.
 */
export const Hand: React.FC<{ shape: HandShape; skin: string }> = ({ shape, skin }) => {
  switch (shape) {
    case 'fist':
    case 'holding':
      return (
        <>
          <C cx={0} cy={34} r={34} fill={skin} />
          <path d="M -20 46 Q 0 56 20 46" fill="none" stroke={INK} strokeWidth={2} />
        </>
      );
    case 'open_palm':
      return (
        <>
          <E cx={-30} cy={30} rx={13} ry={28} fill={skin} transform="rotate(35 -30 30)" />
          <E cx={0} cy={46} rx={38} ry={48} fill={skin} />
          {[-18, -6, 6, 18].map((x) => (
            <line key={x} x1={x} y1={70} x2={x} y2={90} stroke={INK} strokeWidth={2} />
          ))}
        </>
      );
    case 'point':
      return (
        <>
          <P d="M -9 50 L -9 118 C -9 128 9 128 9 118 L 9 50 Z" fill={skin} />
          <C cx={0} cy={32} r={32} fill={skin} />
        </>
      );
    case 'thumb_up':
      return (
        <>
          <P d="M -20 8 L -66 8 C -78 8 -78 28 -66 28 L -20 28 Z" fill={skin} />
          <C cx={0} cy={34} r={34} fill={skin} />
          <path d="M 12 14 L 12 56" fill="none" stroke={INK} strokeWidth={2} />
        </>
      );
    case 'relaxed':
    default:
      return <E cx={0} cy={40} rx={34} ry={48} fill={skin} />;
  }
};
