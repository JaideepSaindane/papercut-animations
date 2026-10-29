import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root (the folder holding pnpm-workspace.yaml). */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

let loaded = false;

/** Load `.env` from the repo root into process.env (existing variables win). Minimal KEY=VALUE parser. */
export const loadEnv = () => {
  if (loaded) return;
  loaded = true;
  const file = path.join(REPO_ROOT, '.env');
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.replace(/\s+#.*$/, '').trim();
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m || m[2] === '') continue;
    const v = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
};

export const env = (key: string): string | undefined => {
  loadEnv();
  const v = process.env[key];
  return v === '' ? undefined : v;
};
