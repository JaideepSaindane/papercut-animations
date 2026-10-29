---
description: Research and script a new Papercut short, then stop for the owner's approval
argument-hint: "<topic>" [--series X] [--genre true_crime|horror_classic|history|mystery|other] [--seconds 60] [--lang en-IN] [--format vertical|horizontal|all] [--part N]
---

Create a new story for: $ARGUMENTS

This is **Claude Code mode** (spec 9): you do the research and writing yourself with the same prompt templates the API mode uses. The pipeline then validates your files.

1. **Brief.** Run `pnpm -s pc new <topic and flags exactly as given>`. It prints the slug. If no `--genre` was given, infer it from the topic and pass it (`true_crime` is the default; *The Monkey's Paw*-style public-domain fiction is `horror_classic`). Pass `--part` when the topic says "part N".

2. **Research.** Run `pnpm -s pc prompt research <slug>` and follow it exactly.
   - Use WebSearch/WebFetch. For a big topic, delegate to the `researcher` subagent with the rendered prompt.
   - Write the notes to `data/stories/<slug>/01-research.md`. Every fact has a source id, and every source has a real URL you actually opened.

3. **Script.** Run `pnpm -s pc prompt script <slug>` and follow it exactly. Write the JSON object (no fences) to `data/stories/<slug>/02-script.json`. The prompt's word target comes from the series narrator's measured speaking rate, so respect it.

4. **Validate.** Run `pnpm -s pc validate script <slug>`. Fix every error (✖), then re-run until it says OK. Fix warnings (⚠) when it's easy, especially the word count.

5. **Present for approval, then STOP.** Show the owner:
   - a table: `# | beat | spoken line | caption | sources`;
   - the sources list (id, title, URL);
   - the sensitivity notes;
   - word count and estimated length (words ÷ the prompt's words per second ÷ 0.8);
   - any remaining warnings.

   Then ask the owner to approve, edit, or reject.

**Never approve the script yourself.** Do not run `pc approve`. For true crime this is a hard rule. The owner approves with `/approve <slug>` or by telling you to.
