// TTS stage (spec 8.2): one request per script line, cached by content hash, silence-trimmed and
// loudness-normalised to −16 LUFS so every line matches.
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Script, TtsEngine, VoLine } from '@papercut/schema';
import {
  readJsonIf,
  cacheDir,
  ensureDir,
  hashOf,
  log,
  loudnorm,
  mapPool,
  probeDuration,
  trimSilence,
  writeJson,
} from '@papercut/shared';
import { defaultEngine, synthesize, voiceKey } from './engines';
import { normaliseForSpeech, wordCount } from './normalise';
import { SARVAM_INR_PER_CHAR, type MeasuredRates } from './sarvam-voices';
import { recordCost, refreshCostsPage } from './costs';
import { FILES, isApproved, loadBrief, loadScript, loadSeries, loadVo, markStage, storyFile, voiceFor } from './story';

export type TtsOptions = {
  lang?: string;
  engine?: TtsEngine;
  force?: boolean;
  concurrency?: number;
  fetchFn?: typeof fetch;
  onProgress?: (done: number, total: number) => void;
};

/** Lines for a language: the script's own lines, or its translation. */
export const linesFor = (script: Script, lang: string, baseLang = 'en-IN') => {
  if (lang === baseLang) return script.lines.map((l) => ({ id: l.id, vo: l.vo, caption: l.caption }));
  const t = script.translations?.[lang];
  if (!t) throw new Error(`script has no translation for ${lang}`);
  return t;
};

/** Measured speaking rates per speaker (words and seconds at pace 1), learned from every Sarvam run. */
export const voiceRatesFile = () => path.join(cacheDir('tts'), '..', 'voice-rates.json');
export const loadVoiceRates = (): MeasuredRates => readJsonIf<MeasuredRates>(voiceRatesFile()) ?? {};

/** Fold freshly synthesised lines into the per-speaker rates (only lines produced this run, so nothing double counts). */
const recordRates = (lines: VoLine[], pace: number) => {
  if (!lines.length) return;
  const rates = loadVoiceRates();
  for (const l of lines) {
    const r = (rates[l.speaker] ??= { words: 0, seconds: 0 });
    r.words += wordCount(l.text);
    r.seconds += l.durationSec * pace; // normalise to pace 1
  }
  writeJson(voiceRatesFile(), rates);
};

export const ttsStage = async (slug: string, opts: TtsOptions = {}) => {
  const lang = opts.lang ?? 'en-IN';
  if (!isApproved(slug)) throw new Error(`${slug}: script is not approved yet (pc approve ${slug})`);
  const brief = loadBrief(slug);
  const script = loadScript(slug);
  const series = loadSeries(brief.series);
  const voice = voiceFor(series, lang);
  const engine = opts.engine ?? defaultEngine();
  const lines = linesFor(script, lang);
  const previous = new Map((loadVo(slug, lang)?.lines ?? []).map((l) => [l.lineId, l]));
  const audioDir = ensureDir(storyFile(slug, 'audio', lang));
  const rawCache = ensureDir(cacheDir('tts'));
  let done = 0;
  let synthesized = 0;
  let billedChars = 0;

  const out: VoLine[] = await mapPool(lines, opts.concurrency ?? 4, async (line, i) => {
    const rel = `audio/${lang}/line-${String(i + 1).padStart(3, '0')}.wav`;
    const file = storyFile(slug, rel);
    const prev = previous.get(line.id);
    const text = normaliseForSpeech(line.vo, voice.respell);
    const finish = (v: VoLine) => {
      opts.onProgress?.(++done, lines.length);
      return v;
    };

    // hand-made audio is never overwritten (spec 8.2 "manual drop-in")
    if (prev?.manual && existsSync(storyFile(slug, prev.file))) {
      return finish({ ...prev, durationSec: await probeDuration(storyFile(slug, prev.file)) });
    }
    const hash = hashOf({ text, engine, lang, voice: voiceKey(engine, voice), post: 'trim-45+lufs-16' });
    if (!opts.force && prev?.hash === hash && existsSync(file)) return finish(prev);

    // raw synthesis cache, shared across stories: identical text + voice is never billed twice
    const raw = path.join(rawCache, `${hashOf({ text, engine, lang, voice: voiceKey(engine, voice) })}.wav`);
    let requestId: string | undefined;
    let speaker = engine === 'sarvam' ? voice.speaker : engine === 'system' ? `say:${voice.systemVoice}` : 'placeholder';
    if (!existsSync(raw) || opts.force) {
      const tmp = `${raw}.part.wav`;
      const r = await synthesize(engine, { text, lang, voice, out: tmp }, opts.fetchFn);
      copyFileSync(tmp, raw);
      rmSync(tmp, { force: true });
      rmSync(`${tmp}.txt`, { force: true });
      rmSync(tmp.replace(/\.wav$/, '.aiff'), { force: true });
      requestId = r.requestId;
      speaker = r.speaker;
      synthesized++;
      if (engine === 'sarvam') {
        billedChars += text.length;
        recordCost({ slug, stage: 'tts', provider: 'sarvam', model: voice.model, item: 'tts_chars', quantity: text.length, requestId, note: `${lang} ${line.id} ${speaker}` });
      }
      if (requestId) log.info(`  ${line.id} sarvam request_id=${requestId}`);
    }

    // trim silence (skip for placeholder silence), then normalise loudness
    const trimmed = path.join(audioDir, `.${line.id}.trim.wav`);
    if (engine === 'placeholder') copyFileSync(raw, trimmed);
    else await trimSilence(raw, trimmed, -45);
    await loudnorm(trimmed, file, -16, voice.sampleRate);
    rmSync(trimmed, { force: true });

    return finish({
      lineId: line.id,
      file: rel,
      durationSec: await probeDuration(file),
      hash,
      text,
      engine,
      speaker,
      requestId,
      chars: text.length,
      manual: false,
      fresh: !!requestId,
    } as VoLine & { fresh?: boolean });
  });

  recordRates(out.filter((l) => (l as VoLine & { fresh?: boolean }).fresh), voice.pace);
  const clean = out.map((l) => {
    const { fresh, ...rest } = l as VoLine & { fresh?: boolean };
    void fresh;
    return rest;
  });
  writeJson(storyFile(slug, FILES.vo(lang)), { language: lang, lines: clean });
  markStage(slug, `tts:${lang}`, hashOf(clean.map((l) => l.hash)), 'voiced');
  const total = out.reduce((s, l) => s + l.durationSec, 0);
  if (billedChars) refreshCostsPage();
  const cost = billedChars ? `, ${billedChars} chars billed ≈ ₹${(billedChars * SARVAM_INR_PER_CHAR).toFixed(2)}` : '';
  log.info(`tts ${slug} [${lang}] ${engine}: ${out.length} lines (${synthesized} synthesized, ${out.length - synthesized} cached${cost}), ${total.toFixed(1)} s of speech`);
  return out;
};
