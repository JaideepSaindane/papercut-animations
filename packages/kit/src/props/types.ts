import type React from 'react';
import type { TargetState } from '../core/actions';

export type PropProps = { params: Record<string, any>; state: TargetState };

export type PropDef = {
  id: string;
  description: string;
  /** param name -> type/doc for the manifest */
  params: Record<string, string>;
  /** local bounding box [x, y, w, h] around the prop origin (gallery framing, safe-zone QA) */
  bbox: [number, number, number, number];
  /** named pivots in local coords; fall_over uses base_left/base_right, swing uses hang */
  pivots?: Record<string, [number, number]>;
  /** where the origin is, for the planner ("base centre", "hang point", ...) */
  origin: string;
  Component: React.FC<PropProps>;
};

/** Default pivots for a prop standing on its base, `hw` = half its base width. */
export const basePivots = (hw: number): Record<string, [number, number]> => ({
  base_left: [-hw, 0],
  base_right: [hw, 0],
});
