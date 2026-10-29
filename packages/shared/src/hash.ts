import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** JSON with sorted keys, so equal objects hash equally. */
export const stableStringify = (v: unknown): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
};

export const hashOf = (v: unknown, len = 16) =>
  createHash('sha256').update(typeof v === 'string' ? v : stableStringify(v)).digest('hex').slice(0, len);

export const hashFile = (file: string, len = 16) =>
  createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, len);
