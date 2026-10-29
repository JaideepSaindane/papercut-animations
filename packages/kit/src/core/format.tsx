import React, { createContext, useContext } from 'react';
import { FORMATS, type Format, type Rect } from '@papercut/schema';

export type FormatLayout = {
  format: Format;
  width: number;
  height: number;
  /** the window onto world coordinates that this format shows */
  view: Rect;
  caption: { top: number; maxWidth: number };
  /** screen-space rects where faces / key props / text must not go */
  unsafe: Rect[];
  /** screen-space rect that QA expects the main action inside */
  actionBox: Rect;
};

export const LAYOUTS: Record<Format, FormatLayout> = {
  vertical: {
    format: 'vertical',
    ...FORMATS.vertical,
    caption: { top: 250, maxWidth: 860 },
    unsafe: [
      { x: 0, y: 0, w: 1080, h: 200 }, // platform header
      { x: 0, y: 1500, w: 1080, h: 420 }, // username, description, buttons
      { x: 930, y: 900, w: 150, h: 600 }, // like/comment/share column
    ],
    actionBox: { x: 80, y: 420, w: 840, h: 1060 },
  },
  horizontal: {
    format: 'horizontal',
    ...FORMATS.horizontal,
    caption: { top: 64, maxWidth: 1400 },
    unsafe: [
      { x: 0, y: 1080 - 130, w: 1920, h: 130 }, // player controls / progress bar
    ],
    // title-safe: 5% margins
    actionBox: { x: 96, y: 54, w: 1728, h: 972 },
  },
};

const FormatCtx = createContext<FormatLayout>(LAYOUTS.vertical);

export const FormatProvider: React.FC<{ format: Format; children: React.ReactNode }> = ({ format, children }) => (
  <FormatCtx.Provider value={LAYOUTS[format]}>{children}</FormatCtx.Provider>
);

export const useFormat = () => useContext(FormatCtx);

/**
 * The visible world rect, padded by `margin` so backgrounds survive camera pans, pushes and shake.
 * Sets draw backdrops across this instead of hard-coded coordinates so they fill either format.
 */
export const useView = (margin = 260) => {
  const { view } = useFormat();
  return {
    x0: view.x - margin,
    x1: view.x + view.w + margin,
    y0: view.y - margin,
    y1: view.y + view.h + margin,
    w: view.w + 2 * margin,
    h: view.h + 2 * margin,
    /** unpadded edges: anchor framing elements (fg trees, ferns) to these */
    left: view.x,
    right: view.x + view.w,
    top: view.y,
    bottom: view.y + view.h,
    cx: view.x + view.w / 2,
    cy: view.y + view.h / 2,
  };
};

/** Group whose children are drawn in screen pixels (0..width, 0..height) rather than world coords. */
export const ScreenSpace: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { view } = useFormat();
  return <g transform={`translate(${view.x} ${view.y})`}>{children}</g>;
};
