import React, { createContext, useContext, useId } from 'react';
import { PAPER, palettes } from '../palettes';

const NsContext = createContext('pc');

export const SHADOW = [7, 14] as const;
export const CUT_BUCKETS = 24;
/** Shadow offset for filter variant k: the screen offset rotated by k × 15°. */
export const shadowOffset = (k: number): [number, number] => {
  const a = (k * 2 * Math.PI) / CUT_BUCKETS;
  const [x, y] = SHADOW;
  return [+(x * Math.cos(a) - y * Math.sin(a)).toFixed(2), +(x * Math.sin(a) + y * Math.cos(a)).toFixed(2)];
};

/**
 * Filter/gradient ids must be unique per mounted composition (the dashboard Player may mount several),
 * so every <svg> wraps its content in <FilterScope>, which namespaces ids via useId().
 */
export const useDefs = () => {
  const ns = useContext(NsContext);
  return {
    id: (name: string) => `${ns}-${name}`,
    url: (name: string) => `url(#${ns}-${name})`,
  };
};

const Gradient: React.FC<{ id: string; colors: readonly string[]; offsets: readonly number[] }> = ({
  id,
  colors,
  offsets,
}) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    {colors.map((c, i) => (
      <stop key={i} offset={offsets[i]} stopColor={c} />
    ))}
  </linearGradient>
);

const Defs: React.FC<{ ns: string }> = ({ ns }) => {
  const id = (n: string) => `${ns}-${n}`;
  return (
    <defs>
      {/* 24 variants of the cutout filter whose shadow offset is pre-rotated in 15° steps, so a
          rotated or mirrored part still casts its shadow down-right on screen (see Cutout). */}
      {Array.from({ length: CUT_BUCKETS }, (_, k) => {
        const [dx, dy] = shadowOffset(k);
        return (
          <filter
            key={k}
            id={id(`cut${k}`)}
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            {/* white die-cut border */}
            <feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d" />
            <feFlood floodColor={PAPER} result="w" />
            <feComposite in="w" in2="d" operator="in" result="border" />
            {/* soft drop shadow (paper lifted off the backdrop) */}
            <feGaussianBlur in="d" stdDeviation="9" result="sb" />
            <feOffset in="sb" dx={dx} dy={dy} result="so" />
            <feFlood floodColor="#120806" floodOpacity="0.55" />
            <feComposite in2="so" operator="in" result="shadow" />
            {/* paper fibre texture on the face of the cutout */}
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} result="noise" />
            <feComposite
              in="SourceGraphic"
              in2="noise"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="0.10"
              k4="-0.05"
              result="tex"
            />
            <feComposite in="tex" in2="SourceAlpha" operator="in" result="texc" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="border" />
              <feMergeNode in="texc" />
            </feMerge>
          </filter>
        );
      })}
      {/* Diorama paper: no die-cut border, a deeper soft shadow (the layer floats over the one behind),
          paper fibre, and a slight darkening along the cut edge. Same 24 rotation buckets as `cut`. */}
      {Array.from({ length: CUT_BUCKETS }, (_, k) => {
        const [dx, dy] = shadowOffset(k);
        return (
          <filter key={`p${k}`} id={id(`paper${k}`)} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="sb" />
            <feOffset in="sb" dx={dx * 1.3} dy={dy * 1.3} result="so" />
            <feFlood floodColor="#0e0614" floodOpacity="0.5" />
            <feComposite in2="so" operator="in" result="shadow" />
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={11} result="noise" />
            <feComposite in="SourceGraphic" in2="noise" operator="arithmetic" k1="0" k2="1" k3="0.09" k4="-0.045" result="tex" />
            <feComposite in="tex" in2="SourceAlpha" operator="in" result="texc" />
            <feMorphology in="SourceAlpha" operator="erode" radius="2.5" result="inner" />
            <feComposite in="SourceAlpha" in2="inner" operator="out" result="rim" />
            <feFlood floodColor="#000" floodOpacity="0.22" />
            <feComposite in2="rim" operator="in" result="rimDark" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="texc" />
              <feMergeNode in="rimDark" />
            </feMerge>
          </filter>
        );
      })}
      {/* Folk-pattern fills (folklore skin): Gond dots and lines, Madhubani scallops and zigzags.
          Used as an overlay on a shape that already has its base colour. */}
      {(
        [
          ['gold', '#f0c35a'],
          ['cream', '#f6ead0'],
          ['ink', '#1c1230'],
        ] as const
      ).map(([n, c]) => (
        <React.Fragment key={n}>
          <pattern id={id(`dots-${n}`)} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="2.2" fill={c} />
            <circle cx="16" cy="16" r="2.2" fill={c} />
          </pattern>
          <pattern id={id(`lines-${n}`)} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <rect x="0" y="0" width="3" height="14" fill={c} />
          </pattern>
          <pattern id={id(`scallop-${n}`)} width="28" height="18" patternUnits="userSpaceOnUse">
            <path d="M0 18 A14 14 0 0 1 28 18" fill="none" stroke={c} strokeWidth="2.5" />
            <circle cx="14" cy="9" r="2" fill={c} />
          </pattern>
          <pattern id={id(`zigzag-${n}`)} width="24" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 11 L6 3 L12 11 L18 3 L24 11" fill="none" stroke={c} strokeWidth="2.5" strokeLinejoin="round" />
          </pattern>
        </React.Fragment>
      ))}
      <linearGradient id={id('jewelDusk')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1f1b4d" />
        <stop offset="0.32" stopColor="#3c2e6e" />
        <stop offset="0.52" stopColor="#8a4a78" />
        <stop offset="0.64" stopColor="#e07a4a" />
        <stop offset="0.74" stopColor="#f2b35a" />
        <stop offset="1" stopColor="#f6cf7a" />
      </linearGradient>
      {[10, 6, 3].map((s) => (
        <filter key={s} id={id(`blur${s}`)} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={s} />
        </filter>
      ))}
      <filter id={id('glow')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="30" />
      </filter>
      {[0, 1, 2, 3].map((i) => (
        <filter key={i} id={id(`grain${i}`)}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={i + 1} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      ))}
      <Gradient id={id('dusk')} colors={palettes.dusk.sky} offsets={palettes.dusk.skyOffsets} />
      <Gradient id={id('night')} colors={palettes.night.sky} offsets={palettes.night.skyOffsets} />
      <Gradient id={id('day')} colors={palettes.day.sky} offsets={palettes.day.skyOffsets} />
      <radialGradient id={id('vig')} cx=".5" cy=".48" r=".75">
        <stop offset=".45" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".7" />
      </radialGradient>
    </defs>
  );
};

export const FilterScope: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ns = 'pc' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <NsContext.Provider value={ns}>
      <Defs ns={ns} />
      {children}
    </NsContext.Provider>
  );
};
