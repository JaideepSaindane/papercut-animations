// Renders review stills, bundling once:
//   node scripts/stills.mjs proto    -> out/stills/{vertical,horizontal}/t*.png (t = 1.5, 3.2, 4.9, 7.0, 9.0 s)
//   node scripts/stills.mjs gallery [section]  -> out/gallery/<section>.png (every KitGallery sheet, or one)
//                                   + out/gallery/sets-<pack>-{vertical,horizontal}.jpg (one ShotPreview per set variant, tiled)
//   node scripts/stills.mjs all      -> both (default)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderStill, selectComposition } from '@remotion/renderer';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mode = process.argv[2] ?? 'all';
const outDir = path.join(root, 'out');
const TIMES = [1.5, 3.2, 4.9, 7.0, 9.0];

const serveUrl = await bundle({
  entryPoint: path.join(root, 'src/index.ts'),
  publicDir: path.join(root, '../../assets'),
});

if (mode === 'proto' || mode === 'all') {
  for (const [id, fmt] of [
    ['Prototype10s', 'vertical'],
    ['Prototype10sLandscape', 'horizontal'],
  ]) {
    const composition = await selectComposition({ serveUrl, id });
    for (const t of TIMES) {
      const output = path.join(outDir, 'stills', fmt, `t${t.toFixed(1)}.png`);
      await renderStill({ serveUrl, composition, frame: Math.round(t * composition.fps), output });
      console.log(`${id} t=${t}s -> ${path.relative(root, output)}`);
    }
  }
}

if (mode === 'gallery' || mode === 'all') {
  const only = process.argv[3];
  const comps = (await getCompositions(serveUrl)).filter(
    (c) => c.id.startsWith('KitGallery-') && (!only || c.id === `KitGallery-${only}`),
  );
  for (const composition of comps) {
    const output = path.join(outDir, 'gallery', `${composition.id.replace('KitGallery-', '')}.png`);
    console.log(`rendering ${composition.id}...`);
    const t0 = Date.now();
    await renderStill({ serveUrl, composition, frame: 0, output, timeoutInMilliseconds: 240000 });
    console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    console.log(`${composition.id} ${composition.width}x${composition.height} -> ${path.relative(root, output)}`);
  }
}

// Set sheets, one per pack: `node scripts/stills.mjs gallery sets [pack]`. Pack sets with variants (e.g.
// day/dusk/night) get one row per set and one column per variant, in the pack's render style.
if ((mode === 'gallery' || mode === 'all') && (!process.argv[3] || process.argv[3] === 'sets')) {
  const onlyPack = process.argv[4];
  const manifest = JSON.parse(readFileSync(path.join(root, '../kit/kit-manifest.json'), 'utf8'));
  const packs = [...new Set(manifest.sets.map((s) => s.pack))].filter((p) => !onlyPack || p === onlyPack);
  for (const pack of packs) {
    const sets = manifest.sets.filter((s) => s.pack === pack);
    for (const format of ['vertical', 'horizontal']) {
      const dir = path.join(outDir, 'gallery', 'sets', pack, format);
      mkdirSync(dir, { recursive: true });
      const files = [];
      for (const set of sets) {
        for (const [k, variant] of (set.variants ?? [{}]).entries()) {
          const label = Object.values(variant).join('-');
          const spec = {
            slug: 'kit-sets',
            language: 'en-IN',
            style: set.style,
            characters: [],
            shots: [{ id: 'S', lineIds: ['L'], set: set.id, setVariant: variant, camera: { move: 'static' }, caption: label ? `${set.id} · ${label}` : set.id, durationInFrames: 30 }],
          };
          const inputProps = { spec, shotId: 'S', format };
          const composition = await selectComposition({ serveUrl, id: 'ShotPreview', inputProps });
          const output = path.join(dir, `${set.id}${label ? `-${label}` : ''}.png`);
          await renderStill({ serveUrl, composition, frame: 15, inputProps, output });
          files.push(output);
          if (k === 0) console.log(`  ${set.id} (${format})`);
        }
      }
      // variants side by side; plain packs 5 (vertical) / 3 (horizontal) across
      const nv = Math.max(...sets.map((s) => (s.variants ?? [{}]).length));
      const cols = nv > 1 ? nv : format === 'vertical' ? 5 : 3;
      const [w, h] = format === 'vertical' ? [360, 640] : [640, 360];
      const inputs = files.flatMap((f) => ['-i', f]);
      const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
      const scaled = files.map((_, i) => `[${i}]scale=${w}:${h}[s${i}]`).join(';');
      const tiles = files.map((_, i) => `[s${i}]`).join('');
      const output = path.join(outDir, 'gallery', `sets-${pack}-${format}.jpg`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', `${scaled};${tiles}xstack=inputs=${files.length}:layout=${layout}:fill=black`, '-q:v', '3', output]);
      console.log(`sets ${pack} ${format} -> ${path.relative(root, output)}`);
    }
  }
}

// Review a fixture: `node scripts/stills.mjs review fixtures/x.spec.json` -> one still per shot (mid-shot)
// in both formats, tiled to out/review/<slug>-{vertical,horizontal}.jpg.
if (mode === 'review') {
  const spec = JSON.parse(readFileSync(path.resolve(process.argv[3]), 'utf8'));
  for (const format of ['vertical', 'horizontal']) {
    const dir = path.join(outDir, 'review', spec.slug, format);
    mkdirSync(dir, { recursive: true });
    const files = [];
    for (const shot of spec.shots) {
      const inputProps = { spec, shotId: shot.id, format };
      const composition = await selectComposition({ serveUrl, id: 'ShotPreview', inputProps });
      const output = path.join(dir, `${shot.id}.png`);
      await renderStill({ serveUrl, composition, frame: Math.floor(composition.durationInFrames * 0.6), inputProps, output });
      files.push(output);
    }
    const cols = Math.min(files.length, format === 'vertical' ? 4 : 2);
    const [w, h] = format === 'vertical' ? [540, 960] : [960, 540];
    const inputs = files.flatMap((f) => ['-i', f]);
    const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
    const scaled = files.map((_, i) => `[${i}]scale=${w}:${h}[s${i}]`).join(';');
    const tiles = files.map((_, i) => `[s${i}]`).join('');
    const output = path.join(outDir, 'review', `${spec.slug}-${format}.jpg`);
    const filter = files.length > 1 ? `${scaled};${tiles}xstack=inputs=${files.length}:layout=${layout}:fill=black` : `[0]scale=${w}:${h}`;
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', filter, '-q:v', '3', output]);
    console.log(`review ${format} -> ${path.relative(root, output)}`);
  }
}
