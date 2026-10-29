# Papercut Shorts: Build Spec

> **For Claude Code.** This document describes the whole system: what it is, how it looks, how the pieces fit, and the order to build it in. Read it fully before writing code. Build phase by phase (section 14) and stop at the end of each phase so the owner can review. The file `reference_prototype.html` (shipped with this spec) is a working single-file prototype of the visual style. Treat its numbers as the source of truth for the look, and port it rather than reinventing it.

---

## 0. TL;DR

We are building an automated pipeline that turns a **topic** ("How Jeffrey Dahmer killed his first victim", "The Monkey's Paw, part 1") into a finished **vertical short video** (1080×1920, 30 to 75 s). The video is a **paper-cutout puppet animation** with die-cut white borders, layered parallax, depth-of-field blur, stop-motion puppet movement, a vintage caption card, an AI voiceover (Sarvam TTS) and a music bed.

The pipeline has eight stages, and every stage reads and writes plain files on disk:

```
topic ─► research+script ─► [human approval] ─► shot plan (StorySpec JSON)
      ─► voiceover (Sarvam) ─► timing ─► render (Remotion) ─► QA ─► package (mp4 + srt + post text)
```

It is driven three ways, all using the same code:
1. **Claude Code interactively**, through slash commands like `/new-story`, `/render`, `/batch` (main mode).
2. **A CLI** (`pc …`) that Claude Code or a human runs.
3. **A small local server** with a job queue and dashboard for batches (approve scripts, watch progress, preview, download).

The core idea that makes bulk production fast is a **kit** of reusable rigged characters, sets, props, actions and camera moves. A new story is mostly a new JSON file that points at kit pieces. Drawing new art is the exception.

---

## 1. Goals and non-goals

### Goals
- Produce one 60 s short in **under 30 minutes of wall-clock time** once the kit exists. Most of that time is unattended, and the human touches it only at script approval and a final watch.
- Produce batches of 5 to 20 stories from a topic list.
- Keep a consistent look across every video, defined once in code (section 3).
- Generate the voiceover with Sarvam in English (`en-IN`) first, with Hindi and other Indic languages as a cheap multiplier later (same visuals, new VO and captions).
- Make everything deterministic and cached, so re-running a stage with the same inputs does nothing.
- Keep every intermediate file human-readable and editable, so a person (or Claude Code) can fix one shot without redoing the whole video.

### Non-goals (for now)
- No photoreal or 3D rendering. Blender is a possible later add-on and not part of v1.
- No posting automation to Instagram or YouTube in v1. The pipeline outputs a ready-to-post folder.
- No multi-user SaaS. This is a single-owner tool that runs on the owner's machine.

---

## 2. Tech stack (decided)

| Concern | Choice | Notes |
|---|---|---|
| Language | **TypeScript** everywhere | Node 20+ (22 preferred) |
| Monorepo | **pnpm workspaces** | `apps/*`, `packages/*` |
| Video engine | **Remotion v4** (`remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/bundler`, `@remotion/player`, `@remotion/media-utils`, `@remotion/transitions`, `@remotion/google-fonts` or local fonts) | Compositions are React + SVG |
| Schema and validation | **zod** | Single source of truth for StorySpec, plus JSON Schema export for the LLM |
| LLM calls (server mode) | **Anthropic TypeScript SDK** (`@anthropic-ai/sdk`) | Models: `claude-opus-5-5` for research and script, `claude-sonnet-5-5` for shot planning and QA. Make models configurable. |
| Web research (server mode) | Anthropic API server-side web search tool | Verify the current tool type string in the Anthropic docs before coding |
| TTS | **Sarvam AI** REST `POST https://api.sarvam.ai/text-to-speech` | Details in section 8 |
| Server | **Fastify** | Plus a tiny dashboard (section 11) |
| DB and queue | **SQLite** via `better-sqlite3` + **Drizzle ORM**, with a simple DB-backed job queue | No Redis needed on one machine. Abstract the queue so BullMQ can replace it later. |
| Media tooling | **ffmpeg / ffprobe** (system binaries) | Contact sheets, loudness checks, audio probing |
| CLI | `commander` (or `citty`) | Binary name: `pc` |
| Tests | **vitest** | Plus visual snapshot tests of single frames (`renderStill`) |
| Lint and format | eslint + prettier | Keep it light |

**Remotion licence:** Remotion is free for individuals and for organisations of up to 3 people, including commercial use. At 4 or more people a company licence is needed (an "Automators" plan exists for automated pipelines). The owner should confirm which applies. Put a note in the README.

---

## 3. Visual style bible

These are the rules that make it look like "paper cutout". Every component must follow them. The numbers come from the working prototype.

### 3.1 Canvas and safe zones (9:16)
- Composition: **1080 × 1920, 30 fps**. Puppet motion is quantized to 12 fps (see 3.5), which gives the stop-motion feel while the camera stays smooth.
- **Top unsafe zone:** y 0 to 200 (platform header). The caption card sits around **y = 230 to 380**.
- **Bottom unsafe zone:** y 1500 to 1920 (username, description, buttons). No faces, key props or text here. Bodies, tables and ground may extend into it.
- **Right unsafe zone:** x 930 to 1080, y 900 to 1500 (like/comment/share column). Keep faces and key props out of it.
- Main action box: **x 80 to 920, y 420 to 1480**. QA checks this (section 10).

### 3.2 The die-cut cutout look (the most important thing)
Every *cutout part* (a head, an arm, a car, a house, a prop) gets this SVG filter. Each part gets its own filter, so overlapping parts show their own borders. That is what sells the layered-paper effect.

```xml
<filter id="cut" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
  <!-- white die-cut border -->
  <feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d"/>
  <feFlood flood-color="#f3ead8" result="w"/>
  <feComposite in="w" in2="d" operator="in" result="border"/>
  <!-- soft drop shadow (paper lifted off the backdrop) -->
  <feGaussianBlur in="d" stdDeviation="9" result="sb"/>
  <feOffset in="sb" dx="7" dy="14" result="so"/>
  <feFlood flood-color="#120806" flood-opacity="0.55"/>
  <feComposite in2="so" operator="in" result="shadow"/>
  <!-- paper fibre texture on the face of the cutout -->
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise"/>
  <feComposite in="SourceGraphic" in2="noise" operator="arithmetic" k1="0" k2="1" k3="0.10" k4="-0.05" result="tex"/>
  <feComposite in="tex" in2="SourceAlpha" operator="in" result="texc"/>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="border"/><feMergeNode in="texc"/></feMerge>
</filter>
```

- **Ink line:** every shape inside a cutout has stroke `#2b1d17`, width **3**, `stroke-linejoin="round"`. Fine details (inner lines, buttons) use width 2.
- **Border colour** is warm off-white `#f3ead8`, never pure white.
- **Scale rule:** the border radius (7) and shadow are in *screen* pixels. When a cutout is scaled by a camera move, it keeps visually consistent borders, because the filter runs on the scaled result. When pre-baking (section 7.6), bake at final on-screen scale ±20%.

### 3.3 Depth layers
Every shot is built from depth layers, back to front:

| Layer | Content | Treatment | Camera parallax factor |
|---|---|---|---|
| `sky` / `wall` | gradient, wallpaper | **blur stdDeviation 10**, no cutout filter | 0.3 |
| `far` | hills, distant trees, furniture, windows | blur 10 (or 6) | 0.4 |
| `mid` | ground, house, table, main set pieces | cutout filter, sharp | 1.0 |
| `subject` | characters and key props | cutout filter, sharp | 1.0 |
| `fg` | foreground trees, grass, ferns, framing objects | cutout filter, sometimes blur 3 | 1.6 to 2.0 |
| `fx` | light cones, glows, fireflies, dust | blend modes (`screen`, `multiply`) | 1.0 |
| `post` | vignette, grain, colour tints, fades | full-frame | none |
| `ui` | caption card | cutout filter | none |

A **camera push** of `k` scales each layer about the frame centre by `1 + (k-1) × parallax`. The background therefore barely moves and the foreground sweeps outward. That is the depth illusion.

### 3.4 Post layer (always on)
- **Vignette:** radial gradient centred at (0.5, 0.48), r = 0.75, transparent at 0.45, black at 0.70 opacity at the edge.
- **Grain:** full-frame `feTurbulence` (fractalNoise, baseFrequency 0.8, numOctaves 2), desaturated, **opacity 0.16, `mix-blend-mode: overlay`**. Change the seed every 2 frames, cycling through 4 seeds (film boil).
- **Hand-held jitter:** translate the whole scene by a seeded random ±1.25 px, changed every 2 frames.

### 3.5 Motion rules
- **Puppet motion** (limb rotation, head turns, objects falling, cars) uses time quantized to **12 fps**: `tq = Math.floor(t*12)/12`. This is the stop-motion feel.
- **Camera motion** (push, pan, parallax) is smooth (full frame rate) and eased with `easeInOutQuad`.
- **Puppets only rotate rigid parts around pivots.** Nothing bends. Use paper-puppet logic (like a split-pin puppet): a head turns, an arm swings, hands open.
- Use overshoot easing (`easeOutBack`) for things arriving and `easeOutBounce` for things falling.
- **Shot length:** 1.5 to 3.5 s, driven by voiceover length (section 8). Use hard cuts between shots by default. Allowed transitions are listed in section 7.5.

### 3.6 Caption card
- A cream card `#efe5cf` with a 3 px dark border `#3b2b22`, a double inner rule at insets 10 px (1.5 px) and 15 px (1 px), four dot ornaments at the corners (r = 3, inset 24 px), and a brass pin at top centre (r = 9, `#b68a3a`).
- Font: **IM Fell English** (Google Font, also installable as `@fontsource/im-fell-english`), size 54 px. Auto-shrink to fit a max text width of 860 px. Wrap to 2 lines when shrinking would go below 40 px.
- Placement: horizontally centred, top at y = 250.
- Entrance per shot: drops from y = −200 to 250 over **0.28 s with easeOutBack**, with a rotation tilt that settles from `3×tilt` to `tilt`. `tilt` is a per-shot value between −1.5° and 1.5°, alternating sign.
- The caption card itself gets the cutout filter.
- Hindi and Devanagari: use **Tiro Devanagari Hindi** (or Noto Serif Devanagari) with the same card. Make the font a per-language config.

### 3.7 Palettes
Keep named palettes in `packages/kit/src/palettes.ts`. Shots reference a palette by name.

```ts
export const INK = '#2b1d17';
export const PAPER = '#f3ead8';
export const palettes = {
  dusk:   { sky: ['#341424','#7d2a33','#cf6a3e','#f0b36b','#f6cf8a'], ground: '#55703e', accent: '#ffcf6e' },
  night:  { sky: ['#0a1219','#1a2a31','#22352f'], ground: '#26332a', accent: '#d8f08a', moon: '#efe6c8' },
  interiorWarm: { wall: '#6b2230', stripe: '#5a1b28', wainscot: '#3b2620', rail: '#8a5a3a', lamp: '#ffd990' },
  interiorDark: { wall: '#2a1b24', stripe: '#241720', floor: '#1c1218', lamp: '#ffe39a' },
  day:    { sky: ['#9cc3d6','#d8e6dc','#efe2c4'], ground: '#7c8c4a', accent: '#f2c45a' },
  police: { wall: '#3c4a52', stripe: '#34424a', floor: '#2a2f33', lamp: '#d8e4ff' },
} as const;
```

Skin tones (6 steps), hair colours (8) and clothing colours (12 muted 1970s to 1990s tones) are also palette entries. Characters reference them by key.

### 3.8 Taste rules (especially for true crime)
- **Never show violence on screen.** Imply it: an object falls, a light flickers, a red tint creeps in, a door closes, a cut to the aftermath setting. No blood, no bodies, no weapons in use.
- Victims are never mocked or drawn grotesquely. Show them neutrally, often small or from a distance.
- Perpetrators are stylised, not caricatured for laughs. Don't attempt photographic likeness. Identifying traits are enough (glasses, hair).
- Muted palettes. Red is used only as a tint or accent at the turn of the story.

---

## 4. Repository layout

```
papercut/
├─ CLAUDE.md                       # condensed rules for Claude Code (section 12.1)
├─ PAPERCUT_SPEC.md                # this file
├─ reference_prototype.html        # the working single-file prototype (style source of truth)
├─ package.json / pnpm-workspace.yaml / tsconfig.base.json
├─ .env.example                    # SARVAM_API_KEY, ANTHROPIC_API_KEY, PC_DATA_DIR, ...
├─ .claude/
│  ├─ commands/                    # slash commands (section 12.2)
│  └─ agents/                      # subagents (section 12.3)
├─ packages/
│  ├─ schema/                      # zod schemas: StorySpec, Script, Kit manifest, Job
│  ├─ kit/                         # the reusable art + animation library (React/SVG)
│  │  ├─ src/core/                 # Cutout, Layer, Camera, Puppet, Caption, Post, filters
│  │  ├─ src/characters/           # character rig + part library
│  │  ├─ src/sets/                 # one file per set
│  │  ├─ src/props/                # one file per prop
│  │  ├─ src/actions/              # action implementations (keyframe generators)
│  │  ├─ src/palettes.ts
│  │  └─ manifest.ts               # auto-generated catalog of everything above (section 7.7)
│  ├─ video/                       # Remotion project: Root.tsx, compositions, calculateMetadata
│  ├─ pipeline/                    # stage implementations (pure functions + file IO)
│  │  ├─ research.ts  script.ts  plan.ts  tts.ts  timing.ts  render.ts  qa.ts  package.ts
│  │  └─ prompts/                  # prompt templates as .md files
│  └─ shared/                      # fs helpers, hashing/cache, ffmpeg wrappers, logger
├─ apps/
│  ├─ cli/                         # `pc` command
│  └─ server/                      # Fastify API + worker + dashboard
├─ assets/
│  ├─ fonts/                       # IM Fell English, Tiro Devanagari Hindi (woff2/ttf)
│  ├─ music/                       # owner-provided royalty-free beds (+ music.json metadata)
│  ├─ sfx/                         # owner-provided SFX (+ sfx.json metadata)
│  └─ baked/                       # cache of pre-rendered cutout PNGs (section 7.6), gitignored
└─ data/                           # PC_DATA_DIR default; gitignored
   └─ stories/<slug>/              # one folder per story (section 5)
```

---

## 5. The story folder (the contract between stages)

Every story lives in `data/stories/<slug>/`. Each stage reads earlier files and writes its own. Stages are idempotent and skip work when the input hashes are unchanged (store hashes in `state.json`).

```
data/stories/dahmer-first-victim/
├─ state.json            # status, per-stage input hashes, timestamps, errors
├─ 00-brief.json         # topic, series, part, target length, language(s), tone, constraints
├─ 01-research.md        # findings with inline citations + a sources list
├─ 02-script.json        # narration lines + caption text + sources per claim  (APPROVAL GATE)
├─ 03-plan.json          # StorySpec WITHOUT timings (shots -> kit pieces)
├─ audio/
│  ├─ en-IN/line-001.wav … line-0NN.wav
│  └─ en-IN/vo.json      # per-line durations, hashes, speaker, pace
├─ 04-spec.en-IN.json    # StorySpec WITH timings (what Remotion renders)
├─ render/
│  └─ en-IN.mp4
├─ qa/
│  ├─ en-IN.contact.jpg  # 2 fps contact sheet
│  ├─ en-IN.report.json  # automatic checks + LLM review
└─ out/en-IN/
   ├─ <slug>.mp4         # final
   ├─ <slug>.srt         # subtitles from line timings
   ├─ cover.jpg          # thumbnail frame
   └─ post.txt           # caption, hashtags, sources (for the description)
```

**Status machine** (in `state.json` and mirrored to the DB in server mode):
`draft → researched → scripted → APPROVED → planned → voiced → timed → rendered → qa_passed | qa_failed → packaged`.
`scripted → APPROVED` is the only step that requires a human (or an explicit `--auto-approve` flag, which is off by default for true crime).

---

## 6. Schemas (packages/schema)

Write these in zod and export JSON Schema with `zod-to-json-schema`, so the LLM stages get exact structured-output schemas. Below is the intended shape. Refine names as needed but keep the structure.

```ts
// ---------- Brief ----------
export const Brief = z.object({
  slug: z.string(),                       // kebab-case, unique
  topic: z.string(),                      // "How Jeffrey Dahmer killed his first victim"
  series: z.string().optional(),          // "Killers' First Victims"
  part: z.number().int().optional(),
  genre: z.enum(['true_crime', 'horror_classic', 'history', 'mystery', 'other']),
  targetSeconds: z.number().min(10).max(90).default(60),
  languages: z.array(z.enum(['en-IN','hi-IN','bn-IN','ta-IN','te-IN','mr-IN','kn-IN','ml-IN','gu-IN','pa-IN','od-IN'])).default(['en-IN']),
  tone: z.string().default('measured, documentary, ominous but respectful'),
  constraints: z.array(z.string()).default([]),   // e.g. "no graphic detail", "end on a cliffhanger"
});

// ---------- Script (approval gate) ----------
export const ScriptLine = z.object({
  id: z.string(),                        // "L01"
  vo: z.string(),                        // spoken text (numbers written out the way they should be spoken)
  caption: z.string(),                   // on-screen text, ≤ 48 chars, may be shorter than vo
  sourceIds: z.array(z.string()),        // which sources support factual claims in this line
  beat: z.enum(['hook','setup','rising','turn','aftermath','cliffhanger','outro']),
});
export const Script = z.object({
  title: z.string(),
  hook: z.string(),                      // first-line hook (also used for the post caption)
  lines: z.array(ScriptLine).min(3).max(30),
  sources: z.array(z.object({ id: z.string(), title: z.string(), url: z.string().url() })),
  sensitivityNotes: z.array(z.string()), // what was deliberately left out and why
  translations: z.record(z.string(), z.array(z.object({ id: z.string(), vo: z.string(), caption: z.string() }))).optional(),
});

// ---------- Characters ----------
export const CharacterSpec = z.object({
  id: z.string(),                        // "dahmer_1978"
  displayName: z.string(),
  base: z.enum(['adult_m','adult_f','teen_m','teen_f','elder_m','elder_f','child']),
  skin: z.string(),                      // palette key e.g. "skin3"
  hair: z.object({ style: z.string(), color: z.string() }),     // style from kit: "side_part","long_straight","bald","bun","afro","crew",...
  face: z.object({
    glasses: z.enum(['none','large_square','round','aviator']).default('none'),
    facialHair: z.enum(['none','moustache','beard','stubble']).default('none'),
    brows: z.enum(['flat','heavy','thin','arched']).default('flat'),
  }),
  outfit: z.object({ top: z.string(), topColor: z.string(), bottom: z.string(), bottomColor: z.string(), shoes: z.string().default('plain') }),
  defaultExpression: z.enum(['neutral','vacant','worried','angry','shocked','smile','sad']).default('neutral'),
});

// ---------- Shots ----------
export const Camera = z.object({
  move: z.enum(['static','push_in','pull_out','pan_left','pan_right','tilt_up','tilt_down','push_in_pan_left','push_in_pan_right','shake']),
  amount: z.number().default(0.07),      // push: scale delta; pan: px/1000
  focus: z.tuple([z.number(), z.number()]).optional(), // focal point for pushes (defaults to frame centre)
});

export const ActorPlacement = z.object({
  ref: z.string(),                       // CharacterSpec.id or prop id
  kind: z.enum(['character','prop']),
  framing: z.enum(['full','waist','closeup','hands','small_distant']).default('waist'),
  x: z.number(), y: z.number(),          // anchor in frame coords (feet for full, chest for waist, face for closeup)
  scale: z.number().default(1),
  flip: z.boolean().default(false),
  layer: z.enum(['mid','subject','fg']).default('subject'),
  pose: z.string().default('idle'),      // from kit pose list
  expression: z.string().optional(),
});

export const Action = z.object({
  target: z.string(),                    // actor ref or set element id ("lamp", "door")
  action: z.string(),                    // from kit action list: "head_turn","blink","wave","thumb_up","fall_over","enter_from_left","swing","flicker","open_hands","hand_over","walk_in_place",...
  at: z.number().min(0).max(1),          // start, as fraction of shot duration
  dur: z.number().min(0).max(1).default(0.3),
  params: z.record(z.string(), z.any()).default({}),
});

export const Shot = z.object({
  id: z.string(),                        // "S01"
  lineIds: z.array(z.string()).min(1),   // which script lines play over this shot (usually 1)
  set: z.string(),                       // kit set id: "house_ext_ranch", "living_room_70s", "road_rural", "woods_night", ...
  setVariant: z.record(z.string(), z.any()).default({}), // set params: palette, time of day, props on/off
  palette: z.string().optional(),
  actors: z.array(ActorPlacement).default([]),
  actions: z.array(Action).default([]),
  camera: Camera,
  fx: z.array(z.enum(['fireflies','dust','rain','snow','red_tint','flicker','fade_black_end','fade_in','light_cone','fog'])).default([]),
  caption: z.string(),                   // usually = line caption; can be overridden
  captionTilt: z.number().min(-1.5).max(1.5).default(0),
  transitionIn: z.enum(['cut','paper_slide','flash','fade']).default('cut'),
  sfx: z.array(z.object({ id: z.string(), at: z.number().min(0).max(1), volume: z.number().default(0.8) })).default([]),
  // filled by timing stage:
  durationInFrames: z.number().int().optional(),
});

export const StorySpec = z.object({
  slug: z.string(),
  language: z.string(),                  // "en-IN"
  fps: z.literal(30).default(30),
  width: z.literal(1080).default(1080),
  height: z.literal(1920).default(1920),
  characters: z.array(CharacterSpec),
  shots: z.array(Shot).min(1),
  music: z.object({ id: z.string(), volume: z.number().default(0.18), duckTo: z.number().default(0.07) }).optional(),
  // filled by timing stage:
  vo: z.array(z.object({ lineId: z.string(), src: z.string(), startFrame: z.number().int(), durationInFrames: z.number().int() })).optional(),
  totalFrames: z.number().int().optional(),
  missingAssets: z.array(z.object({ kind: z.enum(['set','prop','action','pose','hair','outfit']), id: z.string(), description: z.string() })).default([]),
});
```

**Validation rule:** after the plan stage, every `set`, `prop`, `action`, `pose`, hair style and outfit must exist in the kit manifest. Anything unknown goes into `missingAssets`, and the pipeline stops at `planned` with a clear list. Claude Code then builds the missing pieces (`/add-asset`), or the planner retries with the instruction "use only these ids".

---

## 7. The kit (packages/kit) and the Remotion project (packages/video)

### 7.1 Core components
Port the prototype into these React components. All coordinates are in a 1080×1920 SVG `viewBox`, and the root renders one `<svg>` per frame.

- `<Filters/>`: renders the `<defs>` once: `cut`, `blur`, `blur3`, `glow`, `grain0..3`, gradients. IDs must be unique per composition instance (the Remotion Player in the dashboard may mount several), so prefix them with a `useId()`-based namespace passed via context.
- `<Cutout>`: wraps children in `filter="url(#cut)"`. Props: `shadow?: 'normal'|'low'|'none'`, `border?: number`.
- `<Ink>`: helpers `P`, `R`, `C`, `E` that render path/rect/circle/ellipse with ink stroke defaults.
- `<Layer depth="sky|far|mid|subject|fg|fx">`: applies the depth treatment and camera parallax from context.
- `<Camera move amount focus>`: provides `useCamera()` context with the current transform per depth.
- `<Puppet>`: renders a character from `CharacterSpec` + `pose` + active actions (section 7.2).
- `<CaptionCard text tilt lang>`: section 3.6. Measure text with a hidden `<canvas>` (or `@remotion/layout-utils` `measureText`/`fitText`) after the font has loaded. Use `delayRender` until the font is ready.
- `<Post frame>`: vignette + grain + jitter.
- `<Shot spec>`: composes set + actors + actions + fx + caption for one shot.
- `<Story spec>`: a `<Series>` (or `<TransitionSeries>` when non-cut transitions are used) of `<Shot>`s, plus `<Audio>` for each VO line and the music bed.
- Helpers: `useStopMotionTime()` returns `{t, tq, p}` for the current shot (`tq` quantized to 12 fps), `seededRandom(i)`, and the easings `easeInOutQuad`, `easeOutCubic`, `easeOutBack`, `easeOutBounce`.

### 7.2 Character rig
One parametric rig, front-facing 3/4-ish, built from separate cutout parts, each with a pivot:

```
head (pivot: neck base)    ── face features: ears, hair-back, face, hair-front, brows, eyes, glasses, nose, mouth, facial hair
neck
torso (pivot: hips)        ── collar, buttons/pocket details by outfit
upperArmL / upperArmR (pivot: shoulder)
foreArmL / foreArmR (pivot: elbow)      # optional; v1 can use single-piece arms like the prototype
handL / handR (pivot: wrist)            # hand shapes: relaxed, fist, open_palm, point, thumb_up, holding
legs (pivot: hips)                      # for "full" framing only: legL, legR, shoes
```

- **Framing presets:** `full` (whole body, about 460 px tall, for distant/road shots), `waist` (head to waist, about 1000 px, like the prototype's Dahmer), `closeup` (head and shoulders, about 1300 px), `hands` (two big hands only, for "he took X from his pocket" shots like the reference video).
- **Expressions** swap brows/eyes/mouth parts: neutral, vacant, worried, angry, shocked, smile, sad. **Blink** is an action that swaps eyes to lines for 3 to 4 frames.
- **Poses** are named sets of part rotations: `idle`, `arms_crossed`, `hands_on_hips`, `pointing`, `thumb_out` (hitchhiking), `holding_object`, `hands_open_offering`, `sitting`, `phone_to_ear`, `head_down`.
- **Profile view** (side-facing) is a v2 feature. In v1 use 3/4 front plus `flip` for direction.
- Hair styles (v1): `side_part`, `crew`, `long_straight`, `long_wavy`, `bald`, `receding`, `bun`, `bob`, `afro`, `mullet`, `ponytail`. Outfit tops: `button_shirt`, `tshirt`, `suit_jacket`, `sweater`, `dress`, `police_uniform`, `prison_jumpsuit`, `jacket_70s`. Bottoms: `jeans`, `slacks`, `skirt`.
- The prototype's Dahmer (shot 2) and hitchhiker (shot 3) are the first two rig targets. Rebuild them through the rig, not as one-off code.

### 7.3 Sets (v1 list, 16)
Each set is a component with params (palette, time of day, toggles) that renders its `sky/far/mid/fg` layers, plus named **anchor points** where actors and props go (`floor_y`, `table_top`, `door`, `chair`, ...) and named **elements** that actions can target (`lamp`, `door`, `window_light`).

`house_ext_ranch`, `house_ext_city_row`, `apartment_interior`, `living_room_70s`, `kitchen`, `bedroom`, `road_rural`, `car_interior_front`, `woods_night`, `city_street_night`, `bar_interior`, `police_interview_room`, `courtroom`, `newsroom_desk`, `prison_cell`, `victorian_parlour` (for horror classics like *The Monkey's Paw*).

### 7.4 Props (v1 list, about 40) and actions (v1, about 25)
Props: `car_70s_sedan`, `car_police`, `beer_bottle`, `glass`, `table`, `chair`, `lamp_hanging`, `lamp_floor`, `phone_rotary`, `phone_payphone`, `newspaper` (with headline text param), `polaroid` (with caption param), `evidence_bag`, `case_file`, `map_pin_board`, `shovel`, `dirt_mound`, `suitcase`, `luggage_tag` (text param), `letter`, `envelope`, `calendar` (date param), `clock` (time param), `tv_crt`, `radio`, `door`, `window`, `fence`, `mailbox`, `pine_tree`, `bush`, `grass_tuft`, `fern`, `moon`, `sun`, `streetlight`, `handcuffs`, `badge`, `key`, `monkey_paw` (for the classic).

Actions are implemented as pure functions `(params, tLocal, tq) => partial transforms/state`:
`blink`, `head_turn`, `head_tilt`, `nod`, `shake_head`, `look_up`, `arm_swing`, `wave`, `thumb_out_wave`, `point`, `open_hands`, `hand_over` (prop moves from one actor's hand to another's), `enter_from_left/right` (ease-out slide), `exit_left/right`, `drive_in` (car + wheel spin), `fall_over` (bounce rotation about a base pivot), `swing` (pendulum), `flicker` (light on/off random), `door_open/close`, `slam` (newspaper/prop drops in with shake), `pop_in` (scale overshoot), `float` (gentle bob), `walk_in_place` (leg/arm alternation at 12 fps), `tremble`.

### 7.5 Camera moves, fx and transitions
- Camera: listed in the `Camera` schema. Implemented once in `<Camera>`, parallax per depth (section 3.3).
- FX: `fireflies`, `dust` (motes in light cones), `rain`, `snow`, `fog` (blurred drifting shapes), `light_cone`, `flicker` (global brightness), `red_tint` (multiply `#9c1414`, ramping to 0.38), `fade_in`, `fade_black_end`.
- Transitions: `cut` (default), `paper_slide` (the next shot slides in like a paper sheet with a shadow edge, 8 frames), `flash` (2-frame warm-white flash), `fade` (8 frames). Use `@remotion/transitions` for these.

### 7.6 Performance: pre-baking cutouts (important for speed)
SVG filters (`feMorphology` + `feTurbulence` per part) are the main render cost. The prototype took about 2 m 20 s for 240 frames with one Chromium tab. Strategy:
1. **Parallelism first:** `renderMedia({ concurrency })`, which defaults to half the CPU cores. Measure it.
2. **Bake static parts:** any cutout whose drawing doesn't change within a shot (sets, most props, torsos, and heads per expression) is rendered **once** to a transparent PNG at 2× resolution, with border, shadow and texture included. Use `renderStill` of a `BakePart` composition. Cache it under `assets/baked/<hash>.png`, keyed by a hash of (component id + params + scale bucket). At render time the scene composes `<Img>`s with CSS transforms, and only the moving pivots matter.
3. **Pre-blur backgrounds:** bake the `sky/far` layers with blur applied.
4. **Grain:** pre-render 4 grain tiles to PNG and cycle them.
5. **Target:** a 60 s video (1800 frames) renders in **≤ 3 min on an 8-core machine**. Add a `pc bench` command that renders a fixed spec and prints frames per second.

Build v1 without baking (correct first), then add baking in Phase 6 behind a flag `PC_BAKE=1`, with a visual diff test proving baked ≈ live (pixel diff below a threshold).

### 7.7 Kit manifest (auto-generated)
`packages/kit/manifest.ts` is generated by a script (`pnpm kit:manifest`) that imports every set, prop, action, pose, hair and outfit, then writes `kit-manifest.json`:

```json
{
  "sets": [{ "id": "road_rural", "description": "Two-lane rural road at roadside, fields and telephone poles behind", "anchors": ["shoulder_x","road_y"], "elements": ["sun"], "params": {"palette": ["dusk","day","night"]} }],
  "props": [{ "id": "car_70s_sedan", "description": "...", "params": {"color": "string"} }],
  "actions": [{ "id": "fall_over", "targets": ["prop"], "params": {"direction": "left|right", "angle": "number"} }],
  "poses": ["idle","thumb_out", "..."],
  "hair": ["side_part", "..."], "outfits": { "top": ["..."], "bottom": ["..."] },
  "fx": ["..."], "transitions": ["..."]
}
```
The plan stage passes this manifest to the LLM so it can only choose real assets. Also add a **kit gallery** composition (`KitGallery`) that renders every set and prop on a contact sheet. It's useful for humans and for Claude to see what exists.

### 7.8 Remotion compositions (packages/video/src/Root.tsx)
- `Story`: props = a timed `StorySpec`. Uses `calculateMetadata` to set `durationInFrames = spec.totalFrames`, `fps`, `width` and `height` from the spec.
- `ShotPreview`: renders one shot in isolation, for fast iteration and stills.
- `KitGallery`: catalogue sheet.
- `BakePart`: renders a single part for baking (section 7.6).
- `Prototype10s`: the Dahmer 10 s test re-expressed as a StorySpec. This is the Phase 0 acceptance target.

Server-side rendering uses `@remotion/bundler` `bundle()` **once per batch/process** (cache the serve URL), then `selectComposition()` + `renderMedia()` per story, with `codec: 'h264'`, `crf: 18`, `pixelFormat: 'yuv420p'`, an `onProgress` callback that reports to the job and the CLI progress bar, and audio included. Use `renderStill()` for QA stills and covers.

---

## 8. Voiceover: Sarvam TTS

### 8.1 API facts (verify against the docs at build time)
- `POST https://api.sarvam.ai/text-to-speech`, header `api-subscription-key: $SARVAM_API_KEY`, JSON body.
- Body: `text` (required; up to 2500 chars for `bulbul:v3` / `bulbul:v4-flash`), `language_code` (required: `en-IN`, `hi-IN`, `bn-IN`, `ta-IN`, `te-IN`, `mr-IN`, `kn-IN`, `ml-IN`, `gu-IN`, `pa-IN`, `od-IN`), `speaker` (lowercase id; v3 voices include `shubh`, `aditya`, `rahul`, `kabir`, `rohan`, `priya`, `ritu`, `neha`, ...; v4-flash uses persona ids like `<name>_<language>_<style>`), `model` (`bulbul:v4-flash` recommended, `bulbul:v3` default), `pace` (0.5 to 2.0), `speech_sample_rate` (use **44100 or 48000**), `output_audio_codec` (`wav`), `temperature` (0.01 to 1.0, v3/v4 only), `dict_id` (pronunciation dictionary, v3/v4).
- Response: `{ request_id, audios: [base64 wav, ...] }`. Decode and save.
- The REST endpoint doesn't document word timestamps, so **synthesize one request per script line**. That gives exact per-line durations for timing and subtitles.

### 8.2 TTS stage behaviour
- Config per series in `series/<name>.json`: `{ model, speaker, pace, temperature, language voices map }`. The default for the true-crime series is a deep, measured male voice at pace about 0.95. Test 3 or 4 voices and let the owner pick (`pc voices --line "June 1978. Ohio."` renders the same line with several speakers into `data/voice-tests/`).
- **Text normalisation before sending:** expand numbers the way they should be spoken (`1978` → "nineteen seventy-eight"; `18` → "eighteen"), remove caption-only punctuation, and apply a pronunciation dictionary (Sarvam `dict_id`, or local respellings such as `Dahmer` → "Dah-mer").
- **Cache:** the filename is the hash of (text + speaker + model + pace + temperature + sample rate + language). Never re-bill for identical audio.
- Retries with exponential backoff on 429/5xx. Concurrency limit 4. Log `request_id`.
- After saving, measure the duration with ffprobe (or `@remotion/media-utils` `getAudioDurationInSeconds`). Trim leading and trailing silence with ffmpeg `silenceremove` (threshold −45 dB) for tight pacing, then re-measure.
- **Loudness:** normalise each line to −16 LUFS integrated (ffmpeg `loudnorm`, two-pass) so lines match. The final mix targets about −14 LUFS.
- **Fallback:** if `SARVAM_API_KEY` is missing, use a local placeholder TTS (silent WAV sized at 2.6 words/sec) so the rest of the pipeline is still testable. Also support **manual audio drop-in**: if `audio/<lang>/line-XXX.wav` already exists and is marked `manual: true` in `vo.json`, don't overwrite it.

### 8.3 Timing stage (voice drives the picture)
- For each shot: `duration = sum(line durations for lineIds) + gapAfter`, where `gapAfter = 0.18 s` by default and **0.5 s** after a `turn` or `cliffhanger` beat. Minimum shot length is 1.4 s. If a single line is over 4.5 s, the plan stage should have split it across two shots; warn if not.
- VO line `startFrame` = shot start + 4 frames (a small breath after the cut).
- First shot: add 0.3 s of pre-roll before the first line. Last shot: add 0.8 s tail for the fade.
- Write `04-spec.<lang>.json` with `durationInFrames` per shot, a `vo[]` track and `totalFrames`.
- **Subtitles (`.srt`)** come from the VO track, using the caption text (or the VO text, configurable).

### 8.4 Music and SFX
- The owner drops royalty-free tracks into `assets/music/` and describes them in `music.json` (`{id, file, mood: ['dark','tense','melancholy'], bpm, loopable, license}`). The plan stage picks one by mood.
- **Ducking:** music volume is `volume` normally and drops to `duckTo` while any VO line plays, with 6-frame ramps. Implement it as a Remotion `<Audio volume={(f) => ...}>` callback computed from the `vo[]` intervals. Fade the music in over 0.5 s and out over the last 1 s.
- SFX library `assets/sfx/` + `sfx.json` (`door_creak`, `bottle_fall`, `chair_fall`, `car_pass`, `car_stop`, `crickets_loop`, `wind_loop`, `clock_tick`, `paper_slide`, `thud`, `light_buzz`, `heartbeat`, ...). Shots reference SFX by id and position. Room-tone loops per set are a nice extra (crickets for `woods_night`).

---

## 9. LLM stages

There are two execution modes for each LLM stage, using the **same prompt templates** in `packages/pipeline/prompts/*.md`:

- **Claude Code mode (default when run interactively):** the slash command tells Claude Code to read the prompt template and inputs, do the work itself (including web research with its own tools), and write the output file, which is then validated by `pc validate <stage> <slug>`. No API key needed.
- **API mode (server and batch):** the pipeline calls the Anthropic API with the same template, structured output via a JSON schema (tool-use with `input_schema` from zod), and web search enabled for research. Key: `ANTHROPIC_API_KEY`.

### 9.1 Research + script (`prompts/script.md`)
Inputs: `00-brief.json`. Outputs: `01-research.md`, `02-script.json`.
Prompt requirements (put these in the template):
- Research from reputable sources: court records, major newspapers, established biographies and documentaries. Record every source used. **Each factual claim in a line must map to at least one source.** Where sources conflict, prefer the more conservative claim and note it.
- Write for the ear: short sentences, present or past tense used consistently, one idea per line, 4 to 12 words per line. About **2.5 spoken words per second**, so a 60 s target ≈ 140 to 150 words ≈ 14 to 20 lines.
- Structure: hook (line 1 must make people stop scrolling, without lying), setup, rising, turn, aftermath, and an optional cliffhanger for multi-part series.
- Captions: ≤ 48 characters, may compress the VO line, and are written in the same voice as the reference ("He took a shrivelled monkey's paw").
- **Sensitivity rules (true crime):** no graphic detail of violence or of what was done to bodies; name victims respectfully; no speculation presented as fact; don't glamorise the perpetrator; for living people, stick strictly to established public facts. Record what was left out in `sensitivityNotes`.
- Public-domain fiction (horror classics): adapt freely, but mark the original work and author in `sources`.

### 9.2 Shot planning (`prompts/plan.md`)
Inputs: approved `02-script.json`, `kit-manifest.json`, series style notes, `targetSeconds`. Output: `03-plan.json` (StorySpec without timings).
Rules for the planner:
- Usually one line per shot. Merge two short lines into one shot when they describe one image. Split a long line across two shots.
- **Only use ids from the manifest.** If something is truly needed and missing, add it to `missingAssets` with a one-sentence description, and use the closest existing fallback in the shot.
- Alternate shot scales for rhythm (wide establishing → waist → hands closeup → wide). Don't use more than two consecutive shots of the same set and framing.
- Every shot needs at least one moving thing (a camera move always, plus usually one puppet action).
- Respect safe zones (section 3.1) when choosing `x/y`.
- Violence is always implied through objects and fx (section 3.8).
- Define each character once in `characters[]` with consistent traits across all shots and all parts of a series. Store series characters in `series/<name>/characters.json` and reuse them.

### 9.3 QA review (`prompts/qa.md`)
Input: the contact sheet (2 fps, 10 frames per row) + `04-spec` + the script. The model checks for clipped or overflowing caption text, caption/VO mismatch, faces or props in unsafe zones, broken or missing parts (an arm detached from a body, a floating prop), wrong character continuity, scenes that contradict the line, anything graphic, and visual monotony. Output: `{ pass: boolean, issues: [{shotId, severity: 'block'|'warn', description, suggestedFix}] }`.

---

## 10. QA and packaging (automatic, no LLM needed)

Automatic checks (`pc qa`):
1. **Schema valid**, with no `missingAssets`.
2. **Caption fit:** the measured text width is ≤ 860 px at ≥ 40 px font. Otherwise the caption is too long, so fail with the shot id.
3. **Safe zones:** each actor's bounding box (computed from framing + x/y + scale) doesn't put a face (head bbox) in an unsafe zone.
4. **Duration:** total length within ±15% of `targetSeconds` and ≤ 90 s.
5. **Audio:** integrated loudness −15 to −13 LUFS (ffmpeg `ebur128`), true peak ≤ −1 dBTP, and no VO line overlapping another.
6. **Black/frozen frames:** ffmpeg `blackdetect` (except the intended end fade) and `freezedetect` (> 1.5 s).
7. **Render sanity:** the file plays, h264, yuv420p, 1080×1920, 30 fps, with an audio stream.
8. Then the **LLM review** (section 9.3) in API mode, or Claude Code looks at the contact sheet itself in Claude Code mode.

Packaging (`pc package`): copy the final mp4, generate `.srt`, render `cover.jpg` (a dedicated frame, by default the most "character" shot at 40% in, with the caption card), and write `post.txt`: hook line, 2 to 3 sentence summary, "Sources:" list, 8 to 15 hashtags per series template, and a content note for true crime ("Dramatised illustration. No graphic content.").

---

## 11. The server (apps/server)

A single-process Fastify app plus a worker loop (it can be the same process with `--worker`). It runs on the owner's machine. Default `http://localhost:4317`.

### 11.1 Data model (SQLite via Drizzle)
- `stories` (slug PK, topic, series, part, genre, status, languages JSON, created_at, updated_at, error)
- `jobs` (id, slug, stage, lang, status `queued|running|done|failed|cancelled`, attempts, progress 0..1, log text, created_at, started_at, finished_at)
- `series` (name PK, config JSON: voice, music moods, hashtag template, character file path)
- The files on disk stay the source of truth for content. The DB tracks status and jobs only.

### 11.2 Queue and worker
- DB-backed queue: the worker polls every 1 s, claims a job atomically (`UPDATE ... WHERE status='queued' ... RETURNING`), runs the stage function, and writes progress.
- **Concurrency per stage type:** `tts` 4, `llm` 2, `render` **1** (a render already uses all cores), `qa` 2.
- After a job finishes, the next stage is auto-enqueued, except after `scripted` (approval gate) and after a `qa_failed`.
- Retries: 3 with backoff for network stages. Render failures are not retried automatically.
- Graceful shutdown: running jobs are marked `queued` again on restart if they were interrupted.

### 11.3 HTTP API
```
POST   /api/stories                  { topic, series?, genre, targetSeconds?, languages? } -> creates brief, enqueues research+script
POST   /api/batches                  { series, genre, topics: string[] | csv } -> many stories
GET    /api/stories?status=...       list
GET    /api/stories/:slug            brief, script, plan, state, outputs
PUT    /api/stories/:slug/script     edit script JSON (validated)
POST   /api/stories/:slug/approve    approve script -> enqueue plan
POST   /api/stories/:slug/rerun      { fromStage, lang? }
POST   /api/stories/:slug/shots/:shotId  patch a single shot -> re-time/re-render
GET    /api/jobs?slug=...            job list + progress
GET    /api/files/:slug/*            serve story files (mp4, jpg, srt, json)
GET    /api/kit/manifest             kit manifest
GET    /api/events                   SSE stream of job progress
```
Auth: bind to `127.0.0.1` by default. If `PC_TOKEN` is set, require `Authorization: Bearer`. Don't expose it publicly without a token.

### 11.4 Dashboard (minimal)
A small React/Vite (or plain HTML + htmx) app served by Fastify at `/`:
- **Queue view:** stories grouped by status, with a progress bar per running job.
- **Approval view:** the script lines with their sources side by side, inline editing of VO/caption, approve/reject buttons, and batch approve.
- **Preview view:** the `@remotion/player` playing the timed `StorySpec` live in the browser, so there's no render needed to preview. Scrub per shot, with a JSON editor for the selected shot that re-plays instantly. This is the fastest iteration loop.
- **Outputs view:** the final mp4, cover, srt, post.txt copy button, and the QA report.

### 11.5 Where it runs
The owner's computer (Mac/Windows/Linux) needs Node 22, pnpm, ffmpeg and Chrome Headless Shell (Remotion downloads it via `npx remotion browser ensure`). Sarvam and Anthropic calls go out from that machine. Optional later: render on a cloud box or Remotion Lambda. Keep `render.ts` behind an interface (`Renderer.local` / `Renderer.lambda`) so that's a swap.

---

## 12. Claude Code integration

### 12.1 `CLAUDE.md` (create in repo root, keep it short)
It should contain:
- One paragraph on what the project is, plus pointers to this spec and `reference_prototype.html`.
- The style rules in 10 bullets (cutout filter per part, ink line, depth layers, 12 fps puppet time, safe zones, caption card, no on-screen violence).
- Commands: `pnpm dev` (Remotion Studio), `pnpm server`, `pc --help`, `pnpm test`, `pnpm kit:manifest`.
- Conventions: every new set/prop/action must register in the manifest, ship a `KitGallery` entry, and have a `renderStill` snapshot test.
- "Never edit files under `data/stories/*/audio` that are marked manual. Never auto-approve true-crime scripts."

### 12.2 Slash commands (`.claude/commands/*.md`)
- `/new-story <topic> [--series X] [--seconds 60] [--lang en-IN,hi-IN]`: create the brief, do research + script in Claude Code mode, validate, show the script as a table with sources, and **stop for approval**.
- `/approve <slug>`: mark it approved, then run plan → validate → (if `missingAssets`, list them and stop) → tts → timing → render → qa → package. Report the output path and show the contact sheet.
- `/batch <file.csv|topics...> --series X`: create briefs and scripts for all topics, present them for approval in one table, then run the rest for the approved ones, sequentially for render.
- `/add-asset <kind> <id> "<description>"`: build a new set/prop/action/pose/hair/outfit following the style bible, add it to the manifest and gallery, render a still, and show it.
- `/fix-shot <slug> <shotId> "<what to change>"`: edit the spec for one shot, re-render only that shot's stills, then the full video.
- `/voice-test "<line>"`: render the line with 4 or 5 Sarvam speakers for the owner to pick.
- `/kit`: render and show the KitGallery contact sheet.

### 12.3 Subagents (`.claude/agents/*.md`)
- `researcher`: web research and fact table with sources (read-only tools + web).
- `shot-planner`: script + manifest → `03-plan.json`. Knows the style and taste rules.
- `qa-reviewer`: looks at the contact sheet and spec and writes `qa/*.report.json`. It must not have seen the planning context (fresh eyes).
- `asset-artist`: builds new kit SVG components to the style bible and checks its own work with `renderStill` + viewing the PNG.

---

## 13. Art sourcing: two tracks

**Track A, code-drawn (v1 default).** Claude Code writes every part as SVG in React, as in the prototype. It's fully automatic and consistent. The ceiling is simpler, flatter characters.

**Track B, hybrid illustrated (v2, optional).** Generate richer character and set art once with an image model, matching the style ("flat cut-paper illustration, muted 1970s palette, thick white die-cut border, plain background"). Then:
1. Remove backgrounds (`rembg` or similar).
2. Split characters into parts (head, torso, arms, hands) by hand-drawn masks or a segmentation model, and save them as PNGs with pivot metadata (`parts.json`).
3. Register them in the kit as `ImageCharacter` / `ImageProp` components that use the same `<Cutout>` treatment (the border may already be in the art, so make the filter's border optional).

Design the rig and props interface so **Track A and Track B parts are interchangeable** (same pivot and anchor schema). Don't build Track B until Phase 7.

Copyright: art must be original. Don't recreate other channels' characters or designs. Music and SFX must be licensed for commercial use, and the licence is recorded in `music.json`/`sfx.json`.

---

## 14. Build plan (phases with acceptance criteria)

Stop after each phase, summarise, show stills or video, and wait for the owner.

### Phase 0: Scaffold and port the prototype
- pnpm monorepo, TS configs, lint, vitest, `.env.example`, `CLAUDE.md`, README.
- Remotion project with `<Filters/>`, `<Cutout>`, `<Layer>`, `<Camera>`, `<CaptionCard>`, `<Post>` ported from `reference_prototype.html`.
- `Prototype10s` composition reproduces the five-shot Dahmer test from a **hand-written StorySpec JSON**. It can be one-off components for now, but driven by the spec.
- **Accept:** `pnpm remotion render Prototype10s` produces an MP4 that visually matches the prototype (compare stills at t = 1.5, 3.2, 4.9, 7.0, 9.0 s).

### Phase 1: Kit v1
- Character rig (section 7.2) with framings, 5 expressions, 6 poses, 6 hair styles, 5 outfits.
- 8 sets: `house_ext_ranch`, `living_room_70s`, `road_rural`, `woods_night`, `kitchen`, `police_interview_room`, `city_street_night`, `victorian_parlour`.
- 20 props and 15 actions from the lists, plus all fx and transitions.
- Manifest generator + `KitGallery` + snapshot tests.
- Re-express `Prototype10s` entirely through kit pieces (no one-off components).
- **Accept:** KitGallery sheet looks consistent; the prototype rebuilt from the kit looks as good as or better than the original.

### Phase 2: Voice and timing
- Sarvam client, normalisation, cache, retries, silence trim, loudnorm, voice-test command.
- Timing stage, VO track, music bed with ducking, SFX, SRT.
- **Accept:** a hand-written 30 s script in JSON → voiced and timed MP4 with music and correct subtitles, with no manual timing.

### Phase 3: LLM stages
- Prompt templates, zod → JSON schema, Claude Code mode slash commands (`/new-story`, `/approve`), API mode clients.
- Validation and `missingAssets` handling.
- **Accept:** `/new-story "How Jeffrey Dahmer killed his first victim" --seconds 45` → script with sources → approve → finished MP4 with no manual edits, which passes QA. Second test: *The Monkey's Paw, part 1*.

### Phase 4: QA and packaging
- All automatic checks, contact sheet, LLM review, cover, post.txt.
- **Accept:** a deliberately broken spec (overlong caption, face in an unsafe zone) is caught with clear messages.

### Phase 5: Server, queue, dashboard, batch
- Fastify API, SQLite queue, worker, SSE progress, dashboard with approval, live Player preview and outputs.
- `/batch` and `POST /api/batches`.
- **Accept:** submit 5 topics → approve 5 scripts in the dashboard → 5 packaged videos with no further input.

### Phase 6: Speed
- Pre-baking (section 7.6), concurrency tuning, bundle reuse, `pc bench`.
- **Accept:** 60 s video renders in ≤ 3 min on the owner's machine (report actual numbers); a baked vs live visual diff stays below the threshold.

### Phase 7: Multipliers (optional)
- Multi-language: the script stage also produces `translations`, then TTS, captions and font per language, so one plan gives N videos.
- Series memory: recurring characters, intro/outro stings, a "Part N" card.
- Track B art.
- Profile-view rig, mouth flaps synced to VO amplitude (talking characters).
- Remotion Lambda renderer.

---

## 15. Testing

- **Unit:** schema validation, timing math, text normalisation (number words), SRT generation, ducking curve, safe-zone bbox math.
- **Visual snapshots:** `renderStill` of every kit item and of fixed frames of `Prototype10s`, compared with a pixel-diff tolerance (e.g. `pixelmatch`, threshold 0.1, ≤ 0.5% differing pixels).
- **Integration:** a fixture story with placeholder TTS runs the full pipeline in CI-like mode (`pc run fixtures/sample --tts=placeholder`) and produces a valid MP4.
- **No network in tests.** Mock Sarvam and Anthropic.

---

## 16. Config and secrets

`.env`:
```
SARVAM_API_KEY=
ANTHROPIC_API_KEY=            # only for API mode / server batches
PC_DATA_DIR=./data
PC_PORT=4317
PC_TOKEN=                     # optional bearer token for the server
PC_BAKE=0
PC_RENDER_CONCURRENCY=        # default: half the cores
PC_DEFAULT_MODEL_SCRIPT=claude-opus-5-5
PC_DEFAULT_MODEL_PLAN=claude-sonnet-5-5
PC_DEFAULT_MODEL_QA=claude-sonnet-5-5
```
Never commit `.env`, `data/` or `assets/baked/`. Log API request ids, never keys.

---

## 17. CLI reference (`pc`)

```
pc new "<topic>" [--series s] [--genre true_crime] [--seconds 60] [--lang en-IN,hi-IN]
pc script <slug> [--mode claude-code|api]
pc approve <slug>
pc plan <slug> [--mode ...]
pc validate <stage> <slug>
pc tts <slug> [--lang en-IN] [--force]
pc time <slug> [--lang en-IN]
pc render <slug> [--lang en-IN] [--shot S03] [--still 0.4]
pc qa <slug> [--lang en-IN]
pc package <slug> [--lang en-IN]
pc run <slug> [--from plan] [--to package]       # chain stages
pc batch <topics.csv> --series s                  # create + script all, then wait for approvals
pc voices --line "<text>" [--lang en-IN]          # speaker audition
pc kit gallery | pc kit manifest
pc bench
pc status [slug]
```

---

## 18. Appendix A: the 10 s prototype as a StorySpec (Phase 0 target)

The style numbers are in `reference_prototype.html`. The content is below. In Phase 0, write the equivalent JSON and make it render.

| Shot | Lines (VO = caption) | Set / content | Camera | Actions / fx |
|---|---|---|---|---|
| S01 0–2 s | "June 1978. Ohio." | Ranch house at dusk, lit windows, sun low behind; pines in fg left/right; mailbox fg | push_in 0.08 (fg parallax ×1.75, pines drift outward 70 px) | fireflies |
| S02 2–4 s | "Jeffrey Dahmer, 18, home alone." | Living room 70s (blurred wallpaper, window, lamp); character waist framing centre: blond side part, large square glasses, olive button shirt, vacant expression | push_in 0.07 | head_turn −4°→+3°, arm_swing ±2°, blink at 1.05 s |
| S03 4–6 s | "He picked up a hitchhiker, Steven Hicks." | Rural road at dusk, poles, fields; hitchhiker full framing at x≈800 (long brown hair, white tee, jeans) | pan_left 40 + push 0.05 | car_70s_sedan (scale 1.4) drive_in to x≈−95 by 62% with wheel spin; thumb_out_wave until 62% then arm lowers |
| S04 6–8 s | "When Hicks tried to leave, Dahmer killed him." | Dark interior, back door ajar with moonlight, window with moon; table with two beer bottles; chair right | push_in 0.06 + shake at impact | lamp swing (14°, pendulum), bottle fall_over 90° at 42–55% (bounce), chair fall_over 80°, flicker after 45%, red_tint ramps 45–75% |
| S05 8–10 s | "No one would know for 13 years." | Woods at night, moon, blurred trunks; dirt mound with shovel; grass tufts fg | push_in 0.09 (fg ×1.6) | fireflies; fade_black_end from 82%; caption fades with it |

## 19. Appendix B: definition of done for a single video
- [ ] Script approved by the owner; every factual line has a source.
- [ ] No graphic violence on screen; sensitivity notes recorded.
- [ ] All shots use kit assets; no `missingAssets`.
- [ ] VO clear, consistent loudness; music ducked; ends with a fade.
- [ ] Captions fit, are readable, and stay inside safe zones.
- [ ] Automatic QA passes; LLM/visual QA has no `block` issues.
- [ ] `out/<lang>/` contains mp4, srt, cover.jpg and post.txt.
