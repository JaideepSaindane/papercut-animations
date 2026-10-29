import React from 'react';
import type { Camera } from '@papercut/schema';
import { easeInOutQuad } from './math';
import { useShot } from './ShotContext';
import { useFormat } from './format';
import { Blur } from './Ink';
import { useStyle } from './style';

export type Depth = 'sky' | 'far' | 'mid' | 'subject' | 'fg' | 'fx';

/** Camera parallax factor per depth (spec 3.3). fg uses camera.fgParallax. */
export const PARALLAX: Record<Exclude<Depth, 'fg'>, number> = {
  sky: 0.3,
  far: 0.4,
  mid: 1,
  subject: 1,
  fx: 1,
};

/** Default blur per depth. `sky` stays sharp (the prototype keeps the sun crisp); `far` is blurred. */
const DEFAULT_BLUR: Record<Depth, 0 | 3 | 6 | 10> = {
  sky: 0,
  far: 10,
  mid: 0,
  subject: 0,
  fg: 0,
  fx: 0,
};

export type CameraState = {
  /** eased camera progress 0..1 */
  e: number;
  /** scale delta at parallax 1 */
  push: number;
  /** pan offset in px at parallax 1 */
  panX: number;
  panY: number;
  focus: [number, number];
  fgParallax: number;
};

/** Pure camera math — tested in camera.test.ts. */
export const cameraAt = (cam: Camera, p: number, defaultFocus: [number, number] = [540, 960]): CameraState => {
  const e = easeInOutQuad(p);
  const amt = cam.amount ?? 0.07;
  const panPx = cam.pan ?? amt * 1000;
  let push = 0;
  let panX = 0;
  let panY = 0;
  switch (cam.move) {
    case 'push_in':
      push = amt * e;
      break;
    case 'pull_out':
      push = amt * (1 - e);
      break;
    case 'pan_left':
      panX = -panPx * e;
      break;
    case 'pan_right':
      panX = panPx * e;
      break;
    case 'tilt_up':
      panY = panPx * e;
      break;
    case 'tilt_down':
      panY = -panPx * e;
      break;
    case 'push_in_pan_left':
      push = amt * e;
      panX = -(cam.pan ?? 40) * e;
      break;
    case 'push_in_pan_right':
      push = amt * e;
      panX = (cam.pan ?? 40) * e;
      break;
    case 'static':
    case 'shake':
      break;
  }
  return { e, push, panX, panY, focus: cam.focus ?? defaultFocus, fgParallax: cam.fgParallax ?? 1.75 };
};

export const layerTransform = (c: CameraState, parallax: number) => {
  const k = 1 + c.push * parallax;
  const [fx, fy] = c.focus;
  return `translate(${fx} ${fy}) scale(${k}) translate(${-fx + c.panX * parallax} ${-fy + c.panY * parallax})`;
};

export const useCamera = (): CameraState => {
  const { shot, p } = useShot();
  const { view } = useFormat();
  return cameraAt(shot.camera, p, [view.x + view.w / 2, view.y + view.h / 2]);
};

/** A depth layer: applies the camera transform with this depth's parallax, plus its blur treatment. */
export const Layer: React.FC<{
  depth: Depth;
  /** override the depth's parallax factor */
  parallax?: number;
  /** override the depth's blur (0 = sharp) */
  blur?: 0 | 3 | 6 | 10;
  children: React.ReactNode;
}> = ({ depth, parallax, blur, children }) => {
  const cam = useCamera();
  const par = parallax ?? (depth === 'fg' ? cam.fgParallax : PARALLAX[depth]);
  // the diorama style is sharp front to back: depth comes from layering and shadows, not focus
  const diorama = useStyle() === 'diorama';
  const b = blur ?? (diorama ? 0 : DEFAULT_BLUR[depth]);
  return (
    <g transform={layerTransform(cam, par)}>{b ? <Blur amount={b}>{children}</Blur> : children}</g>
  );
};
