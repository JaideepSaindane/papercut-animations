import { INDOOR } from './indoor';
import { OUTDOOR } from './outdoor';
import { VEHICLES } from './vehicles';
import { FOLK_PROPS } from './folk';
import { ANIMALS } from './animals';
import type { PropDef } from './types';

export type { PropDef, PropProps } from './types';
export { Pine, Fern, Bush, GrassTuft } from './outdoor';

export const PROPS: Record<string, PropDef> = Object.fromEntries(
  [...VEHICLES, ...INDOOR, ...OUTDOOR, ...FOLK_PROPS, ...ANIMALS].map((d) => [d.id, d]),
);

/**
 * Resolve an actor ref to a prop id. Instances can be numbered (`beer_bottle_2`) or name their prop
 * explicitly via `params.prop`.
 */
export const propIdOf = (ref: string, params: Record<string, any> = {}): string => {
  if (params.prop) return params.prop;
  if (PROPS[ref]) return ref;
  return ref.replace(/_\d+$/, '');
};
