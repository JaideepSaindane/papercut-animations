import React, { createContext, useContext } from 'react';
import { INK } from '../palettes';
import { CUT_BUCKETS, SHADOW, useDefs } from './Filters';
import { useStyle } from './style';

/**
 * Accumulated rotation/mirror (2×2 linear part, screen = M · local) of the current group, so that
 * Cutout can pick the filter variant whose shadow still falls down-right on screen.
 */
type Mat = [number, number, number, number]; // [a b; c d]
const CutFrame = createContext<Mat>([1, 0, 0, 1]);
const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
];

/** Index of the cut filter variant for a frame matrix (exported for tests). */
export const cutBucket = (m: Mat) => {
  // local shadow vector = Mᵀ · screen shadow (M is orthonormal)
  const [sx, sy] = SHADOW;
  const vx = m[0] * sx + m[2] * sy;
  const vy = m[1] * sx + m[3] * sy;
  const diff = Math.atan2(vy, vx) - Math.atan2(sy, sx);
  const k = Math.round((diff / (2 * Math.PI)) * CUT_BUCKETS);
  return ((k % CUT_BUCKETS) + CUT_BUCKETS) % CUT_BUCKETS;
};
export const rotMat = (deg: number): Mat => {
  const r = (deg * Math.PI) / 180;
  return [Math.cos(r), -Math.sin(r), Math.sin(r), Math.cos(r)];
};

type Extra = Omit<React.SVGProps<SVGElement>, 'ref'>;

// Ink-line primitives: every shape inside a cutout gets the ink stroke (width 3, round joins).
/** Outline colour for the current style: ink for die-cut, none for diorama (paper edges only). */
const useInk = () => (useStyle() === 'diorama' ? 'none' : INK);

export const P: React.FC<{ d: string; fill: string } & Extra> = ({ d, fill, ...rest }) => (
  <path d={d} fill={fill} stroke={useInk()} strokeWidth={3} strokeLinejoin="round" {...(rest as any)} />
);
export const R: React.FC<{ x: number; y: number; w: number; h: number; fill: string } & Extra> = ({
  x,
  y,
  w,
  h,
  fill,
  ...rest
}) => <rect x={x} y={y} width={w} height={h} fill={fill} stroke={useInk()} strokeWidth={3} {...(rest as any)} />;
export const C: React.FC<{ cx: number; cy: number; r: number; fill: string } & Extra> = ({
  cx,
  cy,
  r,
  fill,
  ...rest
}) => <circle cx={cx} cy={cy} r={r} fill={fill} stroke={useInk()} strokeWidth={3} {...(rest as any)} />;
export const E: React.FC<{ cx: number; cy: number; rx: number; ry: number; fill: string } & Extra> = ({
  cx,
  cy,
  rx,
  ry,
  fill,
  ...rest
}) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={useInk()} strokeWidth={3} {...(rest as any)} />
);

/** A die-cut paper part. Each part gets its own filter so overlapping parts show their own borders. */
export const Cutout: React.FC<{ children: React.ReactNode } & Extra> = ({ children, ...rest }) => {
  const { url } = useDefs();
  const frame = useContext(CutFrame);
  const kind = useStyle() === 'diorama' ? 'paper' : 'cut';
  return (
    <g filter={url(`${kind}${cutBucket(frame)}`)} {...(rest as any)}>
      {children}
    </g>
  );
};

export const Blur: React.FC<{ children: React.ReactNode; amount?: 10 | 6 | 3 }> = ({
  children,
  amount = 10,
}) => {
  const { url } = useDefs();
  return <g filter={url(`blur${amount}`)}>{children}</g>;
};

/** Rotate children by `a` degrees about (cx, cy) — the split-pin puppet joint. */
export const Rot: React.FC<{ a: number; cx?: number; cy?: number; children: React.ReactNode }> = ({
  a,
  cx = 0,
  cy = 0,
  children,
}) => {
  const frame = useContext(CutFrame);
  return (
    <CutFrame.Provider value={mul(frame, rotMat(a))}>
      <g transform={`rotate(${a} ${cx} ${cy})`}>{children}</g>
    </CutFrame.Provider>
  );
};

/** Mirror children horizontally about x = cx when `on`. */
export const Mirror: React.FC<{ on: boolean; cx?: number; children: React.ReactNode }> = ({
  on,
  cx = 0,
  children,
}) => {
  const frame = useContext(CutFrame);
  if (!on) return <>{children}</>;
  return (
    <CutFrame.Provider value={mul(frame, [-1, 0, 0, 1])}>
      <g transform={`translate(${2 * cx} 0) scale(-1 1)`}>{children}</g>
    </CutFrame.Provider>
  );
};

/** A shape filled with a folk pattern over its base colour (folklore skin). */
export const Patterned: React.FC<{ d: string; fill: string; pattern: string; opacity?: number } & Extra> = ({
  d,
  fill,
  pattern,
  opacity = 0.85,
  ...rest
}) => {
  const { url } = useDefs();
  return (
    <>
      <path d={d} fill={fill} {...(rest as any)} />
      <path d={d} fill={url(pattern)} opacity={opacity} />
    </>
  );
};

/**
 * Gond-style shape: a flat base fill plus a row of dots following the outline just inside the edge
 * (the shape redrawn smaller about its centre with a dotted stroke).
 */
export const Gond: React.FC<{ d: string; fill: string; dot?: string; cx: number; cy: number; inset?: number; gap?: number; size?: number; pattern?: string; patternOpacity?: number }> = ({
  d,
  fill,
  dot = '#f6ead0',
  cx,
  cy,
  inset = 0.86,
  gap = 16,
  size = 5,
  pattern,
  patternOpacity = 0.35,
}) => {
  const { url } = useDefs();
  return (
    <>
      <path d={d} fill={fill} />
      {pattern && <path d={d} fill={url(pattern)} opacity={patternOpacity} />}
      <g transform={`translate(${cx} ${cy}) scale(${inset}) translate(${-cx} ${-cy})`}>
        <path d={d} fill="none" stroke={dot} strokeWidth={size / inset} strokeLinecap="round" strokeDasharray={`0 ${gap / inset}`} />
      </g>
    </>
  );
};

/** A scalloped (leafy) blob around (cx, cy): `n` bumps on an ellipse. */
export const scallopPath = (cx: number, cy: number, rx: number, ry: number, n = 9, bump = 0.22, phase = 0) => {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    if (i === 0) d = `M${x} ${y}`;
    else {
      const am = phase + ((i - 0.5) / n) * Math.PI * 2;
      const qx = cx + rx * (1 + bump) * Math.cos(am);
      const qy = cy + ry * (1 + bump) * Math.sin(am);
      d += ` Q${qx} ${qy} ${x} ${y}`;
    }
  }
  return d + ' Z';
};
