// Thin wrappers over the system ffmpeg / ffprobe binaries.
import { spawn } from 'node:child_process';

export const run = (cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-800)}`)),
    );
  });

export const ffmpeg = (args: string[]) => run('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args]);

export const probeDuration = async (file: string): Promise<number> => {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim());
};

export type Loudness = { integrated: number; truePeak: number; lra: number; threshold: number; offset: number };

/** First loudnorm pass: measure integrated loudness / true peak. */
export const measureLoudness = async (file: string, target = -16): Promise<Loudness> => {
  const { stderr } = await ffmpeg(['-i', file, '-af', `loudnorm=I=${target}:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-']);
  const json = JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
  return {
    integrated: Number(json.input_i),
    truePeak: Number(json.input_tp),
    lra: Number(json.input_lra),
    threshold: Number(json.input_thresh),
    offset: Number(json.target_offset),
  };
};

/** Trim leading/trailing silence below `thresholdDb`, keeping a short natural tail. */
export const trimSilence = (input: string, output: string, thresholdDb = -45) =>
  ffmpeg([
    '-i',
    input,
    '-af',
    [
      `silenceremove=start_periods=1:start_threshold=${thresholdDb}dB:start_silence=0.04`,
      'areverse',
      `silenceremove=start_periods=1:start_threshold=${thresholdDb}dB:start_silence=0.12`,
      'areverse',
    ].join(','),
    output,
  ]);

/** Two-pass EBU R128 loudness normalisation to `target` LUFS (spec 8.2: −16 per line). */
export const loudnorm = async (input: string, output: string, target = -16, sampleRate = 48000) => {
  const m = await measureLoudness(input, target);
  if (!Number.isFinite(m.integrated)) {
    // silent input (placeholder TTS): just resample
    await ffmpeg(['-i', input, '-ar', String(sampleRate), '-ac', '1', output]);
    return m;
  }
  await ffmpeg([
    '-i',
    input,
    '-af',
    `loudnorm=I=${target}:TP=-1.5:LRA=11:measured_I=${m.integrated}:measured_TP=${m.truePeak}:measured_LRA=${m.lra}:measured_thresh=${m.threshold}:offset=${m.offset}:linear=true`,
    '-ar',
    String(sampleRate),
    '-ac',
    '1',
    output,
  ]);
  return m;
};

/** Silent mono WAV of `seconds`. */
export const silence = (output: string, seconds: number, sampleRate = 48000) =>
  ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${sampleRate}:cl=mono`, '-t', seconds.toFixed(3), output]);
