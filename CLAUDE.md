# Papercut Shorts

Automated pipeline: topic → researched script → (human approval) → shot plan (StorySpec JSON) → Sarvam VO → timing → Remotion render → QA → packaged vertical short (1080×1920) in a paper-cutout puppet style. Full design: `PAPERCUT_SPEC.md`. Visual source of truth: `reference_prototype.html` — port its numbers, don't reinvent them. Build phase by phase (spec §14) and stop after each phase for owner review.

## House style and packs (platform direction)
- New work uses the **diorama** house style (`StorySpec.style: "diorama"`): flat jewel-coloured paper layers, soft layer shadows, no white border, no ink outline, every layer sharp (no depth blur). The old **diecut** style below stays for the existing true-crime/horror stories (`style` defaults to `diecut`).
- Creative **packs** (`packages/kit/src/packs.ts`): `folklore` (Gond/Madhubani pattern skin, sets in day/dusk/night), `crime` (Indian true crime + drama, muted, sets in day/night), `classic` (the original die-cut sets). Sets join a pack via `pack`, `style` and `variants` on the `SetDef`; time of day is `shot.setVariant.time`. Shared outdoor pieces live in `sets/folkWorld.tsx`.
- Indian costumes: tops `kurta`, `sherwani`, `sari`, `khaki_uniform`, `choli`; bottoms `dhoti`, `pajama`, `sari`, `ghagra`; headwear as hair styles `turban`, `veil`, `police_cap` (hair colour = cloth colour). Animals (face left, flip for right): `tiger`, `elephant`, `cow`, `horse`, `dog`, `peacock` (`fan`), `owl`, `crow`, `cobra`, `birds_flock`.
- **Assets are code-drawn.** Never call an image-generation model (or any paid API to make art) without the owner's explicit approval for that run, with the cost stated first.
- Review sheets: `node packages/video/scripts/stills.mjs gallery sets [pack]` (one row per set, one column per variant) and `node packages/video/scripts/stills.mjs review <fixture>` (each shot, both formats). Review fixtures: `folklore-proof`, `folk-animals`, `india-cast`.

## Style rules (classic die-cut)
- Every cutout part gets its own `cut` filter (`<Cutout>`): 7 px off-white `#f3ead8` die-cut border, drop shadow, paper texture.
- Ink line `#2b1d17`, width 3 (fine details 2), round joins — use `P/R/C/E` from `core/Ink`.
- Build shots from depth layers (`<Layer depth>`): sky/far (blurred, parallax 0.3/0.4), mid/subject (sharp, 1.0), fg (1.6–2.0), fx, post, ui.
- Puppet motion uses 12 fps quantized time (`useStopMotionTime().tq`); camera motion is smooth with `easeInOutQuad`.
- Puppets only rotate rigid parts around pivots. Nothing bends.
- Safe zones: top 0–200, bottom 1500–1920, right column x 930–1080 / y 900–1500. Main action box x 80–920, y 420–1480.
- Caption card: IM Fell English 54 px, shrinks to fit 860 px, wraps to 2 lines below 40 px; top at y=250, drops in over 0.28 s with easeOutBack.
- Post is always on: vignette, grain (opacity 0.16, overlay, 4 seeds every 2 frames), ±1.25 px hand-held jitter.
- Never show violence on screen. Imply it with objects, light, red tint, or cutting to the aftermath.
- Muted palettes (`packages/kit/src/palettes.ts`). Red is only used as a tint or accent at the turn.

## Formats
Every story renders **vertical (1080×1920)** and/or **horizontal (1920×1080)** from the same spec (`StorySpec.format`, or the `format` prop on the `Story` composition; `Brief.formats` lists which to make). Scenes are drawn once in world coordinates (the vertical frame); horizontal is a 16:9 window (`FORMATS.horizontal.view`) at the same pixel scale. So sets must span `useView()` horizontally, anchor framing elements (fg trees, ferns) to `useView(0)` edges, and draw captions/post in `<ScreenSpace>`. Actors can carry a `landscape: {x, y, scale}` override.

## Commands
- `pnpm dev`: Remotion Studio
- `pnpm render:proto` / `pnpm render:proto:landscape`: render `Prototype10s` (vertical / horizontal) to `packages/video/out/`
- `pnpm stills:proto`: acceptance stills in both formats (t = 1.5, 3.2, 4.9, 7.0, 9.0 s)
- `pnpm kit:manifest`: regenerate `packages/kit/kit-manifest.json`
- `pnpm kit:gallery`: contact sheets → `packages/video/out/gallery/` (props, cast, poses, expressions, hair, outfits, framings, sets in both formats)
- `pnpm test` (unit) / `pnpm test:visual` (pixel-diff snapshots, `--update` to rebaseline) / `pnpm typecheck` / `pnpm lint`
- `pnpm pc <cmd>` (or `apps/cli/bin/pc`): `approve`, `validate plan`, `tts`, `time`, `render [--format all] [--still 0.4]`, `run <slug|fixture-dir> [--from/--to]`, `voices --line "…"`, `status`, `assets placeholders`
- `pnpm pc run fixtures/monkeys-paw-30s`: the Phase 2 acceptance story (script → voice → timing → both formats)
- Authoring: `pc new "<topic>" [--genre --series --seconds --format all]`, `pc prompt research|script|plan <slug>`, `pc validate script|plan <slug>`, `pc approve <slug>`, `pc script|plan <slug> --mode api`, `pc render <slug> --shots` (one still per shot + sheet)
- **Making stories (the default, cheap path):** `pc make "<topic>" [--pack folklore|crime --genre folklore --seconds 40]` — one Gemini Flash-Lite call writes the narration and the shot plan from a compact kit catalogue (`prompts/quick.md`, ~3k tokens), validated against the kit; then Sarvam voice, timing and render in both formats. About ₹3 per video. For volume: `pc topics add <file> --pack …` → owner runs `pc topics approve <id>` → `pc batch <id>` (pc make per topic). Folklore/drama/fiction only; true crime, history and mystery must cite sources and use the researched path below. Keep this path cheap: no multi-call research/candidate/judge pipelines.
- Slash commands: `/new-story`, `/approve`, `/voice-test`, `/kit`; subagents `researcher`, `shot-planner`
- Not built yet: `pnpm server`, `pc qa` / `pc package` (Phase 4)

## Authoring (Phase 3)
- Claude Code mode (default): Claude Code researches and writes `01-research.md`, `02-script.json` and `03-plan.json` from `pc prompt …`, then `pc validate …` must pass. API mode (`--mode api`) runs the same templates through the Anthropic API (`claude-opus-5-5` for script, `claude-sonnet-5-5` for plan, refusal fallbacks on) and needs `ANTHROPIC_API_KEY`.
- Script word budgets come from the series narrator's measured speaking rate (`data/cache/voice-rates.json`, learned from every Sarvam run).
- **Stop at `scripted` and show the owner the script. Never run `pc approve` yourself — for true crime this is absolute.**

## Costs
- Every billable call (Sarvam TTS characters, Anthropic tokens and web searches) appends to `data/costs.jsonl`. Prices live in `config/pricing.json` (editable; USD→INR rate included) and amounts are computed from it.
- The Costs page `data/costs.html` refreshes after every paid call; `pc costs [slug]` prints the same summary. When the Phase 5 dashboard exists it serves this as its Costs page.
- Any new paid provider must call `recordCost` and get a rate in `config/pricing.json`.

## Voice and audio
- TTS engines: `sarvam` (used when `SARVAM_API_KEY` is in `.env`), `system` (macOS `say`, an audible stand-in), `placeholder` (silence at 2.6 words/s). Choose one with `--engine`.
- Raw synthesis is cached in `data/cache/tts/<hash>.wav`, keyed by text + voice settings, so identical audio is never billed twice. `vo.json` lines marked `"manual": true` are never overwritten.
- Voice settings live in `series/<name>.json`. Timing comes from the voice: never hand-set `durationInFrames` in a plan.
- Music and SFX live in `assets/music/music.json` and `assets/sfx/sfx.json` (with licences). `pc assets placeholders` writes original stand-ins (`placeholder_*`, gitignored).

## Conventions
- Every new set/prop/action/pose/hair/outfit registers in its index (`SETS`, `PROPS`, `ACTIONS`, `POSES`, `HAIR`, `TOPS`), so it lands in the manifest and the gallery automatically; check it in both formats and run `pnpm test:visual --update`.
- Animate through actions: targets read `useTarget(id)` (pure `evalTarget` underneath). Don't hard-code timing that belongs in the spec. Puppet actions use 12 fps time; light/camera use smooth time.
- Rotate and mirror with `<Rot>` / `<Mirror>` (never a raw `rotate()` around a `<Cutout>`), so the paper shadow keeps falling down-right on screen.
- Props are drawn around their origin (usually base centre) and declare `bbox` and `pivots`. Rig drawing uses rig space (neck at 540,1150).
- SVG ids must come from `useDefs()` (namespaced per composition).
- Never edit files under `data/stories/*/audio` that are marked manual. Never auto-approve true-crime scripts.
