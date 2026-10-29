export const INK = '#2b1d17';
export const PAPER = '#f3ead8';

export const palettes = {
  dusk: {
    sky: ['#341424', '#7d2a33', '#cf6a3e', '#f0b36b', '#f6cf8a'],
    skyOffsets: [0, 0.3, 0.52, 0.62, 1],
    ground: '#55703e',
    accent: '#ffcf6e',
  },
  night: {
    sky: ['#0a1219', '#1a2a31', '#22352f'],
    skyOffsets: [0, 0.55, 1],
    ground: '#26332a',
    accent: '#d8f08a',
    moon: '#efe6c8',
  },
  interiorWarm: { wall: '#6b2230', stripe: '#5a1b28', wainscot: '#3b2620', rail: '#8a5a3a', lamp: '#ffd990' },
  interiorDark: { wall: '#2a1b24', stripe: '#241720', floor: '#1c1218', lamp: '#ffe39a' },
  day: {
    sky: ['#9cc3d6', '#d8e6dc', '#efe2c4'],
    skyOffsets: [0, 0.5, 1],
    ground: '#7c8c4a',
    accent: '#f2c45a',
  },
  police: { wall: '#3c4a52', stripe: '#34424a', floor: '#2a2f33', lamp: '#d8e4ff' },
} as const;

export type PaletteName = keyof typeof palettes;

/** Skin tones, light to dark. */
export const skin = {
  skin1: '#f3cba8',
  skin2: '#edbb93',
  skin3: '#e0a982',
  skin4: '#c68b62',
  skin5: '#9a6343',
  skin6: '#6b412b',
} as const;

export const hair = {
  blond: '#d4ad55',
  brown: '#6b4428',
  darkBrown: '#3f2a1c',
  black: '#1f1a18',
  auburn: '#8a3f22',
  red: '#a94a26',
  grey: '#9a948a',
  white: '#e3ddcf',
} as const;

/** Muted 1970s–1990s clothing tones. */
export const cloth = {
  olive: '#7c6a3c',
  mustard: '#b8902e',
  rust: '#9a4a2a',
  brown: '#6b4428',
  cream: '#e8e0cc',
  denim: '#3f5c8a',
  navy: '#2c3a54',
  forest: '#2f5f52',
  burgundy: '#6b2230',
  grey: '#6e6a64',
  charcoal: '#36332f',
  tan: '#b89a6c',
} as const;

/** Resolve a palette key (or a literal #hex) to a colour. */
export const colour = (key: string): string =>
  key.startsWith('#') ? key : ((skin as any)[key] ?? (hair as any)[key] ?? (cloth as any)[key] ?? '#ff00ff');
