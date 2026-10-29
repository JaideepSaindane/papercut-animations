import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, env } from './env';

export const dataDir = () => path.resolve(REPO_ROOT, env('PC_DATA_DIR') ?? 'data');
export const assetsDir = () => path.join(REPO_ROOT, 'assets');
export const storyDir = (slug: string) => path.join(dataDir(), 'stories', slug);
export const cacheDir = (kind: string) => path.join(dataDir(), 'cache', kind);

export const ensureDir = (dir: string) => {
  mkdirSync(dir, { recursive: true });
  return dir;
};

export const readJson = <T = any>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
export const readJsonIf = <T = any>(file: string): T | undefined => (existsSync(file) ? readJson<T>(file) : undefined);

/** Pretty JSON, written atomically (tmp + rename) so a crash never leaves half a file. */
export const writeJson = (file: string, data: unknown) => {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  renameSync(tmp, file);
};

export const writeText = (file: string, text: string) => {
  ensureDir(path.dirname(file));
  writeFileSync(file, text);
};

export const rmSafe = (file: string) => rmSync(file, { force: true });
