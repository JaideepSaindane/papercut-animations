// Visual snapshot test (spec 15): renders fixed frames of Prototype10s (both formats) and the kit gallery
// sheets, and compares them to baselines in packages/video/snapshots with pixelmatch.
//   node scripts/snapshots.mjs           compare (exit 1 on regressions)
//   node scripts/snapshots.mjs --update  write new baselines
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderStill, selectComposition } from '@remotion/renderer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const update = process.argv.includes('--update');
const baseDir = path.join(root, 'snapshots');
const outDir = path.join(root, 'out', 'snapshots');
const MAX_DIFF = 0.005; // ≤ 0.5% differing pixels
mkdirSync(baseDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, '../../assets') });

const jobs = [];
for (const [id, tag] of [
  ['Prototype10s', 'v'],
  ['Prototype10sLandscape', 'h'],
]) {
  const composition = await selectComposition({ serveUrl, id });
  for (const frame of [45, 96, 147, 210, 270]) jobs.push({ composition, frame, name: `proto-${tag}-${frame}` });
}
for (const composition of (await getCompositions(serveUrl)).filter((c) => c.id.startsWith('KitGallery-'))) {
  jobs.push({ composition, frame: 0, name: composition.id });
}

let failed = 0;
for (const { composition, frame, name } of jobs) {
  const out = path.join(outDir, `${name}.png`);
  await renderStill({ serveUrl, composition, frame, output: out, timeoutInMilliseconds: 120000 });
  const base = path.join(baseDir, `${name}.png`);
  if (update || !existsSync(base)) {
    writeFileSync(base, readFileSync(out));
    console.log(`baseline  ${name}`);
    continue;
  }
  const a = PNG.sync.read(readFileSync(base));
  const b = PNG.sync.read(readFileSync(out));
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`FAIL      ${name}: size ${a.width}x${a.height} -> ${b.width}x${b.height}`);
    failed++;
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const ratio = n / (a.width * a.height);
  const ok = ratio <= MAX_DIFF;
  if (!ok) {
    writeFileSync(path.join(outDir, `${name}.diff.png`), PNG.sync.write(diff));
    failed++;
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'}      ${name}: ${(ratio * 100).toFixed(3)}% differ`);
}
if (failed) {
  console.log(`\n${failed} snapshot(s) differ; diffs in ${path.relative(process.cwd(), outDir)}. Re-run with --update if intended.`);
  process.exit(1);
}
