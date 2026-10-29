import type React from 'react';
import type { Rect } from '@papercut/schema';

export type SetLayerProps = {
  /** set params merged over defaults */
  v: Record<string, any>;
  /** palette name */
  pal: string;
};

export type SetFxAreas = {
  fireflies?: Rect;
  dust?: Rect;
  /** world y of the ground line (fog hugs it, rain splashes stop at it) */
  groundY?: number;
  /** default light_cone source */
  lightCone?: { x: number; y: number; width: number; length: number };
};

export type SetDef = {
  id: string;
  description: string;
  /** allowed palettes; the first is the default */
  palettes: string[];
  params: Record<string, string>;
  defaults: Record<string, any>;
  /** named world-space positions where actors go */
  anchors: Record<string, [number, number]>;
  /** ids that actions can target inside the set (lamp, door, window_light, ...) */
  elements: string[];
  /** fx areas for the given visible world rect (so they adapt to either format) */
  fx?: (view: { left: number; right: number; top: number; bottom: number }) => SetFxAreas;
  /** creative pack this set belongs to (see packs.ts) */
  pack?: string;
  /** render style the set is drawn for; stories using it should match */
  style?: 'diecut' | 'diorama';
  /** setVariant values worth reviewing (e.g. each time of day); the gallery renders one tile per entry */
  variants?: Record<string, any>[];
  /** depth layers; the Shot wraps each in its <Layer> and puts actors between them */
  sky?: React.FC<SetLayerProps>;
  far?: React.FC<SetLayerProps>;
  mid?: React.FC<SetLayerProps>;
  fg?: React.FC<SetLayerProps>;
};

/** Backdrops span the padded view horizontally but keep world-fixed y so gradients match the prototype. */
export const BG_Y = -200;
export const BG_H = 2320;
