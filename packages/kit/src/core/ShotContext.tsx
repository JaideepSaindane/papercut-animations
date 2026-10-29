import React, { createContext, useContext, useMemo } from 'react';
import type { Action, CharacterSpec, FxEntry, FxId, Shot } from '@papercut/schema';
import { quantize12 } from './math';
import { evalTarget, type TargetState } from './actions';
import { useView } from './format';

export type ShotState = {
  shot: Shot;
  characters: CharacterSpec[];
  fx: FxEntry[];
  /** seconds since shot start */
  t: number;
  /** shot progress 0..1 */
  p: number;
  /** frame within the whole story (drives grain + jitter) */
  globalFrame: number;
  fps: number;
  durationInFrames: number;
};

const ShotCtx = createContext<ShotState | null>(null);

export const ShotProvider: React.FC<{ value: ShotState; children: React.ReactNode }> = ({
  value,
  children,
}) => <ShotCtx.Provider value={value}>{children}</ShotCtx.Provider>;

export const useShot = () => {
  const s = useContext(ShotCtx);
  if (!s) throw new Error('useShot() outside <ShotProvider>');
  return s;
};

/**
 * Time for the current shot. `tq`/`pq` are quantized to 12 fps — use them for puppet motion
 * (stop-motion feel); use `t`/`p` for camera and light.
 */
export const useStopMotionTime = () => {
  const { t, p, durationInFrames, fps } = useShot();
  const tq = quantize12(t);
  return { t, p, tq, pq: tq / (durationInFrames / fps) };
};

/** Find an action in the current shot. Returns null when the spec doesn't ask for it. */
export const useAction = (target: string, action: string): Action | null => {
  const { shot } = useShot();
  return shot.actions.find((a) => a.target === target && a.action === action) ?? null;
};

export const useFxEntry = (id: FxId): FxEntry | null => {
  const { fx } = useShot();
  return fx.find((f) => f.id === id) ?? null;
};

export const useCharacter = (id: string): CharacterSpec | undefined => {
  const { characters } = useShot();
  return characters.find((c) => c.id === id);
};

/**
 * Combined state of every action aimed at `target` (an actor ref, a set element id like "lamp", ...).
 * `placeX`/`placeScale` describe where the target sits, for movement actions like drive_in.
 */
export const useTarget = (target: string, placeX = 540, placeScale = 1): TargetState => {
  const { shot, t, p } = useShot();
  const { tq, pq } = useStopMotionTime();
  const v = useView(0);
  return useMemo(
    () =>
      evalTarget(shot.actions, target, { t, tq, p, pq, placeX, placeScale, viewX0: v.left, viewX1: v.right }),
    [shot.actions, target, t, tq, p, pq, placeX, placeScale, v.left, v.right],
  );
};
