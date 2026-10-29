import { EXTERIORS } from './exteriors';
import { INTERIORS } from './interiors';
import { FOLKLORE } from './folklore';
import { CRIME } from './crime';
import type { SetDef } from './types';

export type { SetDef, SetLayerProps, SetFxAreas } from './types';

export const SETS: Record<string, SetDef> = Object.fromEntries([...EXTERIORS, ...INTERIORS, ...FOLKLORE, ...CRIME].map((d) => [d.id, d]));
