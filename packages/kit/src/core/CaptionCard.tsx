import React, { useMemo } from 'react';
import { INK } from '../palettes';
import { useDefs } from './Filters';
import { useFormat } from './format';
import { useStyle } from './style';
import { useCaptionFont } from './fonts';
import { clamp, easeOutBack } from './math';

const CARD = '#efe5cf';
const RULE = '#3b2b22';
const PIN = '#b68a3a';
export const CAPTION_BASE_SIZE = 54;
export const CAPTION_MIN_SIZE = 40;
export const CAPTION_MAX_WIDTH = 860;

let ctx: CanvasRenderingContext2D | null = null;
const measure = (text: string, size: number, family: string) => {
  ctx ??= document.createElement('canvas').getContext('2d')!;
  ctx.font = `${size}px "${family}"`;
  return ctx.measureText(text).width;
};

/** Split text into two lines at the space nearest the middle. */
const splitTwo = (text: string): [string, string] => {
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return best < 0 ? [text, ''] : [text.slice(0, best), text.slice(best + 1)];
};

export type CaptionLayout = { lines: string[]; size: number; width: number };

/** Fit text: shrink from 54 px to fit maxWidth (860 px vertical); wrap to 2 lines if it would go below 40 px. */
export const layoutCaption = (
  text: string,
  measureFn: (text: string, size: number) => number,
  maxWidth = CAPTION_MAX_WIDTH,
): CaptionLayout => {
  const w = measureFn(text, CAPTION_BASE_SIZE);
  if (w <= maxWidth) return { lines: [text], size: CAPTION_BASE_SIZE, width: w };
  const shrunk = (CAPTION_BASE_SIZE * maxWidth) / w;
  if (shrunk >= CAPTION_MIN_SIZE) return { lines: [text], size: shrunk, width: measureFn(text, shrunk) };
  const lines = splitTwo(text);
  const widest = Math.max(...lines.map((l) => measureFn(l, CAPTION_BASE_SIZE)));
  const size = Math.min(CAPTION_BASE_SIZE, (CAPTION_BASE_SIZE * maxWidth) / widest);
  return { lines, size, width: Math.max(...lines.map((l) => measureFn(l, size))) };
};

/**
 * The vintage caption card (spec 3.6). Drops in from y=-200 over 0.28 s with easeOutBack while the
 * tilt settles from 3×tilt to tilt. Drawn in screen space; position and max width come from the format.
 */
export const CaptionCard: React.FC<{
  text: string;
  /** seconds since the shot started */
  t: number;
  tilt: number;
  lang?: string;
  opacity?: number;
}> = ({ text, t, tilt, lang = 'en-IN', opacity = 1 }) => {
  const { url } = useDefs();
  const { ready, family } = useCaptionFont(lang);
  const { width, caption } = useFormat();
  const paper = useStyle() === 'diorama';
  const cx = width / 2;
  const layout = useMemo(
    () => (ready ? layoutCaption(text, (s, size) => measure(s, size, family), caption.maxWidth) : null),
    [ready, text, family, caption.maxWidth],
  );
  if (!layout) return null;
  const { lines, size: fs, width: w } = layout;
  const lineH = fs * 1.12;
  const cw = w + 110;
  const ch = fs + 70 + (lines.length - 1) * lineH;
  const x = cx - cw / 2;
  const e = easeOutBack(clamp(t / 0.28));
  const y = -200 + (caption.top + 200) * e;
  const a = tilt * (1 + 2 * (1 - e));
  const corners: [number, number][] = [
    [x + 24, 24],
    [x + cw - 24, 24],
    [x + 24, ch - 24],
    [x + cw - 24, ch - 24],
  ];
  const firstBaseline = ch / 2 + fs * 0.32 - ((lines.length - 1) * lineH) / 2;
  return (
    <g transform={`translate(0 ${y}) rotate(${a} ${cx} ${ch / 2})`} opacity={opacity} filter={url(paper ? 'paper0' : 'cut0')}>
      <rect x={x} y={0} width={cw} height={ch} fill={CARD} stroke={RULE} strokeWidth={3} />
      <rect x={x + 10} y={10} width={cw - 20} height={ch - 20} fill="none" stroke={RULE} strokeWidth={1.5} />
      <rect x={x + 15} y={15} width={cw - 30} height={ch - 30} fill="none" stroke={RULE} strokeWidth={1} />
      {corners.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3} fill={RULE} />
      ))}
      <circle cx={cx} cy={2} r={9} fill={PIN} stroke={RULE} strokeWidth={2} />
      {lines.map((l, i) => (
        <text
          key={i}
          x={cx}
          y={firstBaseline + i * lineH}
          textAnchor="middle"
          fontFamily={family}
          fontSize={fs}
          fill={INK}
        >
          {l}
        </text>
      ))}
    </g>
  );
};
