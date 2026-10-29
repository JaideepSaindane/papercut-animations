import { describe, expect, it, vi } from 'vitest';
import { Script, StorySpec, type VoLine } from '@papercut/schema';
import { musicVolumeAt } from '@papercut/kit';
import plan from '../../../fixtures/monkeys-paw-30s/03-plan.json';
import script from '../../../fixtures/monkeys-paw-30s/02-script.json';
import { expandNumbers, normaliseForSpeech, numberToWords, ordinalWords, yearToWords } from './normalise';
import { SARVAM_TTS_URL, sarvamSynthesize } from './sarvam';
import { TIMING, computeTiming, pickMusic } from './timing';
import { buildSrt } from './srt';

describe('normalise', () => {
  it('speaks numbers', () => {
    expect(numberToWords(18)).toBe('eighteen');
    expect(numberToWords(13)).toBe('thirteen');
    expect(numberToWords(10000)).toBe('ten thousand');
    expect(numberToWords(1_250_042)).toBe('one million two hundred and fifty thousand and forty-two');
    expect(numberToWords(3.5)).toBe('three point five');
  });
  it('speaks years in pairs', () => {
    expect(yearToWords(1978)).toBe('nineteen seventy-eight');
    expect(yearToWords(1905)).toBe('nineteen oh five');
    expect(yearToWords(1900)).toBe('nineteen hundred');
    expect(yearToWords(2005)).toBe('two thousand and five');
    expect(yearToWords(2019)).toBe('twenty nineteen');
  });
  it('handles ordinals, currency, percent, decades and grouped numbers', () => {
    expect(ordinalWords(21)).toBe('twenty-first');
    expect(ordinalWords(12)).toBe('twelfth');
    expect(expandNumbers('June 1978. Ohio.')).toBe('June nineteen seventy-eight. Ohio.');
    expect(expandNumbers('Jeffrey Dahmer, 18, home alone.')).toBe('Jeffrey Dahmer, eighteen, home alone.');
    expect(expandNumbers('He wished for £200.')).toBe('He wished for two hundred pounds.');
    expect(expandNumbers('₹10,000 and $1')).toBe('ten thousand rupees and one dollar');
    expect(expandNumbers('on the 3rd day, 40% of the 1970s')).toBe('on the third day, forty percent of the nineteen seventies');
    expect(expandNumbers('No one would know for 13 years.')).toBe('No one would know for thirteen years.');
  });
  it('strips caption-only punctuation and respells', () => {
    expect(normaliseForSpeech('“Dahmer” — 18 (alone)', { Dahmer: 'Dah-mer' })).toBe('Dah-mer, eighteen alone');
  });
});

describe('sarvam client', () => {
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  const req = { text: 'June 1978', language_code: 'en-IN', speaker: 'rahul', model: 'bulbul:v3', pace: 0.95, speech_sample_rate: 48000, output_audio_codec: 'wav' as const };

  it('posts the documented request and decodes base64 audio', async () => {
    const fetchFn = vi.fn(async () => ok({ request_id: 'r1', audios: [Buffer.from('RIFFdata').toString('base64')] }));
    const r = await sarvamSynthesize(req, { apiKey: 'k', fetchFn: fetchFn as any });
    expect(r.wav.toString()).toBe('RIFFdata');
    expect(r.requestId).toBe('r1');
    const [url, init] = fetchFn.mock.calls[0] as any;
    expect(url).toBe(SARVAM_TTS_URL);
    expect(init.headers['api-subscription-key']).toBe('k');
    expect(JSON.parse(init.body)).toMatchObject({ text: 'June 1978', language_code: 'en-IN', model: 'bulbul:v3', speech_sample_rate: 48000 });
  });
  it('retries 429 and 5xx, then succeeds', async () => {
    let n = 0;
    const fetchFn = vi.fn(async () => (++n < 3 ? new Response('busy', { status: n === 1 ? 429 : 503 }) : ok({ audios: ['AA=='] })));
    await sarvamSynthesize(req, { apiKey: 'k', fetchFn: fetchFn as any, attempts: 4 });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  }, 15000);
  it('does not retry 4xx client errors and never leaks the key', async () => {
    const fetchFn = vi.fn(async () => new Response('{"error":{"message":"bad speaker"}}', { status: 400 }));
    await expect(sarvamSynthesize(req, { apiKey: 'secret-key', fetchFn: fetchFn as any })).rejects.toThrow(/400/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await expect(sarvamSynthesize(req, { apiKey: 'secret-key', fetchFn: fetchFn as any })).rejects.not.toThrow(/secret-key/);
  });
  it('rejects text over 2500 chars before calling', async () => {
    const fetchFn = vi.fn();
    await expect(sarvamSynthesize({ ...req, text: 'x'.repeat(2501) }, { apiKey: 'k', fetchFn: fetchFn as any })).rejects.toThrow(/2500/);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('timing', () => {
  const p = StorySpec.parse(plan);
  const s = Script.parse(script);
  const vo: VoLine[] = s.lines.map((l, i) => ({
    lineId: l.id,
    file: `audio/en-IN/line-00${i + 1}.wav`,
    durationSec: 2,
    hash: 'h',
    text: l.vo,
    engine: 'placeholder',
    speaker: 'x',
    manual: false,
  }));
  const { spec, warnings } = computeTiming(p, vo, s);

  it('first shot = pre-roll + breath + line + gap', () => {
    expect(spec.shots[0].durationInFrames).toBe(9 + TIMING.breathFrames + 60 + 5);
    expect(spec.vo![0].startFrame).toBe(9 + TIMING.breathFrames);
  });
  it('longer gap after the turn, tail on the last shot', () => {
    const turn = spec.shots.find((x) => x.lineIds.includes('L07'))!;
    expect(turn.durationInFrames).toBe(TIMING.breathFrames + 60 + 15);
    expect(spec.shots.at(-1)!.durationInFrames).toBe(TIMING.breathFrames + 60 + 15 + 24);
  });
  it('extends the shot before a cross transition so VO lines never overlap', () => {
    for (let i = 1; i < spec.vo!.length; i++) {
      const prev = spec.vo![i - 1];
      expect(spec.vo![i].startFrame).toBeGreaterThan(prev.startFrame + prev.durationInFrames);
    }
  });
  it('total = sum of shots minus overlaps and the VO fits inside', () => {
    const last = spec.vo!.at(-1)!;
    expect(spec.totalFrames).toBeGreaterThan(last.startFrame + last.durationInFrames);
  });
  it('warns about lines over 4.5 s on their own shot', () => {
    expect(warnings).toEqual([]);
    const long = computeTiming(p, vo.map((v) => (v.lineId === 'L02' ? { ...v, durationSec: 5 } : v)), s);
    expect(long.warnings.join()).toMatch(/L02 is 5.0 s/);
  });
  it('enforces the 1.4 s minimum shot length', () => {
    const short = computeTiming(p, vo.map((v) => ({ ...v, durationSec: 0.3 })), s);
    expect(Math.min(...short.spec.shots.map((x) => x.durationInFrames!))).toBeGreaterThanOrEqual(42);
  });
  it('builds an SRT cue per line from the captions', () => {
    const srt = buildSrt(spec, s);
    expect(srt.split('\n\n')).toHaveLength(9);
    expect(srt).toMatch(/^1\n00:00:00,433 --> 00:00:02,433\nSome wishes should never be made\.\n/);
    expect(buildSrt(spec, s, { use: 'vo' })).toContain('home from India.');
  });
  it('picks music deterministically by mood', () => {
    const lib = [
      { id: 'a', file: 'a.wav', mood: ['happy'], loopable: true, license: 'x' },
      { id: 'b', file: 'b.wav', mood: ['dark'], loopable: true, license: 'x' },
    ];
    expect(pickMusic(lib, ['dark'], 'any')?.id).toBe('b');
    expect(pickMusic(lib, ['dark'], 'slug')).toEqual(pickMusic(lib, ['dark'], 'slug'));
  });
});

describe('music ducking', () => {
  const o = { vo: [{ startFrame: 100, durationInFrames: 60 }], total: 400, fps: 30, volume: 0.18, duckTo: 0.07 };
  it('fades in over 0.5 s and out over the last 1 s', () => {
    expect(musicVolumeAt(0, o)).toBe(0);
    expect(musicVolumeAt(15, o)).toBeCloseTo(0.18);
    expect(musicVolumeAt(400, o)).toBe(0);
    expect(musicVolumeAt(385, o)).toBeCloseTo(0.09);
  });
  it('ducks under VO with 6-frame ramps', () => {
    expect(musicVolumeAt(50, o)).toBeCloseTo(0.18);
    expect(musicVolumeAt(97, o)).toBeCloseTo(0.18 - 0.11 * 0.5);
    expect(musicVolumeAt(130, o)).toBeCloseTo(0.07);
    expect(musicVolumeAt(166, o)).toBeCloseTo(0.18);
  });
});
