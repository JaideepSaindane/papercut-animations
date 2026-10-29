// Rig geometry. All rig drawing happens in "rig space": the prototype's waist-framing coordinates, with the
// neck base at (540, 1150), head centre (540, 990), shoulders at y≈1250. Framings place rig space on screen.
import type { CharacterSpec } from '@papercut/schema';
import type { HandShape } from '../core/actions';

export const NECK: [number, number] = [540, 1150];
export const UPPER_ARM = 220;
export const FORE_ARM = 200;

export type BaseDims = {
  /** half-width at the shoulders and at the hips */
  sw: number;
  hw: number;
  hipY: number;
  legLen: number;
  /** multiplier on arm lengths */
  arm: number;
  /** half-width of the face ellipse */
  faceRx: number;
  lines?: boolean;
};

export const BASES: Record<CharacterSpec['base'], BaseDims> = {
  adult_m: { sw: 190, hw: 200, hipY: 1830, legLen: 770, arm: 1, faceRx: 125 },
  adult_f: { sw: 165, hw: 182, hipY: 1810, legLen: 760, arm: 0.96, faceRx: 118 },
  teen_m: { sw: 186, hw: 204, hipY: 1820, legLen: 760, arm: 1, faceRx: 122 },
  teen_f: { sw: 158, hw: 172, hipY: 1800, legLen: 750, arm: 0.95, faceRx: 116 },
  elder_m: { sw: 186, hw: 214, hipY: 1820, legLen: 720, arm: 0.98, faceRx: 126, lines: true },
  elder_f: { sw: 164, hw: 196, hipY: 1800, legLen: 710, arm: 0.95, faceRx: 120, lines: true },
  child: { sw: 135, hw: 138, hipY: 1640, legLen: 500, arm: 0.78, faceRx: 118 },
};

/** Feet line (bottom of shoes) in rig space. */
export const feetY = (b: BaseDims) => b.hipY - 30 + b.legLen + 40;

/** Shoulder pivots in rig space. */
export const shoulders = (b: BaseDims): { L: [number, number]; R: [number, number] } => ({
  L: [540 - (b.sw - 45), 1262],
  R: [540 + (b.sw - 45), 1262],
});

/** Half-width of the torso at height y (linear from shoulders to hips). */
export const torsoHalfWidth = (b: BaseDims, y: number) => b.sw + ((b.hw - b.sw) * (y - 1250)) / (b.hipY - 1250);

export type Framing = 'full' | 'waist' | 'closeup' | 'hands' | 'small_distant';

/**
 * How a framing maps rig space onto the actor's x/y: `anchor` (rig space) lands on the placement point,
 * scaled by `scale`. Anchors follow the spec: feet for full, chest for waist, face for closeup.
 */
export const framingTransform = (framing: Framing, b: BaseDims): { anchor: [number, number]; scale: number } => {
  switch (framing) {
    case 'full':
      return { anchor: [540, feetY(b)], scale: 0.28 };
    case 'small_distant':
      return { anchor: [540, feetY(b)], scale: 0.12 };
    case 'closeup':
      return { anchor: [540, 990], scale: 1.3 };
    case 'hands':
      return { anchor: [540, 0], scale: 1 };
    case 'waist':
    default:
      return { anchor: [540, 1400], scale: 1 };
  }
};

export type Pose = {
  /** upper arm, degrees outward from hanging */
  uL: number;
  uR: number;
  /** forearm, degrees bent inward at the elbow */
  fL: number;
  fR: number;
  hands: { L: HandShape; R: HandShape };
  head?: number;
  headDy?: number;
  gaze?: [number, number];
};

export const POSES: Record<string, Pose> = {
  idle: { uL: 14, uR: 14, fL: 8, fR: 8, hands: { L: 'relaxed', R: 'relaxed' } },
  arms_crossed: { uL: 22, uR: 22, fL: 128, fR: 120, hands: { L: 'fist', R: 'fist' } },
  hands_on_hips: { uL: 40, uR: 40, fL: 70, fR: 70, hands: { L: 'fist', R: 'fist' } },
  pointing: { uL: 6, uR: 88, fL: 6, fR: 4, hands: { L: 'relaxed', R: 'point' } },
  thumb_out: { uL: 82, uR: 6, fL: 0, fR: 6, hands: { L: 'thumb_up', R: 'relaxed' } },
  holding_object: { uL: 12, uR: 12, fL: 78, fR: 78, hands: { L: 'holding', R: 'holding' } },
  hands_open_offering: { uL: 20, uR: 20, fL: 47, fR: 47, hands: { L: 'open_palm', R: 'open_palm' } },
  // upper arm raised past horizontal, forearm folded back to the ear (negative = bends outward)
  phone_to_ear: { uL: 14, uR: 110, fL: 8, fR: -122, hands: { L: 'relaxed', R: 'holding' }, head: 4 },
  /** one arm held out in front (a lantern, a lamp, an offering) */
  hold_out: { uL: 12, uR: 64, fL: 8, fR: 6, hands: { L: 'relaxed', R: 'holding' } },
  head_down: { uL: 4, uR: 4, fL: 4, fR: 4, hands: { L: 'relaxed', R: 'relaxed' }, headDy: 22, gaze: [0, 8] },
};

const rad = (d: number) => (d * Math.PI) / 180;

/** Forward kinematics: centre of a hand in rig space (for held props). */
export const handPosition = (b: BaseDims, side: 'L' | 'R', upper: number, fore: number): [number, number] => {
  const [sx, sy] = shoulders(b)[side];
  const m = side === 'L' ? 1 : -1;
  const u = UPPER_ARM * b.arm;
  const f = FORE_ARM * b.arm + 40;
  const ex = sx - m * u * Math.sin(rad(upper));
  const ey = sy + u * Math.cos(rad(upper));
  const a = upper - fore;
  return [ex - m * f * Math.sin(rad(a)), ey + f * Math.cos(rad(a))];
};
