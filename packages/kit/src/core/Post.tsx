import React from 'react';
import { useDefs } from './Filters';
import { useFormat } from './format';
import { seededRandom } from './math';

/** Hand-held jitter: seeded ±1.25 px, changed every 2 frames. */
export const jitterTransform = (frame: number) => {
  const i = Math.floor(frame / 2);
  return `translate(${(seededRandom(i) - 0.5) * 2.5} ${(seededRandom(i + 99) - 0.5) * 2.5})`;
};

export const Jitter: React.FC<{ frame: number; children: React.ReactNode }> = ({ frame, children }) => (
  <g transform={jitterTransform(frame)}>{children}</g>
);

/** Vignette + film grain (grain seed cycles through 4 every 2 frames). Always on. */
export const Post: React.FC<{ frame: number }> = ({ frame }) => {
  const { url } = useDefs();
  const { width, height } = useFormat();
  return (
    <>
      <rect x={0} y={0} width={width} height={height} fill={url('vig')} />
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        filter={url(`grain${Math.floor(frame / 2) % 4}`)}
        opacity={0.16}
        style={{ mixBlendMode: 'overlay' }}
      />
    </>
  );
};
