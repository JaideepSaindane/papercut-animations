// Action library (spec 7.4). Every action is a pure function that adds its effect to a TargetState.
// Puppet actions run on 12 fps quantized time (stop-motion); light and camera actions run smooth.
import type { Action } from '@papercut/schema';
import { easeInOutQuad, easeOutBack, easeOutBounce, easeOutCubic, seededRandom, seg } from './math';

export type HandShape = 'relaxed' | 'fist' | 'open_palm' | 'point' | 'thumb_up' | 'holding';

export const PART_NAMES = [
  'head',
  'headDx',
  'headDy',
  'upperArmL',
  'upperArmR',
  'foreArmL',
  'foreArmR',
  'legL',
  'legR',
  'bodyDy',
] as const;
export type PartName = (typeof PART_NAMES)[number];

export type TargetState = {
  dx: number;
  dy: number;
  /** degrees, about `pivot` */
  rot: number;
  /** named pivot on the target (prop defs declare base_left, base_right, hang) */
  pivot?: string;
  scale: number;
  opacity: number;
  /** additive rig offsets: arms are degrees "outward" from hanging, forearms degrees bent inward */
  parts: Record<PartName, number>;
  blink: boolean;
  /** pupil offset in px */
  gaze: [number, number];
  /** light level multiplier for lamps / windows (1 = on) */
  light: number;
  /** doors: 0 = closed, 1 = open; undefined = leave as the set/prop default */
  open?: number;
  /** wheel rotation in degrees */
  wheel: number;
  hands: { L?: HandShape; R?: HandShape };
  expression?: string;
};

export const emptyState = (): TargetState => ({
  dx: 0,
  dy: 0,
  rot: 0,
  scale: 1,
  opacity: 1,
  parts: Object.fromEntries(PART_NAMES.map((n) => [n, 0])) as Record<PartName, number>,
  blink: false,
  gaze: [0, 0],
  light: 1,
  wheel: 0,
  hands: {},
});

export type ActionCtx = {
  /** seconds since shot start (smooth / quantized) */
  t: number;
  tq: number;
  /** shot progress 0..1 (smooth / quantized) */
  p: number;
  pq: number;
  /** this action's progress 0..1 on its own clock (0 before `at`, 1 after `at + dur`) */
  u: number;
  /** clock-appropriate shot progress (pq for puppet actions, p for smooth) */
  pc: number;
  active: boolean;
  /** world x of the target's placement (for drive_in etc.) */
  placeX: number;
  placeScale: number;
  /** padded world view edges, so things can enter from off-screen in either format */
  viewX0: number;
  viewX1: number;
};

export type TargetKind = 'character' | 'prop' | 'element' | 'camera';

export type ActionDef = {
  id: string;
  description: string;
  targets: TargetKind[];
  clock: 'puppet' | 'smooth';
  /** param name -> type/doc, for the manifest */
  params: Record<string, string>;
  /** default `dur` when the spec doesn't give one that makes sense */
  apply: (s: TargetState, a: Action, c: ActionCtx) => void;
};

const P = <T>(a: Action, k: string, d: T): T => (a.params?.[k] as T | undefined) ?? d;
const easeInCubic = (x: number) => x * x * x;
const armKey = (side: string) => (side === 'L' ? 'upperArmL' : 'upperArmR') as PartName;
const foreKey = (side: string) => (side === 'L' ? 'foreArmL' : 'foreArmR') as PartName;
/** 0 → 1 ramp over the first 20% of the action and back to 0 over the last 20%. */
const envelope = (u: number) => easeInOutQuad(seg(u, 0, 0.2)) * (1 - easeInOutQuad(seg(u, 0.8, 1)));

const defs: ActionDef[] = [
  // ---- faces & heads ----
  {
    id: 'blink',
    description: 'Eyes close for the action window (use dur ≈ 0.07).',
    targets: ['character'],
    clock: 'puppet',
    params: {},
    apply: (s, _a, c) => {
      if (c.active) s.blink = true;
    },
  },
  {
    id: 'head_turn',
    description: 'Head rotates from one angle to another and holds.',
    targets: ['character'],
    clock: 'puppet',
    params: { from: 'number (deg, default -4)', to: 'number (deg, default 3)' },
    apply: (s, a, c) => {
      const from = P(a, 'from', -4);
      s.parts.head += from + (P(a, 'to', 3) - from) * easeInOutQuad(c.u);
    },
  },
  {
    id: 'head_tilt',
    description: 'Head tilts to an angle and holds.',
    targets: ['character'],
    clock: 'puppet',
    params: { angle: 'number (deg, default 8)' },
    apply: (s, a, c) => {
      s.parts.head += P(a, 'angle', 8) * easeInOutQuad(c.u);
    },
  },
  {
    id: 'nod',
    description: 'Head dips down and up `count` times.',
    targets: ['character'],
    clock: 'puppet',
    params: { amp: 'number (px, default 16)', count: 'number (default 2)' },
    apply: (s, a, c) => {
      if (c.active) s.parts.headDy += P(a, 'amp', 16) * Math.abs(Math.sin(c.u * Math.PI * P(a, 'count', 2)));
    },
  },
  {
    id: 'shake_head',
    description: 'Head shakes side to side, decaying.',
    targets: ['character'],
    clock: 'puppet',
    params: { amp: 'number (deg, default 7)', count: 'number (default 3)' },
    apply: (s, a, c) => {
      if (c.active) s.parts.head += P(a, 'amp', 7) * Math.sin(c.u * 2 * Math.PI * P(a, 'count', 3)) * (1 - c.u);
    },
  },
  {
    id: 'look_up',
    description: 'Head lifts and eyes look up, and holds.',
    targets: ['character'],
    clock: 'puppet',
    params: {},
    apply: (s, _a, c) => {
      const e = easeInOutQuad(c.u);
      s.parts.headDy -= 10 * e;
      s.gaze[1] -= 6 * e;
    },
  },
  {
    id: 'expression',
    description: 'Switch to another expression at `at`.',
    targets: ['character'],
    clock: 'puppet',
    params: { to: 'neutral|vacant|worried|angry|shocked|smile|sad' },
    apply: (s, a, c) => {
      if (c.u > 0) s.expression = P(a, 'to', 'neutral');
    },
  },
  // ---- arms ----
  {
    id: 'arm_swing',
    description: 'Both arms sway gently (idle life).',
    targets: ['character'],
    clock: 'puppet',
    params: { amp: 'number (deg, default 2)', speed: 'number (rad/s, default 2.5)' },
    apply: (s, a, c) => {
      if (!c.active) return;
      const sw = P(a, 'amp', 2) * Math.sin(c.tq * P(a, 'speed', 2.5));
      s.parts.upperArmL += sw;
      s.parts.upperArmR += sw;
    },
  },
  {
    id: 'wave',
    description: 'One arm raises and waves an open hand.',
    targets: ['character'],
    clock: 'puppet',
    params: { arm: 'L|R (default R)', speed: 'number (rad/s, default 10)' },
    apply: (s, a, c) => {
      if (!c.active) return;
      const side = P(a, 'arm', 'R');
      const e = envelope(c.u);
      s.parts[armKey(side)] += 140 * e;
      s.parts[foreKey(side)] += e * (25 + 20 * Math.sin(c.tq * P(a, 'speed', 10)));
      if (e > 0.5) s.hands[side as 'L' | 'R'] = 'open_palm';
    },
  },
  {
    id: 'thumb_out_wave',
    description: 'Hitchhiker thumb arm bobs during the window, then lowers.',
    targets: ['character'],
    clock: 'puppet',
    params: { arm: 'L|R (default L)', amp: 'number (deg, default 10)', lowerBy: 'number (deg, default 70)' },
    apply: (s, a, c) => {
      const key = armKey(P(a, 'arm', 'L'));
      const end = a.at + a.dur;
      if (c.pc < end) s.parts[key] += P(a, 'amp', 10) * Math.sin(c.tq * 7);
      else s.parts[key] -= P(a, 'lowerBy', 70) * easeOutCubic(seg(c.pc, end, end + 0.18));
    },
  },
  {
    id: 'point',
    description: 'One arm raises to point; holds.',
    targets: ['character'],
    clock: 'puppet',
    params: { arm: 'L|R (default R)', angle: 'number (deg outward, default 80)' },
    apply: (s, a, c) => {
      const side = P(a, 'arm', 'R');
      s.parts[armKey(side)] += P(a, 'angle', 80) * easeOutBack(c.u);
      if (c.u > 0.3) s.hands[side as 'L' | 'R'] = 'point';
    },
  },
  {
    id: 'open_hands',
    description: 'Both forearms lift with open palms (offering / pleading); holds.',
    targets: ['character'],
    clock: 'puppet',
    params: {},
    apply: (s, _a, c) => {
      const e = easeOutBack(c.u);
      s.parts.upperArmL += 18 * e;
      s.parts.upperArmR += 18 * e;
      s.parts.foreArmL += 70 * e;
      s.parts.foreArmR += 70 * e;
      if (c.u > 0.3) s.hands = { L: 'open_palm', R: 'open_palm' };
    },
  },
  {
    id: 'walk_in_place',
    description: 'Legs and arms alternate in stop-motion steps with a body bob.',
    targets: ['character'],
    clock: 'puppet',
    params: { steps: 'number (steps/s, default 2.5)' },
    apply: (s, a, c) => {
      if (!c.active) return;
      const step = Math.floor(c.tq * P(a, 'steps', 2.5) * 2) % 2 ? 1 : -1;
      s.parts.legL += 14 * step;
      s.parts.legR += 14 * step;
      s.parts.upperArmL -= 10 * step;
      s.parts.upperArmR -= 10 * step;
      s.parts.bodyDy -= step > 0 ? 6 : 0;
    },
  },
  // ---- movement ----
  ...(['left', 'right'] as const).flatMap((side): ActionDef[] => [
    {
      id: `enter_from_${side}`,
      description: `Slides in from the ${side} edge, easing out.`,
      targets: ['character', 'prop'],
      clock: 'puppet',
      params: {},
      apply: (s, _a, c) => {
        const from = side === 'left' ? c.viewX0 - 300 : c.viewX1 + 300;
        s.dx += (from - c.placeX) * (1 - easeOutCubic(c.u));
      },
    },
    {
      id: `exit_${side}`,
      description: `Slides out past the ${side} edge, easing in.`,
      targets: ['character', 'prop'],
      clock: 'puppet',
      params: {},
      apply: (s, _a, c) => {
        const to = side === 'left' ? c.viewX0 - 300 : c.viewX1 + 300;
        s.dx += (to - c.placeX) * easeInCubic(c.u);
      },
    },
  ]),
  {
    id: 'drive_in',
    description: 'Vehicle drives in from fromX to its placement x, wheels spinning.',
    targets: ['prop'],
    clock: 'puppet',
    params: { fromX: 'number (world x, default off-screen left)' },
    apply: (s, a, c) => {
      const from = P(a, 'fromX', c.viewX0 - 800);
      const e = easeOutCubic(c.u);
      s.dx += (from - c.placeX) * (1 - e);
      s.wheel += (((c.placeX - from) * e) / (44 * c.placeScale)) * 57.3;
    },
  },
  {
    id: 'drive_out',
    description: 'Vehicle accelerates away to toX.',
    targets: ['prop'],
    clock: 'puppet',
    params: { toX: 'number (world x, default off-screen right)' },
    apply: (s, a, c) => {
      const to = P(a, 'toX', c.viewX1 + 300);
      const e = easeInCubic(c.u);
      s.dx += (to - c.placeX) * e;
      s.wheel += (((to - c.placeX) * e) / (44 * c.placeScale)) * 57.3;
    },
  },
  // ---- objects ----
  {
    id: 'fall_over',
    description: 'Topples about its base corner with a bounce.',
    targets: ['prop'],
    clock: 'puppet',
    params: { direction: 'left|right (default right)', angle: 'number (deg, default 90)' },
    apply: (s, a, c) => {
      const dir = P<string>(a, 'direction', 'right');
      s.rot += (dir === 'left' ? -1 : 1) * P(a, 'angle', 90) * easeOutBounce(c.u);
      s.pivot = dir === 'left' ? 'base_left' : 'base_right';
    },
  },
  {
    id: 'swing',
    description: 'Pendulum swing about the hang point (hanging lamps, signs).',
    targets: ['prop', 'element'],
    clock: 'puppet',
    params: { angle: 'number (deg, default 14)', speed: 'number (rad/s, default 3.2)' },
    apply: (s, a, c) => {
      if (!c.active) return;
      s.rot += P(a, 'angle', 14) * Math.sin(c.tq * P(a, 'speed', 3.2) + P(a, 'phase', 0.4));
      s.pivot = 'hang';
    },
  },
  {
    id: 'flicker',
    description: 'Light flickers during the window, then settles dim.',
    targets: ['prop', 'element'],
    clock: 'smooth',
    params: { settle: 'number (light level after, default 0.3)' },
    apply: (s, a, c) => {
      if (c.u <= 0) return;
      s.light *= c.active ? (seededRandom(Math.floor(c.t * 24)) > 0.45 ? 0.55 : 0.15) : P(a, 'settle', 0.3);
    },
  },
  {
    id: 'door_open',
    description: 'Door swings open; holds.',
    targets: ['prop', 'element'],
    clock: 'puppet',
    params: {},
    apply: (s, _a, c) => {
      s.open = easeInOutQuad(c.u);
    },
  },
  {
    id: 'door_close',
    description: 'Door swings shut; holds.',
    targets: ['prop', 'element'],
    clock: 'puppet',
    params: {},
    apply: (s, _a, c) => {
      s.open = 1 - easeInOutQuad(c.u);
    },
  },
  {
    id: 'slam',
    description: 'Drops in from above and lands with a bounce (newspapers, files). Pair with a camera shake.',
    targets: ['prop'],
    clock: 'puppet',
    params: { height: 'number (px, default 1100)' },
    apply: (s, a, c) => {
      s.dy -= P(a, 'height', 1100) * (1 - easeOutBounce(c.u));
    },
  },
  {
    id: 'pop_in',
    description: 'Scales up from nothing with overshoot.',
    targets: ['prop', 'character'],
    clock: 'puppet',
    params: {},
    apply: (s, _a, c) => {
      s.scale *= Math.max(0, easeOutBack(c.u));
    },
  },
  {
    id: 'float',
    description: 'Gentle bob up and down.',
    targets: ['prop', 'character', 'element'],
    clock: 'smooth',
    params: { amp: 'number (px, default 10)', speed: 'number (rad/s, default 2)' },
    apply: (s, a, c) => {
      if (c.active) s.dy += P(a, 'amp', 10) * Math.sin(c.t * P(a, 'speed', 2));
    },
  },
  {
    id: 'tremble',
    description: 'Fine nervous shaking.',
    targets: ['prop', 'character'],
    clock: 'smooth',
    params: { amp: 'number (px, default 4)' },
    apply: (s, a, c) => {
      if (!c.active) return;
      const f = Math.floor(c.t * 24);
      s.dx += (seededRandom(f) - 0.5) * 2 * P(a, 'amp', 4);
      s.dy += (seededRandom(f + 77) - 0.5) * 2 * P(a, 'amp', 4);
    },
  },
  {
    id: 'shake',
    description: 'Camera shake, decaying (target "camera").',
    targets: ['camera'],
    clock: 'smooth',
    params: { amp: 'number (px, default 14)' },
    apply: () => {},
  },
];

export const ACTIONS: Record<string, ActionDef> = Object.fromEntries(defs.map((d) => [d.id, d]));

/** Evaluate every action aimed at `target` into one state. Pure — unit tested. */
export const evalTarget = (
  actions: Action[],
  target: string,
  base: Omit<ActionCtx, 'u' | 'pc' | 'active'>,
): TargetState => {
  const s = emptyState();
  for (const a of actions) {
    if (a.target !== target) continue;
    const def = ACTIONS[a.action];
    if (!def) continue;
    const pc = def.clock === 'puppet' ? base.pq : base.p;
    const u = seg(pc, a.at, a.at + Math.max(a.dur, 1e-6));
    def.apply(s, a, { ...base, pc, u, active: pc >= a.at && pc < a.at + a.dur });
  }
  return s;
};

/** SVG transform for a target state, rotating about the given pivot point. */
export const stateTransform = (s: TargetState, pivot: [number, number] = [0, 0]) =>
  `translate(${s.dx} ${s.dy}) rotate(${s.rot} ${pivot[0]} ${pivot[1]}) ` +
  `translate(${pivot[0]} ${pivot[1]}) scale(${s.scale}) translate(${-pivot[0]} ${-pivot[1]})`;
