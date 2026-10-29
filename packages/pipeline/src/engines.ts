// TTS engines. `sarvam` is the real voice; `system` (macOS `say`) gives audible speech for local testing
// without an API key; `placeholder` writes silence sized at 2.6 words/sec (spec 8.2 fallback).
import { writeFileSync } from 'node:fs';
import type { TtsEngine, VoiceConfig } from '@papercut/schema';
import { env, ffmpeg, run, silence } from '@papercut/shared';
import { sarvamSynthesize } from './sarvam';
import { SARVAM_VOICES, isSarvamVoice } from './sarvam-voices';
import { wordCount } from './normalise';

export type SynthArgs = { text: string; lang: string; voice: VoiceConfig; out: string };
export type SynthResult = { requestId?: string; speaker: string };

/** Pick the engine: explicit choice, else Sarvam when a key is set, else macOS `say`, else silence. */
export const defaultEngine = (): TtsEngine =>
  env('SARVAM_API_KEY') ? 'sarvam' : process.platform === 'darwin' ? 'system' : 'placeholder';

export const synthesize = async (engine: TtsEngine, a: SynthArgs, fetchFn?: typeof fetch): Promise<SynthResult> => {
  switch (engine) {
    case 'sarvam': {
      const apiKey = env('SARVAM_API_KEY');
      if (!apiKey) throw new Error('SARVAM_API_KEY is not set (put it in .env, or use --engine system|placeholder)');
      if (!isSarvamVoice(a.voice.speaker))
        throw new Error(`"${a.voice.speaker}" is not a bulbul:v3 voice. Choose from: ${SARVAM_VOICES.map((v) => v.id).join(', ')}`);
      const r = await sarvamSynthesize(
        {
          text: a.text,
          language_code: a.lang,
          speaker: a.voice.speaker,
          model: a.voice.model,
          pace: a.voice.pace,
          speech_sample_rate: a.voice.sampleRate,
          output_audio_codec: 'wav',
          temperature: a.voice.temperature,
          dict_id: a.voice.dictId,
        },
        { apiKey, fetchFn },
      );
      writeFileSync(a.out, r.wav);
      return { requestId: r.requestId, speaker: a.voice.speaker };
    }
    case 'system': {
      // `say` reads from a file so text can never be parsed as a flag
      const txt = `${a.out}.txt`;
      writeFileSync(txt, a.text);
      const aiff = a.out.replace(/\.wav$/, '.aiff');
      await run('say', ['-v', a.voice.systemVoice, '-r', String(Math.round(175 * a.voice.pace)), '-o', aiff, '-f', txt]);
      await ffmpeg(['-i', aiff, '-ar', String(a.voice.sampleRate), '-ac', '1', a.out]);
      return { speaker: `say:${a.voice.systemVoice}` };
    }
    case 'placeholder':
      await silence(a.out, Math.max(0.6, wordCount(a.text) / 2.6), a.voice.sampleRate);
      return { speaker: 'placeholder' };
  }
};

/** Fields of the voice config that change the audio for an engine (the TTS cache key). */
export const voiceKey = (engine: TtsEngine, v: VoiceConfig) =>
  engine === 'sarvam'
    ? { model: v.model, speaker: v.speaker, pace: v.pace, temperature: v.temperature, rate: v.sampleRate, dict: v.dictId }
    : engine === 'system'
      ? { voice: v.systemVoice, pace: v.pace, rate: v.sampleRate }
      : { rate: v.sampleRate };
