You write and stage short narrated paper-cutout animations. In one go, write the story's narration AND its shot plan, using only the asset library listed below (everything on screen is pre-drawn; nothing new can be made).

## Story
- Topic: {{topic}}
- Genre: {{genre}} — pack: {{pack}}
- Length: about {{seconds}} seconds = **{{targetWords}} spoken words** over {{minLines}}–{{maxLines}} lines.
- Tone: {{tone}}
{{notes}}

## Narration rules
- Written for the ear: short sentences, one idea per line, 4–12 words per line, simple words a text-to-speech voice reads well (no parentheses or abbreviations).
- `beat` per line: line 1 is `hook` (stops the scroll), then `setup`, `rising`, exactly one `turn`, `aftermath`, and end with `cliffhanger` or `outro`.
- `caption` per line: at most 48 characters, the line compressed, printed on screen.
- No graphic violence; imply it. Tell a complete little story with a turn and an ending.

## Staging rules
- One shot per line (or two short lines in one shot), every line used once, in order. `lineIds` lists them.
- World is 1080×1920 (x right, y down); the horizontal frame shows x −420…1500, y 410…1490, so keep people and key props inside x 80–920, y 420–1480.
- Actors: `{"ref","kind":"character"|"prop","x","y","scale","framing","pose","expression","layer","flip","params"}`.
  - Characters: `framing` `full` (x,y = feet, y 1460–1500, scale 1.3–1.5; two people at x ≈ 300 and 720), `waist` (x 540, y 1400, scale 1), `closeup` (x 540, y 1000). `params.holding` = a prop id to hold it.
  - Props/animals: x,y = their base on the ground (y ≈ 1470–1500 on the stage), scale 0.6–1; `flip: true` to face right. Animals face left by default.
- Each shot: `set` (an id below) and `setVariant` `{"time": …}` from that set's times; `camera` `{"move": "push_in"|"pull_out"|"push_in_pan_left"|"push_in_pan_right"|"static", "amount": 0.05–0.12, "focus": [x, y]}`; 1–3 `actions` `{"target": actor ref or "camera", "action", "at": 0–1, "dur": 0–1, "params"}`; optional `fx`; `caption` = the line's caption; `captionTilt` alternating −1 / 1; `transitionIn` `cut` (or `fade`/`paper_slide`/`flash` sparingly). Last shot: fx `{"id":"fade_black_end","at":0.85}`.
- Change scale and set between shots; keep characters consistent (define each once in `characters`).
- Never set `durationInFrames` — the voice decides timing.

## Library (use ONLY these ids)
{{catalogue}}

## Example shot
```json
{{example}}
```

## Output
Return only JSON:
```json
{"title":"…","lines":[{"id":"L01","vo":"…","caption":"…","beat":"hook"}],"leftOut":["anything deliberately not shown, and why"],"characters":[{"id":"…","displayName":"…","base":"…","skin":"…","hair":{"style":"…","color":"…"},"face":{"glasses":"none","facialHair":"none","brows":"flat"},"outfit":{"top":"…","topColor":"#hex","bottom":"…","bottomColor":"#hex"},"defaultExpression":"neutral"}],"shots":[{"id":"S01","lineIds":["L01"],"set":"…","setVariant":{"time":"…"},"actors":[],"actions":[],"camera":{"move":"push_in","amount":0.06},"fx":[],"caption":"…","captionTilt":-1}]}
```
