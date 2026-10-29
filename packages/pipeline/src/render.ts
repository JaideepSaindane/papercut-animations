// Render stage (spec 7.8): bundle once per process, then selectComposition + renderMedia per story/format.
// Story files (VO) are served over a local HTTP server so the headless browser can fetch them.
import { createReadStream, existsSync, renameSync, rmSync, statSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { shotStartFrames, type Format } from '@papercut/schema';
import { REPO_ROOT, assetsDir, ensureDir, env, ffmpeg, hashFile, hashOf, log, measureLoudness } from '@papercut/shared';
import { FILES, loadTimedSpec, markStage, storyFile } from './story';

const ENTRY = path.join(REPO_ROOT, 'packages/video/src/index.ts');
const MIME: Record<string, string> = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.srt': 'text/plain' };

let bundlePromise: Promise<string> | null = null;
/** One webpack bundle per process (spec: "bundle once per batch"). */
export const getServeUrl = () =>
  (bundlePromise ??= bundle({ entryPoint: ENTRY, publicDir: assetsDir() }).catch((e) => {
    bundlePromise = null;
    throw e;
  }));

/** Minimal static server (GET + Range + CORS) for one folder, bound to 127.0.0.1. */
export const serveFolder = (root: string): Promise<{ url: string; close: () => Promise<void> }> =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const rel = decodeURIComponent((req.url ?? '/').split('?')[0]);
      const file = path.join(root, rel);
      if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
        res.writeHead(404).end();
        return;
      }
      const size = statSync(file).size;
      const type = MIME[path.extname(file)] ?? 'application/octet-stream';
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
      if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Number(range[2]) : size - 1;
        res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
        createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
        createReadStream(file).pipe(res);
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(() => r())) });
    });
  });

export type RenderOptions = {
  lang?: string;
  format?: Format;
  concurrency?: number;
  onProgress?: (p: number) => void;
};

/** Final-mix loudness target (spec 8.2: about −14 LUFS; QA accepts −15..−13, TP ≤ −1). */
export const MIX_TARGET = -14;

export const renderStage = async (slug: string, opts: RenderOptions = {}) => {
  const lang = opts.lang ?? 'en-IN';
  const format = opts.format ?? 'vertical';
  const spec = loadTimedSpec(slug, lang);
  const out = storyFile(slug, FILES.render(lang, format));
  ensureDir(path.dirname(out));
  const server = await serveFolder(storyFile(slug));
  const t0 = Date.now();
  try {
    const serveUrl = await getServeUrl();
    const inputProps = { spec, format, assetBase: server.url };
    const composition = await selectComposition({ serveUrl, id: 'Story', inputProps });
    const raw = path.join(os.tmpdir(), `pc-${slug}-${lang}-${format}-${process.pid}.mp4`);
    const concurrency = opts.concurrency ?? (env('PC_RENDER_CONCURRENCY') ? Number(env('PC_RENDER_CONCURRENCY')) : null);
    let last = -1;
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      codec: 'h264',
      crf: 18,
      pixelFormat: 'yuv420p',
      outputLocation: raw,
      concurrency,
      timeoutInMilliseconds: 120000,
      onProgress: ({ progress }) => {
        opts.onProgress?.(progress);
        const pct = Math.floor(progress * 10);
        if (pct !== last) {
          last = pct;
          process.stdout.write(`\r  render ${slug} [${lang} ${format}] ${Math.round(progress * 100)}%   `);
        }
      },
    });
    process.stdout.write('\n');
    // final mix: two-pass loudnorm on the audio only, video stream copied
    const m = await measureLoudness(raw, MIX_TARGET);
    await ffmpeg([
      '-i', raw,
      '-c:v', 'copy',
      '-af', `loudnorm=I=${MIX_TARGET}:TP=-1.5:LRA=11:measured_I=${m.integrated}:measured_TP=${m.truePeak}:measured_LRA=${m.lra}:measured_thresh=${m.threshold}:offset=${m.offset}:linear=true`,
      '-ar', '48000',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      `${out}.part.mp4`,
    ]);
    renameSync(`${out}.part.mp4`, out);
    rmSync(raw, { force: true });
    const secs = (Date.now() - t0) / 1000;
    markStage(slug, `render:${lang}:${format}`, hashOf({ spec, format, file: hashFile(out) }), 'rendered');
    log.info(`render ${slug} [${lang} ${format}]: ${path.relative(REPO_ROOT, out)} in ${secs.toFixed(0)} s (${(spec.totalFrames! / secs).toFixed(1)} fps)`);
    return out;
  } finally {
    await server.close();
  }
};

/** A single still (QA frames, covers): `at` is a fraction of the video. */
export const renderStoryStill = async (slug: string, { lang = 'en-IN', format = 'vertical' as Format, at = 0.4, output }: { lang?: string; format?: Format; at?: number; output: string }) => {
  const spec = loadTimedSpec(slug, lang);
  const serveUrl = await getServeUrl();
  const inputProps = { spec, format };
  const composition = await selectComposition({ serveUrl, id: 'Story', inputProps });
  await renderStill({ serveUrl, composition, inputProps, frame: Math.min(composition.durationInFrames - 1, Math.round(at * composition.durationInFrames)), output });
  return output;
};

/**
 * One still per shot at its midpoint, plus a tiled contact sheet: the quick "look before rendering"
 * check (render/stills/<lang>.<format>/S01.png … and sheet.png).
 */
export const renderShotStills = async (slug: string, { lang = 'en-IN', format = 'vertical' as Format }: { lang?: string; format?: Format } = {}) => {
  const spec = loadTimedSpec(slug, lang);
  const serveUrl = await getServeUrl();
  const inputProps = { spec, format };
  const composition = await selectComposition({ serveUrl, id: 'Story', inputProps });
  const dir = ensureDir(storyFile(slug, 'render', 'stills', `${lang}.${format}`));
  const starts = shotStartFrames(spec);
  const files: string[] = [];
  for (const [i, shot] of spec.shots.entries()) {
    const output = path.join(dir, `${shot.id}.png`);
    await renderStill({ serveUrl, composition, inputProps, frame: starts[i] + Math.floor((shot.durationInFrames ?? 60) * 0.6), output });
    files.push(output);
  }
  const cols = format === 'vertical' ? Math.min(files.length, 6) : Math.min(files.length, 3);
  const [w, h] = format === 'vertical' ? [270, 480] : [480, 270];
  const sheet = path.join(dir, 'sheet.png');
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
  await ffmpeg([
    ...files.flatMap((f) => ['-i', f]),
    '-filter_complex',
    `${files.map((_, i) => `[${i}]scale=${w}:${h}[s${i}]`).join(';')};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black`,
    sheet,
  ]);
  log.info(`stills ${slug} [${lang} ${format}]: ${files.length} shots -> ${path.relative(REPO_ROOT, sheet)}`);
  return sheet;
};
