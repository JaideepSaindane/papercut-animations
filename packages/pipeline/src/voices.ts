// Speaker audition (spec 8.2 `pc voices`): the same line in several voices, for the owner to pick.
import path from 'node:path';
import { VoiceConfig, type TtsEngine } from '@papercut/schema';
import { dataDir, ensureDir, log, loudnorm, rmSafe, trimSilence } from '@papercut/shared';
import { defaultEngine, synthesize } from './engines';
import { normaliseForSpeech } from './normalise';
import { SARVAM_AUDITION } from './sarvam-voices';
import { recordCost } from './costs';

/** Deep / measured narrators first, then contrasting voices. */
export const AUDITION_SPEAKERS: Record<TtsEngine, string[]> = {
  sarvam: SARVAM_AUDITION,
  system: ['Rishi', 'Aman', 'Daniel', 'Reed'],
  placeholder: ['placeholder'],
};

export const voiceAudition = async ({
  line,
  lang = 'en-IN',
  engine = defaultEngine(),
  speakers,
  pace = 0.95,
}: {
  line: string;
  lang?: string;
  engine?: TtsEngine;
  speakers?: string[];
  pace?: number;
}) => {
  const dir = ensureDir(path.join(dataDir(), 'voice-tests', `${engine}-${lang}`));
  const text = normaliseForSpeech(line);
  const files: string[] = [];
  for (const sp of speakers ?? AUDITION_SPEAKERS[engine]) {
    const voice = VoiceConfig.parse(engine === 'system' ? { systemVoice: sp, pace } : { speaker: sp, pace, temperature: 0.4 });
    const raw = path.join(dir, `.${sp}.raw.wav`);
    const trimmed = path.join(dir, `.${sp}.trim.wav`);
    const out = path.join(dir, `${sp}.wav`);
    const r = await synthesize(engine, { text, lang, voice, out: raw });
    if (engine === 'sarvam')
      recordCost({ slug: '_tools', stage: 'voice-test', provider: 'sarvam', model: voice.model, item: 'tts_chars', quantity: text.length, requestId: r.requestId, note: `${lang} ${sp}` });
    await trimSilence(raw, trimmed);
    await loudnorm(trimmed, out, -16, voice.sampleRate);
    for (const f of [raw, trimmed, `${raw}.txt`, raw.replace(/\.wav$/, '.aiff')]) rmSafe(f);
    files.push(out);
    log.info(`  ${sp} -> ${out}`);
  }
  return files;
};
