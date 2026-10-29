# Papercut Shorts

This pipeline turns a topic into a finished short in a paper-cutout puppet animation style, rendered **vertical (9:16)** or **horizontal (16:9)** from the same plan. See `PAPERCUT_SPEC.md` for the full design.

## Status: Phase 3 (LLM stages) is done

| Package | What's there |
|---|---|
| `packages/schema` | zod schemas (Brief, Script, CharacterSpec, Shot, StorySpec), output `FORMATS`, transition-aware `specTotalFrames`, JSON Schema export |
| `packages/kit` | **Core**: filters, cutouts with rotation-aware shadows, depth layers, parallax camera, caption card, post layer, both formats<br>**Characters**: rig with 7 bases, 5 framings, 9 poses, 7 expressions, 11 hair styles, 8 tops, 3 bottoms, glasses and facial hair<br>**Content**: 9 sets, 39 props, 29 actions, 10 fx, 4 transitions<br>**Manifest**: generator and `findMissingAssets` validation |
| `packages/shared` | `.env` loading, story/data paths, hashing, ffmpeg wrappers (probe, silence trim, two-pass loudnorm), concurrency pool, retry with backoff |
| `packages/pipeline` | Speech normalisation, Sarvam client, TTS engines, `tts` / `time` / `render` stages, SRT, music/SFX resolution, voice audition, placeholder audio, `run` chaining |
| `apps/cli` | `pc` command line |
| `packages/pipeline/prompts` | research / script / plan prompt templates shared by Claude Code mode and API mode |
| `.claude/` | `/new-story`, `/approve`, `/voice-test`, `/kit` commands; `researcher` and `shot-planner` subagents |
| `packages/video` | Remotion project: `Prototype10s` / `Prototype10sLandscape` (built entirely from kit pieces), `Story`, `ShotPreview`, `KitGallery-*` sheets; stills, gallery and snapshot scripts |

## Setup
Requirements: Node 20+, pnpm 9, and ffmpeg. Remotion downloads Chrome Headless Shell on the first render.

```bash
pnpm install
pnpm dev                     # Remotion Studio
pnpm render:proto            # -> packages/video/out/prototype10s.mp4 (1080×1920)
pnpm render:proto:landscape  # -> packages/video/out/prototype10s-landscape.mp4 (1920×1080)
pnpm kit:gallery             # -> packages/video/out/gallery/*.png
pnpm test && pnpm test:visual
```

### Topic → script → approval → video

```bash
# in Claude Code (default mode — no Anthropic key needed):
/new-story "How Jeffrey Dahmer killed his first victim" --seconds 45 --format all
/approve how-jeffrey-dahmer-killed-his-first-victim

# or fully automatic via the Anthropic API (needs ANTHROPIC_API_KEY):
pnpm pc new "The Monkey's Paw, part 1" --genre horror_classic --part 1 --seconds 45
pnpm pc script the-monkeys-paw-part-1 --mode api
pnpm pc approve the-monkeys-paw-part-1          # the human gate
pnpm pc run the-monkeys-paw-part-1 --mode api   # plan → validate → tts → time → render
```

Validation catches the following before anything is voiced:
- **Script:** unknown or missing sources, unsourced lines in factual genres, captions over 48 characters, a word count far off the narrator's budget, and missing sensitivity notes for true crime.
- **Plan:** assets the kit lacks, script lines missing or out of order, faces in unsafe zones or outside the horizontal frame, monotonous framing, and a red tint outside the turn.

### Voice → timing → video

```bash
cp .env.example .env                   # add SARVAM_API_KEY for the real voice
pnpm pc assets placeholders            # stand-in music + SFX (replace with licensed audio)
pnpm pc run fixtures/monkeys-paw-30s   # validate → tts → time → render (vertical + horizontal)
pnpm pc voices --line "June 1978. Ohio."   # audition speakers -> data/voice-tests/
pnpm pc status
```

Outputs land in `data/stories/<slug>/`: `audio/<lang>/line-NNN.wav` and `vo.json`, `04-spec.<lang>.json`, `out/<lang>/<slug>.srt`, and `render/<lang>.<format>.mp4`. Without a Sarvam key, the pipeline uses macOS `say` (or silence on other systems), so everything stays testable.

To render any spec in either format:

```bash
cd packages/video && npx remotion render src/index.ts Story out/x.mp4 --props='{"spec": <StorySpec>, "format": "horizontal"}'
```

## How the two formats work
Scenes are authored once in world coordinates (the 1080×1920 frame). `horizontal` is a 1920×1080 window onto that world, centred on the main action box, at the same pixel scale. That means characters are the same size in both formats and nothing is rescaled.

- **Sets:** backdrops are drawn across whatever is visible, and horizontal frames get extra scenery at the sides.
- **Framing elements:** foreground trees and ferns stick to the frame edges.
- **Screen-space elements:** the caption card, grain and vignette are laid out per format (in horizontal the caption sits at the top, with a wider max width).
- **Per-actor overrides:** use `landscape: {x, y, scale}` when a placement needs to differ in horizontal.

## Schema refinements vs. spec §6
- `StorySpec.format` (`vertical` | `horizontal`) and `Brief.formats`. Width and height are derived from the format.
- `ActorPlacement.params` (prop parameters, `holding` for held props) and `ActorPlacement.landscape`.
- `Camera.pan` (px) for combined push+pan moves, and `Camera.fgParallax`.
- `fx` entries can be a bare id or `{ id, at, dur, params }`.
- Camera shake is the action `{ target: "camera", action: "shake" }`.
- Numbered prop instances (`beer_bottle_2`) or `params.prop` let one prop appear several times.

## Costs
Every billable call is logged to `data/costs.jsonl`: Sarvam characters (with request ids), Anthropic input/output/cache tokens, and web searches. Amounts come from `config/pricing.json`, which you can edit: Sarvam ₹30/10K characters, Claude prices per model, and the USD→INR rate. Changing a rate re-prices history.

- **Costs page:** `data/costs.html` shows totals, a breakdown by story and stage, by service, and the full ledger. It refreshes after every paid call.
- **Terminal summary:** `pnpm pc costs [slug]`.

## Audio pipeline
- **Normalisation:** numbers, years, currency, ordinals, percentages and decades become words ("£200" → "two hundred pounds", "1978" → "nineteen seventy-eight"). Caption-only punctuation is stripped and series respellings are applied.
- **Synthesis:** one Sarvam request per line (`bulbul:v3`, 48 kHz WAV), with concurrency 4 and retries on 429/5xx. Request ids are logged; keys never are.
- **Per line:** silence trimmed at −45 dB, then two-pass loudnorm to −16 LUFS.
- **Timing:** each shot is breath (4 frames) + lines + 0.18 s gap (0.5 s after turn/cliffhanger beats), with 0.3 s pre-roll on the first shot, a 0.8 s tail on the last, and a 1.4 s minimum. The shot before a fade or paper slide is extended by the overlap so lines never collide.
- **Music:** ducked from `volume` to `duckTo` under every VO line (6-frame ramps), faded in over 0.5 s and out over 1 s.
- **Final mix:** loudness-normalised to −14 LUFS with true peak ≤ −1 dB, video stream copied.

## Notes
- **Snapshots:** visual snapshot baselines live in `packages/video/snapshots/` (~30 MB of PNGs). Consider Git LFS if the repo goes to GitHub.
- **Render speed:** about 5.5 fps vertical and 7.8 fps horizontal (5× concurrency, 10 cores); the 26 s fixture takes about 2.5 min vertical. Pre-baking cutouts (Phase 6) is the planned speed-up.
- **Short-clip loudness:** per-line loudness lands about 1–2 dB under −16 LUFS on 2-second lines, because EBU R128 gating is coarse on short clips. The final mix is normalised separately.

## Remotion licence
Remotion is free for individuals and for organisations of up to 3 people, including commercial use. At 4 or more people a company licence is needed (an "Automators" plan exists for automated pipelines). The owner should confirm which applies.
