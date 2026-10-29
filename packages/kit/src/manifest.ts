// Kit manifest (spec 7.7): the catalogue of every set, prop, action, pose, hair style and outfit, given to
// the planner so it can only choose real assets. `pnpm kit:manifest` writes it to kit-manifest.json.
import { FORMATS, FxId, Transition, type StorySpec } from '@papercut/schema';
import { ACTIONS } from './core/actions';
import { BASES, POSES } from './characters/body';
import { EXPRESSIONS } from './characters/face';
import { HAIR_STYLES } from './characters/hair';
import { HAND_SHAPES } from './characters/hands';
import { BOTTOMS, TOPS } from './characters/outfits';
import { cloth, hair, palettes, skin } from './palettes';
import { PROPS, propIdOf } from './props';
import { SETS } from './sets';
import { PACKS, setsOfPack } from './packs';

export const buildManifest = () => ({
  formats: Object.fromEntries(
    Object.entries(FORMATS).map(([k, f]) => [k, { width: f.width, height: f.height, worldView: f.view }]),
  ),
  sets: Object.values(SETS).map((s) => ({
    id: s.id,
    description: s.description,
    palettes: s.palettes,
    params: s.params,
    anchors: s.anchors,
    elements: s.elements,
    pack: s.pack ?? 'classic',
    style: s.style ?? 'diecut',
    variants: s.variants,
  })),
  packs: Object.values(PACKS).map((p) => ({ ...p, sets: setsOfPack(p.id) })),
  props: Object.values(PROPS).map((p) => ({
    id: p.id,
    description: p.description,
    origin: p.origin,
    params: p.params,
    size: [p.bbox[2], p.bbox[3]],
    pivots: Object.keys(p.pivots ?? {}),
  })),
  actions: Object.values(ACTIONS).map((a) => ({
    id: a.id,
    description: a.description,
    targets: a.targets,
    params: a.params,
  })),
  characters: {
    bases: Object.keys(BASES),
    framings: ['full', 'waist', 'closeup', 'hands', 'small_distant'],
    poses: Object.keys(POSES),
    expressions: [...EXPRESSIONS],
    hair: HAIR_STYLES,
    glasses: ['none', 'large_square', 'round', 'aviator'],
    facialHair: ['none', 'moustache', 'beard', 'stubble'],
    brows: ['flat', 'heavy', 'thin', 'arched'],
    outfits: { top: TOPS, bottom: [...BOTTOMS] },
    handShapes: HAND_SHAPES,
    colours: { skin: Object.keys(skin), hair: Object.keys(hair), cloth: Object.keys(cloth) },
  },
  palettes: [...Object.keys(palettes), 'parlour'],
  fx: FxId.options,
  transitions: Transition.options,
});

export type KitManifest = ReturnType<typeof buildManifest>;
type Missing = StorySpec['missingAssets'][number];

/**
 * Every set, prop, action, pose, hair style and outfit in the spec must exist in the kit (spec 6,
 * "Validation rule"). Returns what's missing; the pipeline stops at `planned` when this is non-empty.
 */
export const findMissingAssets = (spec: StorySpec): Missing[] => {
  const out: Missing[] = [];
  const seen = new Set<string>();
  const add = (kind: Missing['kind'], id: string, description: string) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, id, description });
  };
  const charIds = new Set(spec.characters.map((c) => c.id));
  for (const c of spec.characters) {
    if (!HAIR_STYLES.includes(c.hair.style)) add('hair', c.hair.style, `hair style for ${c.id}`);
    if (!TOPS.includes(c.outfit.top as any)) add('outfit', c.outfit.top, `top for ${c.id}`);
    if (!(BOTTOMS as readonly string[]).includes(c.outfit.bottom))
      add('outfit', c.outfit.bottom, `bottom for ${c.id}`);
  }
  for (const shot of spec.shots) {
    const set = SETS[shot.set];
    if (!set) add('set', shot.set, `set used by ${shot.id}`);
    const targets = new Set<string>(['camera', ...(set?.elements ?? [])]);
    for (const a of shot.actors) {
      targets.add(a.ref);
      if (a.kind === 'character') {
        if (!charIds.has(a.ref))
          add('set', a.ref, `character ${a.ref} in ${shot.id} is not defined in characters[]`);
        if (!POSES[a.pose]) add('pose', a.pose, `pose for ${a.ref} in ${shot.id}`);
        if (a.params.holding && !PROPS[a.params.holding])
          add('prop', a.params.holding, `held by ${a.ref} in ${shot.id}`);
      } else if (!PROPS[propIdOf(a.ref, a.params)]) {
        add('prop', propIdOf(a.ref, a.params), `prop in ${shot.id}`);
      }
    }
    for (const act of shot.actions) {
      if (!ACTIONS[act.action]) add('action', act.action, `action on ${act.target} in ${shot.id}`);
      if (!targets.has(act.target))
        add(
          'action',
          `${act.action}@${act.target}`,
          `target ${act.target} is not an actor or set element in ${shot.id}`,
        );
    }
  }
  return out;
};
