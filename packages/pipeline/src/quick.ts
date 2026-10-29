// The cheap path: one Gemini call (Flash-Lite by default) writes the narration and the shot plan
// together from a compact catalogue of the code-drawn kit; then the usual voice → timing → render.
// No research, no candidates, no judge — a few rupees per video.
import path from 'node:path';
import { z } from 'zod';
import { Script, StorySpec, type Brief, type Format } from '@papercut/schema';
import { buildManifest, PACKS } from '@papercut/kit';
import { REPO_ROOT, hashOf, log, readJson, writeJson } from '@papercut/shared';
import { newStory } from './author';
import { geminiJson, geminiModels, makeGemini, userText, type GeminiClient } from './gemini';
import { renderTemplate, wordBudget } from './prompts';
import { FILES, loadBrief, loadSeries, markStage, storyFile } from './story';
import { validatePlan, validateScript } from './validate';
import { runStory, type RunOptions } from './run';

/** Genres whose lines must cite sources — they need the researched path, not this one. */
const FACTUAL = new Set(['true_crime', 'history', 'mystery']);

const first = (d: string) => d.split(/(?<=[.;:—])\s/)[0].replace(/\s+/g, ' ');

/** The kit as a few compact lines per section: ids plus a short gloss, the pack's sets only. */
export const quickCatalogue = (pack: string) => {
  const m = buildManifest();
  const c = m.characters;
  const sets = m.sets
    .filter((s) => s.pack === pack)
    .map(
      (s) =>
        `- ${s.id} [times: ${(s.variants ?? []).map((v) => v.time).join('/') || 'any'}; stand at: ${Object.entries(
          s.anchors,
        )
          .map(([k, [x, y]]) => `${k} ${x},${y}`)
          .join(', ')}]: ${first(s.description)}`,
    );
  const props = m.props.map((p) => `- ${p.id}: ${first(p.description)}`);
  const actions = m.actions.map((a) => `- ${a.id}: ${first(a.description)}`);
  return [
    `### Sets\n${sets.join('\n')}`,
    `### Props and animals\n${props.join('\n')}`,
    `### Characters\nbase: ${c.bases.join(', ')}\npose: ${c.poses.join(', ')}\nexpression: ${c.expressions.join(', ')}\nhair (incl. headwear; colour = a hair colour or #hex): ${c.hair.join(', ')}\ntop: ${c.outfits.top.join(', ')}\nbottom: ${c.outfits.bottom.join(', ')}\nskin: ${c.colours.skin.join(', ')}; hair colours: ${c.colours.hair.join(', ')}; clothes: any #hex`,
    `### Actions\n${actions.join('\n')}`,
    `### fx: ${m.fx.join(', ')}\n### transitions: ${m.transitions.join(', ')}`,
  ].join('\n\n');
};

const Reply = z.object({
  title: z.string(),
  lines: z.array(z.object({ id: z.string(), vo: z.string(), caption: z.string(), beat: z.string() })).min(3),
  leftOut: z.array(z.string()).default([]),
  characters: z.array(z.any()).default([]),
  shots: z.array(z.any()).min(1),
});

export type QuickOptions = {
  topic: string;
  pack?: string;
  genre?: Brief['genre'];
  seconds?: number;
  formats?: Format[];
  series?: string;
  notes?: string;
  model?: string;
  client?: GeminiClient;
};

/**
 * One call: narration + shot plan, validated against the brief and the kit (errors go back for a fix,
 * at most twice). Writes 02-script.json and 03-plan.json and approves the story for voicing.
 */
export const quickStory = async (o: QuickOptions) => {
  const genre = o.genre ?? 'folklore';
  if (FACTUAL.has(genre))
    throw new Error(
      `${genre} stories must cite sources — use the researched path (pc new / pc script), not pc make`,
    );
  const pack = o.pack ?? 'folklore';
  if (!PACKS[pack]) throw new Error(`unknown pack "${pack}" (have: ${Object.keys(PACKS).join(', ')})`);
  const slug = newStory({
    topic: o.topic,
    genre,
    pack,
    seconds: o.seconds ?? 40,
    formats: o.formats ?? ['vertical', 'horizontal'],
    series: o.series,
    languages: ['en-IN'],
  });
  const brief = loadBrief(slug);
  const budget = wordBudget(brief, loadSeries(brief.series));
  const example = (
    readJson(path.join(REPO_ROOT, 'packages/video/fixtures/folklore-proof.spec.json')) as StorySpec
  ).shots[0];
  const model = o.model ?? geminiModels().fast;

  const build = (r: z.infer<typeof Reply>) => {
    const script = Script.parse({
      title: r.title,
      hook: r.lines[0].vo,
      lines: r.lines.map((l) => ({ ...l, sourceIds: [] })),
      sources: [],
      sensitivityNotes: r.leftOut,
    });
    const plan = {
      slug,
      language: 'en-IN',
      format: brief.formats[0],
      style: PACKS[pack].style,
      characters: r.characters,
      shots: r.shots,
    };
    return { script, plan };
  };

  const { value, attempts } = await geminiJson<{ script: Script; plan: StorySpec }>({
    client: o.client ?? makeGemini(),
    model,
    system:
      'You write and stage short paper-cutout animations using only the given asset ids. Return only the JSON object.',
    contents: userText(
      renderTemplate('quick', {
        topic: o.topic,
        genre,
        pack: `${PACKS[pack].name} — ${PACKS[pack].motifs.join('; ')}`,
        seconds: brief.targetSeconds,
        targetWords: budget.targetWords,
        minLines: budget.minLines,
        maxLines: budget.maxLines,
        tone: genre === 'folklore' ? 'warm storyteller, a little eerie, wonder-filled' : brief.tone,
        notes: o.notes ? `- Notes: ${o.notes}` : '',
        catalogue: quickCatalogue(pack),
        example: JSON.stringify(example),
      }),
    ),
    thinking: 'LOW',
    repairs: 2,
    cost: { slug, stage: 'quick' },
    check: (raw) => {
      const r = Reply.safeParse(raw);
      if (!r.success)
        return { errors: r.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`) };
      let built;
      try {
        built = build(r.data);
      } catch (e) {
        return { errors: [(e as Error).message.slice(0, 600)] };
      }
      const s = validateScript(built.script, brief, budget);
      const p = validatePlan(built.plan, built.script);
      const errors = [...s.errors, ...p.errors];
      return errors.length ? { errors } : { errors: [], value: { script: built.script, plan: p.plan! } };
    },
  });

  writeJson(storyFile(slug, FILES.script), value.script);
  writeJson(storyFile(slug, FILES.plan), value.plan);
  markStage(slug, 'script', hashOf(value.script), 'scripted');
  // the owner asked for this story by running the command; non-factual stories need no further gate
  markStage(slug, 'approve', 'quick:owner', 'approved');
  markStage(slug, 'plan', hashOf(value.plan), 'planned');
  log.info(
    `make ${slug}: "${value.script.title}", ${value.script.lines.length} lines, ${value.plan.shots.length} shots (${model}, ${attempts} call(s))`,
  );
  return slug;
};

/** `pc make`: one cheap call, then voice, timing and render in every format. */
export const makeVideo = async (o: QuickOptions & { engine?: RunOptions['engine'] }) => {
  const slug = await quickStory(o);
  return runStory(slug, { from: 'validate', engine: o.engine });
};
