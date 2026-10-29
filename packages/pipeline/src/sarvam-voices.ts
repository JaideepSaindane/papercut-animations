// Sarvam Bulbul v3 voice catalogue. Pitch and relative speed were measured by the ReelAutomator project
// (2026-09-25) from samples of every voice: 23 male voices at 96–182 Hz, 14 female at 205–291 Hz.
// Speed is speaking rate at pace 1.0 relative to the average voice; the fastest is ~1.7× the slowest,
// so word budgets must be per voice.

export const SARVAM_MODEL = 'bulbul:v3'; // bulbul:v2 is deprecated (rejected by the API since 2026-09-25)

/** Rupees per character for Bulbul v3 TTS (₹30 per 10K characters; docs.sarvam.ai pricing, 2026-10-05). */
export const SARVAM_INR_PER_CHAR = 30 / 10_000;

const PITCH: Record<string, number> = {
  varun: 96, soham: 110, shubh: 112, vijay: 121, amit: 123, mohit: 124, mani: 129, sumit: 133, aditya: 137,
  sunny: 139, aayan: 140, gokul: 140, rehan: 147, anand: 148, rahul: 150, ratan: 151, manan: 152, advait: 156,
  tarun: 170, kabir: 176, neha: 178, ashutosh: 180, rohan: 182, shreya: 205, roopa: 211, shruti: 213,
  simran: 213, dev: 216, priya: 218, pooja: 222, rupali: 230, kavya: 232, tanya: 234, ritu: 235, ishita: 252,
  kavitha: 276, suhani: 291,
};

const SPEED: Record<string, number> = {
  neha: 0.74, mani: 0.78, soham: 0.82, kavitha: 0.83, pooja: 0.87, priya: 0.87, kavya: 0.88, amit: 0.91,
  mohit: 0.93, tanya: 0.93, aditya: 0.94, advait: 0.94, suhani: 0.94, varun: 0.95, dev: 0.96, rehan: 0.96,
  shreya: 0.96, rupali: 0.98, gokul: 1.01, shruti: 1.01, ashutosh: 1.02, rohan: 1.02, vijay: 1.02, kabir: 1.06,
  manan: 1.06, rahul: 1.08, ritu: 1.09, anand: 1.1, ishita: 1.11, sunny: 1.11, simran: 1.12, tarun: 1.13,
  roopa: 1.14, sumit: 1.14, ratan: 1.18, shubh: 1.19, aayan: 1.23,
};

export type SarvamVoice = { id: string; gender: 'male' | 'female'; pitchHz: number; speed: number };

export const SARVAM_VOICES: SarvamVoice[] = Object.entries(PITCH).map(([id, pitchHz]) => ({
  id,
  gender: pitchHz < 195 ? 'male' : 'female',
  pitchHz,
  speed: SPEED[id] ?? 1,
}));

export const isSarvamVoice = (id: string) => id in PITCH;

/**
 * Narrator presets. Temperature stays low (0.35–0.45) because every script line is a separate TTS call:
 * lower temperature keeps the delivery consistent from line to line.
 */
export const SARVAM_PERSONAS = {
  /** low, calm, authoritative: true crime, history, mystery */
  'deep-male': { speaker: 'varun', pace: 0.95, temperature: 0.35 },
  /** warm and expressive: folk tales, horror classics */
  'male-storyteller': { speaker: 'shubh', pace: 0.95, temperature: 0.45 },
  'calm-female': { speaker: 'priya', pace: 1.0, temperature: 0.35 },
  'female-storyteller': { speaker: 'simran', pace: 0.95, temperature: 0.45 },
} as const;

/** Speakers worth auditioning for this channel's measured, ominous narration (deepest first). */
export const SARVAM_AUDITION = ['varun', 'shubh', 'aditya', 'rahul', 'kabir', 'priya', 'simran'];

/**
 * Base English narration rate (words/s) for an average voice at pace 1.0, before any measurements exist.
 * Measured 2026-10-29: ~2.5 on multi-sentence lines (pauses at full stops), ~3.1 on single-sentence
 * silence-trimmed script lines. Measured per-speaker rates replace this as soon as there is data.
 */
export const BASE_WORDS_PER_SECOND = 2.8;

/** Enough measured speech to trust a speaker's own rate over the estimate. */
export const MIN_MEASURED_WORDS = 40;

export type MeasuredRates = Record<string, { words: number; seconds: number }>;

/**
 * Expected words per second for a voice at a pace (script word budgets). Uses the speaker's measured
 * rate (normalised to pace 1) when there is enough of it, else the catalogue speed × base estimate.
 */
export const wordsPerSecond = (speaker: string, pace = 1, measured: MeasuredRates = {}) => {
  const m = measured[speaker];
  if (m && m.words >= MIN_MEASURED_WORDS && m.seconds > 0) return (m.words / m.seconds) * pace;
  return BASE_WORDS_PER_SECOND * (SPEED[speaker] ?? 1) * pace;
};
