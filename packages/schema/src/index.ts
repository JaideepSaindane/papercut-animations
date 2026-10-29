import { z } from 'zod';

// ---------- Brief ----------
export const Language = z.enum([
  'en-IN',
  'hi-IN',
  'bn-IN',
  'ta-IN',
  'te-IN',
  'mr-IN',
  'kn-IN',
  'ml-IN',
  'gu-IN',
  'pa-IN',
  'od-IN',
]);

// ---------- Output formats ----------
// Scenes are authored once in "world" coordinates (the original 1080×1920 vertical frame space).
// Each format is a window onto that world at 1:1 pixel scale: vertical is the full 9:16 frame,
// horizontal is a 16:9 window centred on the main action box (spec 3.1: x 80–920, y 420–1480).
export const Format = z.enum(['vertical', 'horizontal']);
export type Format = z.infer<typeof Format>;

export type Rect = { x: number; y: number; w: number; h: number };
export const FORMATS: Record<Format, { width: number; height: number; view: Rect }> = {
  vertical: { width: 1080, height: 1920, view: { x: 0, y: 0, w: 1080, h: 1920 } },
  horizontal: { width: 1920, height: 1080, view: { x: -420, y: 410, w: 1920, h: 1080 } },
};

export const Brief = z.object({
  slug: z.string(),
  topic: z.string(),
  series: z.string().optional(),
  part: z.number().int().optional(),
  genre: z.enum(['true_crime', 'horror_classic', 'history', 'mystery', 'other']),
  targetSeconds: z.number().min(10).max(90).default(60),
  languages: z.array(Language).default(['en-IN']),
  /** which output formats to render; one plan renders to every format listed */
  formats: z.array(Format).min(1).default(['vertical']),
  tone: z.string().default('measured, documentary, ominous but respectful'),
  constraints: z.array(z.string()).default([]),
  /** the approved topic list this story came from (approval happens at list level) */
  topicList: z.string().optional(),
});

// ---------- Script (approval gate) ----------
export const ScriptLine = z.object({
  id: z.string(),
  vo: z.string(),
  caption: z.string().max(48),
  sourceIds: z.array(z.string()),
  beat: z.enum(['hook', 'setup', 'rising', 'turn', 'aftermath', 'cliffhanger', 'outro']),
});

export const Script = z.object({
  title: z.string(),
  hook: z.string(),
  lines: z.array(ScriptLine).min(3).max(30),
  sources: z.array(z.object({ id: z.string(), title: z.string(), url: z.string().url() })),
  sensitivityNotes: z.array(z.string()),
  translations: z
    .record(z.string(), z.array(z.object({ id: z.string(), vo: z.string(), caption: z.string() })))
    .optional(),
});

// ---------- Characters ----------
export const CharacterSpec = z.object({
  id: z.string(),
  displayName: z.string(),
  base: z.enum(['adult_m', 'adult_f', 'teen_m', 'teen_f', 'elder_m', 'elder_f', 'child']),
  skin: z.string(),
  hair: z.object({ style: z.string(), color: z.string() }),
  face: z.object({
    glasses: z.enum(['none', 'large_square', 'round', 'aviator']).default('none'),
    facialHair: z.enum(['none', 'moustache', 'beard', 'stubble']).default('none'),
    brows: z.enum(['flat', 'heavy', 'thin', 'arched']).default('flat'),
  }),
  outfit: z.object({
    top: z.string(),
    topColor: z.string(),
    bottom: z.string(),
    bottomColor: z.string(),
    shoes: z.string().default('plain'),
  }),
  defaultExpression: z
    .enum(['neutral', 'vacant', 'worried', 'angry', 'shocked', 'smile', 'sad'])
    .default('neutral'),
});

// ---------- Shots ----------
export const CameraMove = z.enum([
  'static',
  'push_in',
  'pull_out',
  'pan_left',
  'pan_right',
  'tilt_up',
  'tilt_down',
  'push_in_pan_left',
  'push_in_pan_right',
  'shake',
]);

export const Camera = z.object({
  move: CameraMove,
  /** push: scale delta; pan-only moves: px/1000 */
  amount: z.number().default(0.07),
  /** pan distance in px for combined push+pan moves */
  pan: z.number().optional(),
  /** parallax multiplier for the fg layer (spec 3.3: 1.6 to 2.0) */
  fgParallax: z.number().default(1.75),
  focus: z.tuple([z.number(), z.number()]).optional(),
});

export const ActorPlacement = z.object({
  ref: z.string(),
  kind: z.enum(['character', 'prop']),
  framing: z.enum(['full', 'waist', 'closeup', 'hands', 'small_distant']).default('waist'),
  x: z.number(),
  y: z.number(),
  scale: z.number().default(1),
  flip: z.boolean().default(false),
  layer: z.enum(['mid', 'subject', 'fg']).default('subject'),
  pose: z.string().default('idle'),
  expression: z.string().optional(),
  /** prop parameters (headline text, colour, date, ...) */
  params: z.record(z.string(), z.any()).default({}),
  /** placement overrides used only when rendering the horizontal format */
  landscape: z.object({ x: z.number(), y: z.number(), scale: z.number() }).partial().optional(),
});

export const Action = z.object({
  target: z.string(),
  action: z.string(),
  at: z.number().min(0).max(1),
  dur: z.number().min(0).max(1).default(0.3),
  params: z.record(z.string(), z.any()).default({}),
});

export const FxId = z.enum([
  'fireflies',
  'dust',
  'rain',
  'snow',
  'red_tint',
  'flicker',
  'fade_black_end',
  'fade_in',
  'light_cone',
  'fog',
]);

/** An fx is either a bare id (default timing) or an object with timing as fractions of the shot. */
export const Fx = z.union([
  FxId,
  z.object({
    id: FxId,
    at: z.number().min(0).max(1).optional(),
    dur: z.number().min(0).max(1).optional(),
    params: z.record(z.string(), z.any()).default({}),
  }),
]);

export const Transition = z.enum(['cut', 'paper_slide', 'flash', 'fade']);

export const Shot = z.object({
  id: z.string(),
  lineIds: z.array(z.string()).min(1),
  set: z.string(),
  setVariant: z.record(z.string(), z.any()).default({}),
  palette: z.string().optional(),
  actors: z.array(ActorPlacement).default([]),
  actions: z.array(Action).default([]),
  camera: Camera,
  fx: z.array(Fx).default([]),
  caption: z.string(),
  captionTilt: z.number().min(-1.5).max(1.5).default(0),
  transitionIn: Transition.default('cut'),
  sfx: z
    .array(
      z.object({
        id: z.string(),
        at: z.number().min(0).max(1),
        volume: z.number().default(0.8),
        /** filled by timing: file under assets/ */
        src: z.string().optional(),
        loop: z.boolean().optional(),
      }),
    )
    .default([]),
  durationInFrames: z.number().int().optional(),
});

export const MissingAsset = z.object({
  kind: z.enum(['set', 'prop', 'action', 'pose', 'hair', 'outfit']),
  id: z.string(),
  description: z.string(),
});

export const StorySpec = z.object({
  slug: z.string(),
  language: z.string(),
  fps: z.literal(30).default(30),
  format: Format.default('vertical'),
  /** render style: original die-cut look, or the layered paper diorama house style */
  style: z.enum(['diecut', 'diorama']).default('diecut'),
  /** derived from `format`; kept for readability of spec files */
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  characters: z.array(CharacterSpec),
  shots: z.array(Shot).min(1),
  music: z
    .object({
      id: z.string(),
      volume: z.number().default(0.18),
      duckTo: z.number().default(0.07),
      /** filled by timing: file under assets/ */
      src: z.string().optional(),
    })
    .optional(),
  vo: z
    .array(
      z.object({
        lineId: z.string(),
        src: z.string(),
        startFrame: z.number().int(),
        durationInFrames: z.number().int(),
      }),
    )
    .optional(),
  totalFrames: z.number().int().optional(),
  missingAssets: z.array(MissingAsset).default([]),
});

export type Brief = z.infer<typeof Brief>;
export type ScriptLine = z.infer<typeof ScriptLine>;
export type Script = z.infer<typeof Script>;
export type CharacterSpec = z.infer<typeof CharacterSpec>;
export type Camera = z.infer<typeof Camera>;
export type ActorPlacement = z.infer<typeof ActorPlacement>;
export type Action = z.infer<typeof Action>;
export type FxId = z.infer<typeof FxId>;
export type Fx = z.infer<typeof Fx>;
export type Shot = z.infer<typeof Shot>;
export type StorySpec = z.infer<typeof StorySpec>;
/** Input shape (defaults optional) — what a hand-written or LLM-written JSON file looks like. */
export type StorySpecInput = z.input<typeof StorySpec>;

/** Normalised fx entry with timing resolved. */
export type FxEntry = { id: FxId; at?: number; dur?: number; params: Record<string, any> };
export const normaliseFx = (fx: Fx[]): FxEntry[] =>
  fx.map((f) => (typeof f === 'string' ? { id: f, params: {} } : { ...f, params: f.params ?? {} }));

/**
 * Frames a transition overlaps the previous shot by. `fade` and `paper_slide` are cross-shot
 * (8 frames, spec 7.5); `flash` plays over the first frames of the incoming shot, so it has no overlap.
 */
export const TRANSITION_OVERLAP: Record<z.infer<typeof Transition>, number> = {
  cut: 0,
  flash: 0,
  fade: 8,
  paper_slide: 8,
};

/** Total frames: sum of shot durations minus transition overlaps (the first shot's transition is ignored). */
export const specTotalFrames = (spec: StorySpec): number =>
  spec.shots.reduce(
    (sum, s, i) => sum + (s.durationInFrames ?? 60) - (i > 0 ? TRANSITION_OVERLAP[s.transitionIn] : 0),
    0,
  );

/** Same spec, re-targeted to another output format. */
export const withFormat = (spec: StorySpec, format: Format): StorySpec => ({
  ...spec,
  format,
  width: FORMATS[format].width,
  height: FORMATS[format].height,
});

/** JSON Schemas for LLM structured output (spec section 6). */
export const jsonSchemas = () => ({
  brief: z.toJSONSchema(Brief, { io: 'input' }),
  script: z.toJSONSchema(Script, { io: 'input' }),
  storySpec: z.toJSONSchema(StorySpec, { io: 'input' }),
});

/** Start frame of each shot in the story timeline (cross-shot transitions overlap the previous shot). */
export const shotStartFrames = (spec: Pick<StorySpec, 'shots'>): number[] => {
  let start = 0;
  return spec.shots.map((s, i) => {
    if (i > 0) start -= TRANSITION_OVERLAP[s.transitionIn ?? 'cut'];
    const st = start;
    start += s.durationInFrames ?? 60;
    return st;
  });
};

// ---------- Voice (audio/<lang>/vo.json) ----------
export const TtsEngine = z.enum(['sarvam', 'system', 'placeholder']);
export type TtsEngine = z.infer<typeof TtsEngine>;

export const VoLine = z.object({
  lineId: z.string(),
  /** relative to the story folder, e.g. audio/en-IN/line-001.wav */
  file: z.string(),
  durationSec: z.number(),
  /** hash of everything that produced the audio; unchanged hash = nothing to do */
  hash: z.string(),
  text: z.string(),
  engine: TtsEngine,
  speaker: z.string(),
  requestId: z.string().optional(),
  /** characters sent to the TTS provider (billing) */
  chars: z.number().optional(),
  /** hand-recorded / hand-fixed audio: never overwritten by the TTS stage */
  manual: z.boolean().default(false),
});
export const VoFile = z.object({ language: z.string(), lines: z.array(VoLine) });
export type VoLine = z.infer<typeof VoLine>;
export type VoFile = z.infer<typeof VoFile>;

// ---------- Series config (series/<name>.json) ----------
export const VoiceConfig = z.object({
  model: z.string().default('bulbul:v3'),
  speaker: z.string().default('varun'),
  pace: z.number().min(0.5).max(2).default(0.95),
  /** keep low (0.35–0.45): each line is a separate call, low temperature keeps delivery consistent */
  temperature: z.number().min(0.01).max(1).default(0.4),
  sampleRate: z.number().default(48000),
  dictId: z.string().optional(),
  /** local respellings applied before sending ("Dahmer" -> "Dah-mer") */
  respell: z.record(z.string(), z.string()).default({}),
  /** macOS `say` voice for the system engine */
  systemVoice: z.string().default('Rishi'),
});
export const SeriesConfig = z.object({
  name: z.string(),
  voice: VoiceConfig.prefault({}),
  /** per-language overrides, e.g. { "hi-IN": { "speaker": "shubh" } } */
  voices: z.record(z.string(), VoiceConfig.partial()).default({}),
  music: z.object({ moods: z.array(z.string()).default(['dark']), volume: z.number().default(0.18), duckTo: z.number().default(0.07) }).prefault({}),
  subtitles: z.enum(['caption', 'vo']).default('caption'),
});
export type VoiceConfig = z.infer<typeof VoiceConfig>;
export type SeriesConfig = z.infer<typeof SeriesConfig>;

// ---------- Music & SFX libraries (assets/music/music.json, assets/sfx/sfx.json) ----------
export const MusicTrack = z.object({
  id: z.string(),
  file: z.string(),
  mood: z.array(z.string()),
  bpm: z.number().optional(),
  loopable: z.boolean().default(true),
  license: z.string(),
});
export const SfxEntry = z.object({ id: z.string(), file: z.string(), loop: z.boolean().default(false), license: z.string() });
export type MusicTrack = z.infer<typeof MusicTrack>;
export type SfxEntry = z.infer<typeof SfxEntry>;

// ---------- state.json ----------
export const StoryStatus = z.enum([
  'draft',
  'researched',
  'scripted',
  /** failed the automated sensitivity review or validation: waits for the owner */
  'needs_review',
  'approved',
  'planned',
  'voiced',
  'timed',
  'rendered',
  'qa_passed',
  'qa_failed',
  'packaged',
]);
export const StoryState = z.object({
  slug: z.string(),
  status: StoryStatus.default('draft'),
  /** per-stage (and per lang/format) input hash + when it ran */
  stages: z.record(z.string(), z.object({ hash: z.string(), at: z.string() })).default({}),
  error: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type StoryStatus = z.infer<typeof StoryStatus>;
export type StoryState = z.infer<typeof StoryState>;

// ---------- Topic lists (the owner approves lists, not scripts) ----------
export const TopicList = z.object({
  id: z.string(),
  name: z.string(),
  series: z.string().optional(),
  genre: Brief.shape.genre,
  targetSeconds: z.number().min(10).max(90).default(45),
  languages: z.array(Language).default(['en-IN', 'hi-IN']),
  formats: z.array(Format).min(1).default(['vertical', 'horizontal']),
  topics: z.array(z.object({ topic: z.string(), part: z.number().int().optional(), notes: z.string().optional(), slug: z.string().optional() })).min(1),
  status: z.enum(['draft', 'approved']).default('draft'),
  approvedAt: z.string().optional(),
  createdAt: z.string(),
});
export type TopicList = z.infer<typeof TopicList>;

// ---------- Script engine outputs ----------
export const JudgeScore = z.object({
  candidate: z.string(),
  hook: z.number(),
  ear: z.number(),
  pacing: z.number(),
  grounding: z.number(),
  structure: z.number(),
  sensitivity: z.number(),
  playbook: z.number(),
  overall: z.number(),
  notes: z.string(),
});
export const Judgement = z.object({ scores: z.array(JudgeScore).min(1), winner: z.string(), why: z.string() });
export const SensitivityReview = z.object({
  verdict: z.enum(['pass', 'review', 'fail']),
  issues: z.array(z.object({ lineId: z.string().optional(), rule: z.number().optional(), issue: z.string(), suggestion: z.string().optional() })).default([]),
});
export type Judgement = z.infer<typeof Judgement>;
export type SensitivityReview = z.infer<typeof SensitivityReview>;

/** Facts about a script captured at birth; the analytics engine joins these with performance. */
export const ScriptFeatures = z.object({
  slug: z.string(),
  genre: z.string(),
  series: z.string().optional(),
  language: z.string(),
  hookStyle: z.string(),
  experiment: z.string().optional(),
  hookWords: z.number(),
  words: z.number(),
  lines: z.number(),
  avgWordsPerLine: z.number(),
  beats: z.record(z.string(), z.number()),
  estSeconds: z.number(),
  speaker: z.string(),
  pace: z.number(),
  judgeOverall: z.number(),
  candidates: z.number(),
  sensitivity: z.enum(['pass', 'review', 'fail']),
  models: z.record(z.string(), z.string()),
  playbookVersion: z.number(),
  createdAt: z.string(),
});
export type ScriptFeatures = z.infer<typeof ScriptFeatures>;
