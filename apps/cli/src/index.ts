// `pc` — Papercut Shorts command line (spec 17). Phase 2: voice, timing, render, run, voices, status.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Command, Option } from 'commander';
import { Brief, Format, TtsEngine, type StoryState } from '@papercut/schema';
import {
  STAGES,
  makeVideo,
  approveStory,
  approveTopicList,
  createTopicList,
  runBatch,
  checkPlan,
  money,
  summarise,
  writeCostsPage,
  checkScript,
  formatIssues,
  generatePlaceholders,
  loadBrief,
  loadState,
  newStory,
  planApi,
  planPrompt,
  renderStage,
  renderShotStills,
  renderStoryStill,
  researchAndScriptApi,
  researchPrompt,
  runStory,
  scriptPrompt,
  timeStage,
  ttsStage,
  voiceAudition,
  type Mode,
  type Stage,
} from '@papercut/pipeline';
import { dataDir, log, storyDir } from '@papercut/shared';

const program = new Command('pc').description('Papercut Shorts pipeline').showHelpAfterError();

const engineOpt = () => new Option('--engine <engine>', 'TTS engine (default: sarvam if SARVAM_API_KEY is set, else system on macOS, else placeholder)').choices(TtsEngine.options);
const formatList = (v: string): Format[] => (v === 'all' || v === 'both' ? ['vertical', 'horizontal'] : v.split(',').map((f) => Format.parse(f.trim())));
const progressBar = (label: string) => (done: number, total: number) =>
  process.stdout.write(`\r  ${label} ${done}/${total}${done === total ? '\n' : ''}`);

const action =
  <A extends unknown[]>(fn: (...a: A) => Promise<unknown> | unknown) =>
  async (...a: A) => {
    try {
      await fn(...a);
    } catch (e) {
      log.error((e as Error).message);
      process.exitCode = 1;
    }
  };

const modeOpt = () => new Option('--mode <mode>', 'claude-code: print the prompt for Claude Code; api: call the Anthropic API').choices(['claude-code', 'api']).default('claude-code');
const printIssues = (label: string, i: { errors: string[]; warnings: string[] }) => {
  console.log(formatIssues(label, i));
  if (i.errors.length) process.exitCode = 1;
};

program
  .command('new <topic>')
  .description('create a story brief (data/stories/<slug>/00-brief.json)')
  .option('--series <name>', 'series name (voice + music config from series/<name>.json)')
  .option('--part <n>', 'part number in the series')
  .addOption(new Option('--genre <genre>').choices(Brief.shape.genre.options).default('true_crime'))
  .option('--seconds <n>', 'target length in seconds', '60')
  .option('--lang <langs>', 'comma-separated languages', 'en-IN')
  .option('--format <formats>', 'vertical, horizontal, or all', 'vertical')
  .option('--constraint <text...>', 'extra constraints for the writer')
  .option('--slug <slug>', 'explicit slug')
  .action(
    action((topic: string, o: { series?: string; part?: string; genre: Brief['genre']; seconds: string; lang: string; format: string; constraint?: string[]; slug?: string }) => {
      const slug = newStory({
        topic,
        series: o.series,
        part: o.part ? Number(o.part) : undefined,
        genre: o.genre,
        seconds: Number(o.seconds),
        languages: o.lang.split(','),
        formats: formatList(o.format),
        constraints: o.constraint,
        slug: o.slug,
      });
      console.log(slug);
    }),
  );

program
  .command('prompt <stage> <slug>')
  .description('print the rendered prompt for a stage (research | script | plan) — Claude Code mode')
  .action(
    action((stage: string, slug: string) => {
      const fn = { research: researchPrompt, script: scriptPrompt, plan: planPrompt }[stage];
      if (!fn) throw new Error(`unknown stage "${stage}" (research | script | plan)`);
      console.log(fn(slug));
    }),
  );

program
  .command('script <slug>')
  .description('research + script (api mode calls Claude with web search; claude-code mode prints the prompts)')
  .addOption(modeOpt())
  .action(
    action(async (slug: string, o: { mode: Mode }) => {
      if (o.mode === 'api') {
        return printIssues(`script ${slug}`, await researchAndScriptApi(slug));
      }
      console.log(`Claude Code mode: run /new-story in Claude Code, or render the prompts with
  pc prompt research ${slug}
  pc prompt script ${slug}
then write 01-research.md and 02-script.json and run: pc validate script ${slug}`);
    }),
  );

program
  .command('plan <slug>')
  .description('shot plan from the approved script (api mode calls Claude; claude-code mode prints the prompt)')
  .addOption(modeOpt())
  .action(
    action(async (slug: string, o: { mode: Mode }) => {
      if (o.mode === 'api') {
        return printIssues(`plan ${slug}`, await planApi(slug));
      }
      console.log(`Claude Code mode: run /approve ${slug} in Claude Code, or render the prompt with
  pc prompt plan ${slug}
then write 03-plan.json and run: pc validate plan ${slug}`);
    }),
  );

program
  .command('validate <stage> <slug>')
  .description('validate a stage output: script (sources, captions, length, sensitivity) or plan (kit assets, coverage, safe zones)')
  .action(
    action((stage: string, slug: string) => {
      if (stage === 'script') return printIssues(`script ${slug}`, checkScript(slug));
      if (stage === 'plan') return printIssues(`plan ${slug}`, checkPlan(slug));
      throw new Error(`validate ${stage}: use "script" or "plan" (qa comes in Phase 4)`);
    }),
  );

program
  .command('approve <slug>')
  .description('approve the script (the human gate before planning and voice); the script must validate')
  .action(
    action((slug: string) => {
      const res = approveStory(slug);
      if (res.warnings.length) console.log(formatIssues(`script ${slug}`, res));
      if (loadBrief(slug).genre === 'true_crime') console.log('true crime: approved by the owner ✔');
    }),
  );

program
  .command('tts <slug>')
  .description('synthesise one WAV per script line (cached), trim silence, normalise to −16 LUFS')
  .option('--lang <lang>', 'language', 'en-IN')
  .addOption(engineOpt())
  .option('--force', 're-synthesise even when cached')
  .action(
    action(async (slug: string, o: { lang: string; engine?: TtsEngine; force?: boolean }) => {
      await ttsStage(slug, { lang: o.lang, engine: o.engine, force: o.force, onProgress: progressBar('tts') });
    }),
  );

program
  .command('time <slug>')
  .description('time shots from the voice: writes 04-spec.<lang>.json and out/<lang>/<slug>.srt')
  .option('--lang <lang>', 'language', 'en-IN')
  .action(action((slug: string, o: { lang: string }) => timeStage(slug, { lang: o.lang })));

program
  .command('render <slug>')
  .description('render the timed spec to render/<lang>.<format>.mp4 (or a still)')
  .option('--lang <lang>', 'language', 'en-IN')
  .option('--format <formats>', 'vertical, horizontal, or all', 'vertical')
  .option('--still <fraction>', 'render one still at this fraction of the video instead')
  .option('--shots', 'render one still per shot + a contact sheet instead (quick check)')
  .option('--concurrency <n>', 'Chromium tabs (default: half the cores)')
  .action(
    action(async (slug: string, o: { lang: string; format: string; still?: string; shots?: boolean; concurrency?: string }) => {
      for (const format of formatList(o.format)) {
        if (o.shots) {
          console.log(await renderShotStills(slug, { lang: o.lang, format }));
        } else if (o.still) {
          const out = path.join(storyDir(slug), 'render', `${o.lang}.${format}.still-${o.still}.png`);
          await renderStoryStill(slug, { lang: o.lang, format, at: Number(o.still), output: out });
          log.info(out);
        } else {
          await renderStage(slug, { lang: o.lang, format, concurrency: o.concurrency ? Number(o.concurrency) : undefined });
        }
      }
    }),
  );

program
  .command('run <slugOrFixture>')
  .description('chain stages: plan → validate → tts → time → render (a fixture folder is imported first)')
  .addOption(new Option('--from <stage>').choices([...STAGES]))
  .addOption(new Option('--to <stage>').choices([...STAGES]))
  .option('--lang <langs>', 'comma-separated languages (default: brief.languages)')
  .option('--format <formats>', 'vertical, horizontal, or all (default: brief.formats)')
  .addOption(engineOpt())
  .option('--force', 're-synthesise voice even when cached')
  .addOption(new Option('--mode <mode>', 'who writes a missing plan').choices(['claude-code', 'api']).default('claude-code'))
  .action(
    action(async (s: string, o: { from?: Stage; to?: Stage; lang?: string; format?: string; engine?: TtsEngine; force?: boolean; mode: Mode }) => {
      const { slug, outputs } = await runStory(s, {
        from: o.from,
        to: o.to,
        langs: o.lang?.split(','),
        formats: o.format ? formatList(o.format) : undefined,
        engine: o.engine,
        force: o.force,
        mode: o.mode,
      });
      log.info(`done: ${slug}${outputs.length ? `\n  ${outputs.join('\n  ')}` : ''}`);
    }),
  );

program
  .command('voices')
  .description('audition one line in several voices → data/voice-tests/')
  .requiredOption('--line <text>', 'the line to speak')
  .option('--lang <lang>', 'language', 'en-IN')
  .option('--speakers <list>', 'comma-separated speaker ids')
  .option('--pace <n>', 'pace 0.5–2.0', '0.95')
  .addOption(engineOpt())
  .action(
    action(async (o: { line: string; lang: string; speakers?: string; pace: string; engine?: TtsEngine }) => {
      await voiceAudition({ line: o.line, lang: o.lang, engine: o.engine, speakers: o.speakers?.split(','), pace: Number(o.pace) });
    }),
  );

program
  .command('status [slug]')
  .description('story status (all stories when no slug)')
  .action(
    action((slug?: string) => {
      const slugs = slug ? [slug] : existsSync(path.join(dataDir(), 'stories')) ? readdirSync(path.join(dataDir(), 'stories')) : [];
      if (!slugs.length) log.info('no stories yet');
      for (const s of slugs) {
        const st: StoryState = loadState(s);
        const stages = Object.entries(st.stages)
          .map(([k, v]) => `${k}@${v.at.slice(5, 16).replace('T', ' ')}`)
          .join('  ');
        console.log(`${s.padEnd(32)} ${st.status.padEnd(10)} ${stages}${st.error ? `\n  ✖ ${st.error}` : ''}`);
      }
    }),
  );

program
  .command('make <topic>')
  .description('the cheap path: one Gemini Flash-Lite call writes the story + shot plan from the kit, then voice and render (folklore, drama, fiction)')
  .option('--pack <id>', 'creative pack (folklore, crime)', 'folklore')
  .addOption(new Option('--genre <genre>').choices(Brief.shape.genre.options).default('folklore'))
  .option('--seconds <n>', 'target length', '40')
  .option('--format <formats>', 'vertical, horizontal, or all', 'all')
  .option('--series <name>', 'series (voice + music config)')
  .option('--notes <text>', 'extra direction for the writer')
  .option('--model <id>', 'Gemini model (default: the fast model, Flash-Lite)')
  .addOption(engineOpt())
  .action(
    action(async (topic: string, o: { pack: string; genre: Brief['genre']; seconds: string; format: string; series?: string; notes?: string; model?: string; engine?: TtsEngine }) => {
      const r = await makeVideo({ topic, pack: o.pack, genre: o.genre, seconds: Number(o.seconds), formats: formatList(o.format), series: o.series, notes: o.notes, model: o.model, engine: o.engine });
      for (const f of r.outputs) console.log(`  ${f}`);
      console.log(`cost: pc costs ${r.slug}`);
    }),
  );

const topics = program.command('topics').description('topic lists: the owner approves lists, the engine does the rest');
topics
  .command('add <file>')
  .description('create a draft topic list from a CSV (topic[,part,notes]) or a text file (one topic per line)')
  .addOption(new Option('--genre <genre>').choices(Brief.shape.genre.options).default('folklore'))
  .option('--pack <id>', 'creative pack (folklore, crime)', 'folklore')
  .option('--series <name>', 'series (voice + music config)')
  .option('--name <name>', 'list name')
  .option('--seconds <n>', 'target length per video', '45')
  .option('--lang <langs>', 'comma-separated languages', 'en-IN')
  .option('--format <formats>', 'vertical, horizontal, or all', 'all')
  .action(
    action((file: string, o: { genre: Brief['genre']; pack: string; series?: string; name?: string; seconds: string; lang: string; format: string }) => {
      const list = createTopicList({ file, genre: o.genre, pack: o.pack, series: o.series, name: o.name, seconds: Number(o.seconds), languages: o.lang.split(','), formats: formatList(o.format) });
      list.topics.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t.topic}`));
      console.log(`approve with: pc topics approve ${list.id}`);
    }),
  );
topics
  .command('approve <id>')
  .description('approve a topic list (the human gate: pc batch then makes every topic)')
  .action(action((id: string) => approveTopicList(id)));

program
  .command('batch <listId>')
  .description('make every topic of an approved list the cheap way (one Gemini call each, then voice and render)')
  .option('--concurrency <n>', 'stories in parallel', '2')
  .action(action(async (id: string, o: { concurrency: string }) => runBatch(id, { concurrency: Number(o.concurrency) })));

program
  .command('costs [slug]')
  .description('spend so far (Sarvam TTS, Anthropic tokens, web searches); --page writes the Costs page')
  .option('--page', 'write data/costs.html (the standalone Costs page)')
  .action(
    action((slug: string | undefined, o: { page?: boolean }) => {
      const all = summarise();
      const s = slug ? summarise(all.entries.filter((e) => e.slug === slug)) : all;
      console.log(`total ${money(s.total, s.currency)} over ${s.entries.length} billable calls${s.unpriced ? ` (${s.unpriced} unpriced)` : ''}`);
      for (const x of s.byStory)
        console.log(`  ${x.slug.padEnd(44)} ${money(x.total, s.currency).padStart(9)}  ${Object.entries(x.byStage).map(([k, v]) => `${k} ${money(v, s.currency)}`).join(' · ')}`);
      if (o.page) log.info(`Costs page: ${writeCostsPage()}`);
    }),
  );

const assets = program.command('assets').description('asset library helpers');
assets
  .command('placeholders')
  .description('synthesise placeholder music beds + SFX into assets/ (original, replace with licensed audio)')
  .option('--force', 'regenerate files')
  .action(action((o: { force?: boolean }) => generatePlaceholders(o)));

await program.parseAsync();
