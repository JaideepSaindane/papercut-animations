// pnpm kit:manifest — writes packages/kit/kit-manifest.json (spec 7.7).
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from '../src/manifest';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'kit-manifest.json');
const m = buildManifest();
writeFileSync(out, JSON.stringify(m, null, 2) + '\n');
console.log(
  `kit-manifest.json: ${m.sets.length} sets, ${m.props.length} props, ${m.actions.length} actions, ` +
    `${m.characters.poses.length} poses, ${m.characters.hair.length} hair, ${m.characters.outfits.top.length} tops`,
);
