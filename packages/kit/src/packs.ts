// Creative packs: a culture/genre bundle of sets, props, palette and render style that stories pick
// from. Sets and props join a pack through their own `pack` field; the world library (`world`) holds
// the settings and nature pieces every pack can share.
import { SETS } from './sets';

export type PackDef = {
  id: string;
  name: string;
  description: string;
  style: 'diecut' | 'diorama';
  /** visual motifs the planner can lean on when describing shots */
  motifs: string[];
  /** props from the shared library that suit this pack */
  props: string[];
};

export const PACKS: Record<string, PackDef> = {
  folklore: {
    id: 'folklore',
    name: 'Indian folklore',
    description:
      'Village tales, jungle fables, river and temple legends, palace stories. Diorama style with the Gond/Madhubani folk-pattern skin; every set comes in day, dusk and night (setVariant.time).',
    style: 'diorama',
    motifs: ['Gond dot-and-line fills', 'Madhubani zigzag bands', 'jewel palette: indigo, peacock, marigold, vermilion', 'diyas and lanterns after dark'],
    props: ['lantern', 'tiger', 'elephant', 'cow', 'dog', 'horse', 'peacock', 'owl', 'crow', 'cobra', 'birds_flock', 'tree_round', 'palm_tree', 'pine_tree', 'diya'],
  },
  crime: {
    id: 'crime',
    name: 'Indian true crime + drama',
    description:
      'Everyday Indian places for true crime and family drama: chawl, bungalow, haveli, city street, police station, courtroom, newsroom, village road. Diorama style, muted and grounded (no folk patterns); every set comes in day and night (setVariant.time). Costumes: kurta, sari, dhoti, sherwani, police khaki, turban, veil, police cap.',
    style: 'diorama',
    motifs: ['tube lights and ceiling fans', 'case files and steel almirahs', 'lit windows at night', 'red only as a tint at the turn'],
    props: ['diya', 'crow', 'dog', 'birds_flock', 'tree_round'],
  },
  classic: {
    id: 'classic',
    name: 'Classic die-cut (true crime, horror)',
    description: 'The original muted die-cut puppet style used by the true-crime and horror-classics series.',
    style: 'diecut',
    motifs: ['white die-cut borders', 'ink outlines', 'muted 1970s palette', 'red only as a tint at the turn'],
    props: [],
  },
};

export const setsOfPack = (pack: string) =>
  Object.values(SETS)
    .filter((s) => (s.pack ?? 'classic') === pack)
    .map((s) => s.id);
