// Contact sheets of everything in the kit (spec 7.7): for humans, and for Claude to see what exists.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import {
  CharacterSpec as CharacterSchema,
  Shot as ShotSchema,
  normaliseFx,
  type CharacterSpec,
  type Format,
  type Shot,
} from '@papercut/schema';
import {
  Actor,
  EXPRESSIONS,
  FilterScope,
  FormatProvider,
  HAIR_STYLES,
  LAYOUTS,
  POSES,
  PROPS,
    ShotProvider,
  TOPS,
  emptyState,
  useCaptionFont,
} from '@papercut/kit';

// Sets are previewed per shot by scripts/stills.mjs (one frame per set, tiled) — a single frame
// holding every set at once is too heavy for Chromium's filter pipeline.
export const GALLERY_SECTIONS = ['props', 'cast', 'expressions', 'poses', 'framings', 'hair', 'outfits'] as const;
export type GallerySection = (typeof GALLERY_SECTIONS)[number];

const LABEL = 44;
const PAD = 16;

const ch = (c: Partial<CharacterSpec> & { id: string }): CharacterSpec =>
  CharacterSchema.parse({
    displayName: c.id,
    base: 'adult_m',
    skin: 'skin2',
    hair: { style: 'crew', color: 'brown' },
    face: {},
    outfit: { top: 'button_shirt', topColor: 'olive', bottom: 'jeans', bottomColor: 'denim' },
    ...c,
  });

export const CAST: CharacterSpec[] = [
  ch({ id: 'dahmer', base: 'teen_m', hair: { style: 'side_part', color: 'blond' }, face: { glasses: 'large_square', facialHair: 'none', brows: 'flat' }, defaultExpression: 'vacant' }),
  ch({ id: 'hitchhiker', base: 'teen_m', skin: 'skin3', hair: { style: 'long_straight', color: 'brown' }, outfit: { top: 'tshirt', topColor: 'cream', bottom: 'jeans', bottomColor: 'denim', shoes: 'plain' } }),
  ch({ id: 'detective', base: 'adult_m', skin: 'skin4', hair: { style: 'receding', color: 'darkBrown' }, face: { glasses: 'none', facialHair: 'moustache', brows: 'heavy' }, outfit: { top: 'suit_jacket', topColor: 'charcoal', bottom: 'slacks', bottomColor: 'charcoal', shoes: 'plain' }, defaultExpression: 'worried' }),
  ch({ id: 'officer', base: 'adult_f', skin: 'skin5', hair: { style: 'bun', color: 'black' }, outfit: { top: 'police_uniform', topColor: 'navy', bottom: 'slacks', bottomColor: 'navy', shoes: 'plain' } }),
  ch({ id: 'mother', base: 'elder_f', skin: 'skin1', hair: { style: 'bob', color: 'grey' }, face: { glasses: 'round', facialHair: 'none', brows: 'thin' }, outfit: { top: 'dress', topColor: 'mustard', bottom: 'skirt', bottomColor: 'mustard', shoes: 'plain' }, defaultExpression: 'sad' }),
  ch({ id: 'mr_white', base: 'elder_m', skin: 'skin2', hair: { style: 'bald', color: 'white' }, face: { glasses: 'none', facialHair: 'beard', brows: 'arched' }, outfit: { top: 'sweater', topColor: 'rust', bottom: 'slacks', bottomColor: 'brown', shoes: 'plain' } }),
  ch({ id: 'student', base: 'teen_f', skin: 'skin6', hair: { style: 'afro', color: 'black' }, outfit: { top: 'jacket_70s', topColor: 'forest', bottom: 'jeans', bottomColor: 'denim', shoes: 'plain' }, defaultExpression: 'smile' }),
  ch({ id: 'inmate', base: 'adult_m', skin: 'skin3', hair: { style: 'mullet', color: 'auburn' }, face: { glasses: 'aviator', facialHair: 'stubble', brows: 'heavy' }, outfit: { top: 'prison_jumpsuit', topColor: '#d06a2a', bottom: 'jeans', bottomColor: '#d06a2a', shoes: 'plain' }, defaultExpression: 'angry' }),
  ch({ id: 'child', base: 'child', skin: 'skin2', hair: { style: 'ponytail', color: 'red' }, outfit: { top: 'tshirt', topColor: 'mustard', bottom: 'skirt', bottomColor: 'navy', shoes: 'plain' }, defaultExpression: 'shocked' }),
];

/** Build a still shot (p = 0.5, static camera) for a cell. */
const fakeShot = (s: Partial<Shot> & { set: string }): Shot =>
  ShotSchema.parse({ id: 'G', lineIds: ['G'], caption: '', camera: { move: 'static' }, ...s });

type Cell = { label: string; render: () => React.ReactNode; viewBox: string };
type Sheet = { cols: number; cellW: number; cellH: number; cells: Cell[]; format: Format };

const Still: React.FC<{ shot: Shot; characters?: CharacterSpec[]; children: React.ReactNode }> = ({ shot, characters = [], children }) => (
  <ShotProvider
    value={{ shot, characters, fx: normaliseFx(shot.fx), t: 1, p: 0.5, globalFrame: 30, fps: 30, durationInFrames: 60 }}
  >
    {children}
  </ShotProvider>
);

const PERSON_BG = '#6b5a4a';
const personCell = (label: string, spec: CharacterSpec, placement: Record<string, any>, viewBox: string, bg = PERSON_BG): Cell => ({
  label,
  viewBox,
  render: () => (
    <>
      <rect x={-2000} y={-2000} width={6000} height={6000} fill={bg} />
      <Still shot={fakeShot({ set: 'none' })} characters={[spec]}>
        <Actor placement={{ ref: spec.id, kind: 'character', framing: 'waist', x: 540, y: 1400, scale: 1, flip: false, layer: 'subject', pose: 'idle', params: {}, ...placement }} />
      </Still>
    </>
  ),
});

const FULL_VB = '186 330 708 1180';

export const gallerySheet = (section: GallerySection, format: Format): Sheet => {
  const L = LAYOUTS[format];
  const vb = `${L.view.x} ${L.view.y} ${L.view.w} ${L.view.h}`; // whole visible frame
  const base = CAST[0];
  switch (section) {
    case 'props':
      return {
        cols: 8,
        cellW: 280,
        cellH: 280,
        format,
        cells: Object.values(PROPS).map((d) => {
          const [x, y, w, h] = d.bbox;
          const m = Math.max(w, h) * 0.12;
          const s = Math.max(w, h) + 2 * m;
          return {
            label: d.id,
            viewBox: `${x + w / 2 - s / 2} ${y + h / 2 - s / 2} ${s} ${s}`,
            render: () => (
              <>
                <rect x={-5000} y={-5000} width={10000} height={10000} fill="#4a3f38" />
                <Still shot={fakeShot({ set: 'none' })}>
                  <d.Component params={{ headline: 'MISSING', caption: 'June 1978', label: 'CASE 78-06', text: 'Akron, OH' }} state={emptyState()} />
                </Still>
              </>
            ),
          };
        }),
      };
    case 'cast':
      return { cols: 9, cellW: 240, cellH: 400, format, cells: CAST.map((c) => personCell(c.id, c, { framing: 'full', x: 540, y: 1480, scale: 2.2 }, FULL_VB)) };
    case 'expressions':
      return { cols: 7, cellW: 280, cellH: 320, format, cells: EXPRESSIONS.map((e) => personCell(e, CAST[2], { framing: 'closeup', x: 540, y: 990, scale: 0.77, expression: e }, '330 760 420 480')) };
    case 'poses':
      return { cols: 9, cellW: 240, cellH: 400, format, cells: Object.keys(POSES).map((p) => personCell(p, CAST[1], { framing: 'full', x: 540, y: 1480, scale: 2.2, pose: p }, FULL_VB)) };
    case 'framings':
      return {
        cols: 5,
        cellW: 270,
        cellH: 480,
        format,
        cells: [
          personCell('full', base, { framing: 'full', x: 540, y: 1460 }, vb),
          personCell('waist', base, { framing: 'waist', x: 540, y: 1400 }, vb),
          personCell('closeup', base, { framing: 'closeup', x: 540, y: 960 }, vb),
          personCell('hands', base, { framing: 'hands', x: 540, y: 1100, pose: 'hands_open_offering' }, vb),
          personCell('small_distant', base, { framing: 'small_distant', x: 540, y: 1300 }, vb),
        ],
      };
    case 'hair':
      return {
        cols: 6,
        cellW: 260,
        cellH: 300,
        format,
        cells: HAIR_STYLES.map((h, i) =>
          personCell(h, { ...base, id: `h${i}`, face: { ...base.face, glasses: 'none' }, hair: { style: h, color: ['brown', 'blond', 'black', 'auburn', 'grey', 'red'][i % 6] } }, { framing: 'closeup', x: 540, y: 990, scale: 0.77 }, '300 720 480 560'),
        ),
      };
    case 'outfits':
      return {
        cols: 8,
        cellW: 240,
        cellH: 400,
        format,
        cells: TOPS.map((t, i) =>
          personCell(t, { ...base, id: `o${i}`, outfit: { top: t, topColor: ['olive', 'cream', 'rust', 'charcoal', 'navy', '#d06a2a', 'burgundy', 'tan', '#d4532b'][i % 9], bottom: t === 'dress' ? 'skirt' : t === 'choli' ? 'ghagra' : 'jeans', bottomColor: t === 'choli' ? '#2c2a6a' : 'denim', shoes: 'plain' } }, { framing: 'full', x: 540, y: 1480, scale: 2.2 }, FULL_VB),
        ),
      };
  }
};

export const sheetSize = (s: Sheet) => {
  const rows = Math.ceil(s.cells.length / s.cols);
  return { width: s.cols * (s.cellW + PAD) + PAD, height: rows * (s.cellH + LABEL + PAD) + PAD };
};

export const KitGallery: React.FC<{ section: GallerySection; format: Format }> = ({ section, format }) => {
  useCaptionFont('en-IN');
  const sheet = gallerySheet(section, format);
  const { width, height } = sheetSize(sheet);
  return (
    <AbsoluteFill style={{ backgroundColor: '#211814' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <FormatProvider format={format}>
          <FilterScope>
            {sheet.cells.map((c, i) => {
              const x = PAD + (i % sheet.cols) * (sheet.cellW + PAD);
              const y = PAD + Math.floor(i / sheet.cols) * (sheet.cellH + LABEL + PAD);
              return (
                <g key={c.label}>
                  <svg x={x} y={y} width={sheet.cellW} height={sheet.cellH} viewBox={c.viewBox} preserveAspectRatio="xMidYMid slice">
                    {c.render()}
                  </svg>
                  <text x={x + sheet.cellW / 2} y={y + sheet.cellH + 32} textAnchor="middle" fontFamily="monospace" fontSize={20} fill="#efe5cf">
                    {c.label}
                  </text>
                </g>
              );
            })}
          </FilterScope>
        </FormatProvider>
      </svg>
    </AbsoluteFill>
  );
};
