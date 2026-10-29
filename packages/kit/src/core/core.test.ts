import { describe, expect, it } from 'vitest';
import { FORMATS, StorySpec, TRANSITION_OVERLAP, jsonSchemas, specTotalFrames, withFormat } from '@papercut/schema';
import proto from '../../../video/fixtures/prototype10s.spec.json';
import folkProof from '../../../video/fixtures/folklore-proof.spec.json';
import folkAnimals from '../../../video/fixtures/folk-animals.spec.json';
import indiaCast from '../../../video/fixtures/india-cast.spec.json';
import { cameraAt, layerTransform } from './Camera';
import { CAPTION_MAX_WIDTH, CAPTION_MIN_SIZE, layoutCaption } from './CaptionCard';
import { cutBucket, rotMat } from './Ink';
import { easeOutBounce, quantize12 } from './math';
import { ACTIONS, evalTarget } from './actions';
import { BASES, handPosition } from '../characters/body';
import { buildManifest, findMissingAssets } from '../manifest';

const scaleOf = (s: string) => Number(/scale\(([\d.]+)\)/.exec(s)![1]);

describe('camera', () => {
  it('push_in reaches the full amount at p=1 and scales layers by parallax', () => {
    const c = cameraAt({ move: 'push_in', amount: 0.08, fgParallax: 1.75 }, 1);
    expect(c.push).toBeCloseTo(0.08);
    expect(scaleOf(layerTransform(c, 1.75))).toBeCloseTo(1.14);
    expect(scaleOf(layerTransform(c, 0))).toBe(1);
  });
  it('push_in_pan_left pans by `pan` px', () => {
    const c = cameraAt({ move: 'push_in_pan_left', amount: 0.05, pan: 40, fgParallax: 1.75 }, 1);
    expect(c.panX).toBeCloseTo(-40);
  });
  it('focuses on the format view centre by default', () => {
    const v = FORMATS.horizontal.view;
    const c = cameraAt({ move: 'push_in', amount: 0.1, fgParallax: 1.75 }, 1, [v.x + v.w / 2, v.y + v.h / 2]);
    expect(c.focus).toEqual([540, 950]);
  });
});

describe('formats', () => {
  it('horizontal is a 1:1 16:9 window that contains the main action box', () => {
    const { width, height, view } = FORMATS.horizontal;
    expect(width / height).toBeCloseTo(16 / 9);
    expect([view.w, view.h]).toEqual([width, height]);
    expect(view.x).toBeLessThanOrEqual(80);
    expect(view.x + view.w).toBeGreaterThanOrEqual(920);
    expect(view.y).toBeLessThanOrEqual(420);
    expect(view.y + view.h).toBeGreaterThanOrEqual(1480);
  });
  it('withFormat retargets a spec', () => {
    const spec = withFormat(StorySpec.parse(proto), 'horizontal');
    expect([spec.format, spec.width, spec.height]).toEqual(['horizontal', 1920, 1080]);
  });
});

describe('motion helpers', () => {
  it('quantizes to 12 fps', () => {
    expect(quantize12(0.1)).toBeCloseTo(1 / 12);
    expect(quantize12(0.08)).toBe(0);
  });
  it('bounce lands at 1', () => expect(easeOutBounce(1)).toBeCloseTo(1));
});

describe('cutout shadow buckets', () => {
  it('unrotated parts use the standard filter', () => expect(cutBucket([1, 0, 0, 1])).toBe(0));
  it('a part rotated +90° uses the filter pre-rotated −90° (shadow stays down-right on screen)', () =>
    expect(cutBucket(rotMat(90))).toBe(18));
  it('rotations compose back to bucket 0', () => {
    const m = rotMat(45);
    const n = rotMat(-45);
    const prod: [number, number, number, number] = [
      m[0] * n[0] + m[1] * n[2],
      m[0] * n[1] + m[1] * n[3],
      m[2] * n[0] + m[3] * n[2],
      m[2] * n[1] + m[3] * n[3],
    ];
    expect(cutBucket(prod)).toBe(0);
  });
});

describe('actions', () => {
  const base = { t: 0, tq: 0, p: 0, pq: 0, placeX: 540, placeScale: 1, viewX0: 0, viewX1: 1080 };
  const at = (p: number) => ({ ...base, t: p * 2, tq: Math.floor(p * 24) / 12, p, pq: Math.floor(p * 24) / 24 });
  it('fall_over bounces to the full angle about the chosen base corner', () => {
    const a = [{ target: 'b', action: 'fall_over', at: 0.4, dur: 0.2, params: { angle: 90, direction: 'left' } }];
    expect(evalTarget(a, 'b', at(0.3)).rot).toBe(0);
    const s = evalTarget(a, 'b', at(1));
    expect(s.rot).toBeCloseTo(-90);
    expect(s.pivot).toBe('base_left');
  });
  it('drive_in starts at fromX and arrives at the placement', () => {
    const a = [{ target: 'car', action: 'drive_in', at: 0, dur: 0.6, params: { fromX: -1000 } }];
    expect(evalTarget(a, 'car', at(0)).dx).toBeCloseTo(-1540);
    expect(evalTarget(a, 'car', at(1)).dx).toBeCloseTo(0);
    expect(evalTarget(a, 'car', at(1)).wheel).toBeGreaterThan(0);
  });
  it('puppet actions run on 12 fps time', () => {
    const a = [{ target: 'x', action: 'head_turn', at: 0, dur: 1, params: { from: 0, to: 10 } }];
    // two frames inside the same 1/12 s step give the same pose
    expect(evalTarget(a, 'x', { ...base, p: 0.5, pq: 0.5 }).parts.head).toBe(
      evalTarget(a, 'x', { ...base, p: 0.51, pq: 0.5 }).parts.head,
    );
  });
  it('ignores actions aimed at other targets', () => {
    const a = [{ target: 'other', action: 'pop_in', at: 0, dur: 1, params: {} }];
    expect(evalTarget(a, 'x', at(0)).scale).toBe(1);
  });
  it('ships at least the 15 actions Phase 1 asks for', () => expect(Object.keys(ACTIONS).length).toBeGreaterThanOrEqual(15));
});

describe('rig', () => {
  it('hanging arm puts the hand below the shoulder', () => {
    const [x, y] = handPosition(BASES.adult_m, 'L', 0, 0);
    expect(x).toBeCloseTo(540 - (BASES.adult_m.sw - 45)); // straight down from the shoulder pivot
    expect(y).toBeGreaterThan(1600);
  });
  it('right arm mirrors the left', () => {
    const [lx] = handPosition(BASES.adult_m, 'L', 30, 20);
    const [rx] = handPosition(BASES.adult_m, 'R', 30, 20);
    expect(lx + rx).toBeCloseTo(1080);
  });
});

describe('caption layout', () => {
  const mono = (s: string, size: number) => s.length * size * 0.5; // fake fixed-width font
  it('keeps 54 px when it fits', () => expect(layoutCaption('Short', mono).size).toBe(54));
  it('shrinks to fit the max width', () => {
    const l = layoutCaption('x'.repeat(36), mono);
    expect(l.lines).toHaveLength(1);
    expect(l.width).toBeCloseTo(CAPTION_MAX_WIDTH);
  });
  it('wraps to two lines rather than going below 40 px', () => {
    const l = layoutCaption('word '.repeat(10).trim(), mono);
    expect(l.lines).toHaveLength(2);
    expect(l.size).toBeGreaterThanOrEqual(CAPTION_MIN_SIZE);
  });
  it('uses the wider horizontal max width', () => {
    expect(layoutCaption('x'.repeat(36), mono, 1400).size).toBe(54);
  });
});

describe('schema + manifest', () => {
  it('parses the Prototype10s spec', () => {
    const spec = StorySpec.parse(proto);
    expect(spec.shots).toHaveLength(5);
    expect(specTotalFrames(spec)).toBe(300);
  });
  it('subtracts transition overlaps from the total', () => {
    const spec = StorySpec.parse(proto);
    spec.shots[1].transitionIn = 'fade';
    spec.shots[2].transitionIn = 'flash';
    expect(specTotalFrames(spec)).toBe(300 - TRANSITION_OVERLAP.fade);
  });
  it('exports JSON Schemas for the LLM stages', () => {
    expect(jsonSchemas().storySpec).toHaveProperty('properties.shots');
  });
  it('the prototype uses only kit assets', () => {
    expect(findMissingAssets(StorySpec.parse(proto))).toEqual([]);
  });
  it('flags unknown sets, props, actions, poses and hair', () => {
    const spec = StorySpec.parse(proto);
    spec.shots[0].set = 'spaceship';
    spec.shots[1].actors[0].pose = 'backflip';
    spec.shots[1].actions.push({ target: 'dahmer_1978', action: 'moonwalk', at: 0, dur: 1, params: {} });
    spec.shots[3].actors.push({ ...spec.shots[3].actors[0], ref: 'jukebox' });
    spec.characters[0].hair.style = 'mohawk';
    const ids = findMissingAssets(spec).map((m) => `${m.kind}:${m.id}`);
    expect(ids).toEqual(expect.arrayContaining(['set:spaceship', 'pose:backflip', 'action:moonwalk', 'prop:jukebox', 'hair:mohawk']));
  });
  it('manifest meets the Phase 1 counts', () => {
    const m = buildManifest();
    expect(m.sets.length).toBeGreaterThanOrEqual(8);
    expect(m.props.length).toBeGreaterThanOrEqual(20);
    expect(m.characters.poses.length).toBeGreaterThanOrEqual(6);
    expect(m.characters.hair.length).toBeGreaterThanOrEqual(6);
    expect(m.characters.outfits.top.length).toBeGreaterThanOrEqual(5);
    expect(m.characters.expressions.length).toBeGreaterThanOrEqual(5);
    expect(m.fx).toHaveLength(10);
    expect(m.transitions).toEqual(['cut', 'paper_slide', 'flash', 'fade']);
  });
});

describe('packs', () => {
  const m = buildManifest();
  const props = new Set(m.props.map((p) => p.id));

  it('every set belongs to a registered pack, and pack sets declare their style and variants', () => {
    const packs = new Set(m.packs.map((p) => p.id));
    for (const s of m.sets) {
      expect(packs.has(s.pack), `${s.id} -> ${s.pack}`).toBe(true);
      if (s.pack !== 'classic') {
        expect(s.style).toBe('diorama');
        expect(s.variants?.length).toBeGreaterThan(1);
      }
    }
  });

  it("every pack's props exist in the kit, and every pack has sets", () => {
    for (const p of m.packs) {
      for (const id of p.props) expect(props.has(id), `${p.id}: ${id}`).toBe(true);
      expect(p.sets.length, p.id).toBeGreaterThan(0);
    }
  });

  it('the folklore and crime proofs only use kit assets', () => {
    for (const f of [folkProof, folkAnimals, indiaCast]) {
      expect(findMissingAssets(StorySpec.parse(f)), f.slug).toEqual([]);
    }
  });
});
