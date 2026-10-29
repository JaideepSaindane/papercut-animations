// Sarvam AI text-to-speech REST client (spec 8.1). Checked against docs.sarvam.ai and a live call
// (2026-10-29): `language_code` is the documented field; bulbul:v3 is the only current model.
import { HttpError, withRetry } from '@papercut/shared';

export const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';
export const SARVAM_MAX_CHARS = 2500; // bulbul:v3 / v4-flash

export type SarvamRequest = {
  text: string;
  language_code: string;
  speaker: string;
  model: string;
  pace: number;
  speech_sample_rate: number;
  output_audio_codec: 'wav';
  temperature?: number;
  dict_id?: string;
};

export type SarvamResult = { wav: Buffer; requestId?: string };

/** Pull Sarvam's `{ error: { message, code, request_id } }` into a readable line. */
const describeError = (status: number, body: string) => {
  try {
    const e = JSON.parse(body)?.error;
    if (e?.message) return `Sarvam TTS ${status} ${e.code ?? ''}: ${e.message}${e.request_id ? ` (request_id ${e.request_id})` : ''}`;
  } catch {
    // not JSON
  }
  return `Sarvam TTS ${status}: ${body.slice(0, 400)}`;
};

/** One synthesis request (one script line). Retries 429/5xx with exponential backoff. */
export const sarvamSynthesize = async (
  req: SarvamRequest,
  { apiKey, fetchFn = fetch, attempts = 4 }: { apiKey: string; fetchFn?: typeof fetch; attempts?: number },
): Promise<SarvamResult> => {
  if (req.text.length > SARVAM_MAX_CHARS) throw new Error(`TTS text is ${req.text.length} chars (max ${SARVAM_MAX_CHARS})`);
  const body = JSON.stringify(req); // undefined fields (dict_id, temperature) are dropped
  return withRetry(
    async () => {
      const res = await fetchFn(SARVAM_TTS_URL, {
        method: 'POST',
        headers: { 'api-subscription-key': apiKey, 'content-type': 'application/json' },
        body,
      });
      // the key is only ever in the request header, never in errors or logs
      if (!res.ok) throw new HttpError(res.status, describeError(res.status, await res.text().catch(() => '')));
      const json = (await res.json()) as { request_id?: string | null; audios?: string[] };
      if (!json.audios?.length) throw new Error(`Sarvam TTS returned no audio (request_id ${json.request_id})`);
      // long inputs can come back as several WAV chunks; we send one line per call so this is normally one
      const wavs = json.audios.map((a) => Buffer.from(a, 'base64'));
      return { wav: wavs.length === 1 ? wavs[0] : concatWav(wavs), requestId: json.request_id ?? undefined };
    },
    { attempts },
  );
};

/** Join PCM WAV buffers that share a format: keep the first header, append the data chunks, fix sizes. */
export const concatWav = (wavs: Buffer[]): Buffer => {
  const dataOf = (b: Buffer) => {
    const i = b.indexOf('data');
    if (i < 0) throw new Error('WAV chunk without a data section');
    return { header: b.subarray(0, i + 8), data: b.subarray(i + 8, i + 8 + b.readUInt32LE(i + 4)) };
  };
  const parts = wavs.map(dataOf);
  const data = Buffer.concat(parts.map((p) => p.data));
  const header = Buffer.from(parts[0].header);
  header.writeUInt32LE(data.length, header.length - 4);
  header.writeUInt32LE(header.length - 8 + data.length, 4);
  return Buffer.concat([header, data]);
};
