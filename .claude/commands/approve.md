---
description: Approve a story's script, then plan, voice, time and render it
argument-hint: <slug> [--format vertical|horizontal|all]
---

The owner approves story: $ARGUMENTS

Typing this command is the owner's approval of the current `02-script.json`. If they asked for edits first, make and re-validate them before continuing.

1. **Approve.** Run `pnpm -s pc approve <slug>`. If it fails, show the errors and stop.

2. **Plan.** Run `pnpm -s pc prompt plan <slug>` and follow it exactly (or delegate to the `shot-planner` subagent with the rendered prompt). Write the StorySpec JSON (no fences) to `data/stories/<slug>/03-plan.json`.
   - Use only ids from the manifest in the prompt. Think in world coordinates, so the plan works in both formats.
   - Imply violence, never show it. Red tint only at the turn.

3. **Validate.** Run `pnpm -s pc validate plan <slug>` and fix every error.
   - **Missing assets:** if the plan genuinely needs one, list each missing set/prop/action with a one-line description and **stop**. The owner decides whether to build it (`/add-asset`) or accept a fallback.
   - Fix face-in-unsafe-zone and outside-horizontal-frame warnings.

4. **Look before rendering.** Voice and time it, then render one still per shot and check the contact sheet:
   `pnpm -s pc run <slug> --from tts --to time`, then `pnpm -s pc render <slug> --shots --format all`, then view `data/stories/<slug>/render/stills/<lang>.<format>/sheet.png` with Read.
   Fix anything wrong in the plan (overlaps, off-frame faces, a set that contradicts the line), then re-run from `time`.

5. **Render.** Run `pnpm -s pc run <slug> --from tts`. This voices with Sarvam when `SARVAM_API_KEY` is set, times, and renders every format in the brief (`--format all` to force both).

6. **Report** the output paths (`render/<lang>.<format>.mp4`, `out/<lang>/<slug>.srt`), the length versus the target, and the Sarvam cost from the tts log line. Show a contact sheet: frames at 2 fps tiled with ffmpeg, viewed with Read.
