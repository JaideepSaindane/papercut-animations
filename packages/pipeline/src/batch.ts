// Topic lists and batches: the owner approves a list of topics; `pc batch` then makes every one the
// cheap way (one Gemini call per story, then voice and render) without further input.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { TopicList, type Brief, type Format } from '@papercut/schema';
import { log, mapPool } from '@papercut/shared';
import { makeGemini, type GeminiClient } from './gemini';
import { quickStory } from './quick';
import { runStory } from './run';
import { loadState } from './story';
import { loadTopicList, saveTopicList, topicListFile } from './topics';

/** Parse a topic file: CSV with a `topic` column (optional `part`, `notes`), or one topic per line. */
export const parseTopics = (text: string): TopicList['topics'] => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = lines[0]?.toLowerCase().split(',').map((h) => h.trim());
  if (header?.includes('topic')) {
    const cell = (row: string[], name: string) => row[header.indexOf(name)]?.trim().replace(/^"|"$/g, '');
    return lines.slice(1).map((l) => {
      // simple CSV: quoted fields may contain commas
      const row = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/""/g, '"')) ?? [];
      const part = cell(row, 'part');
      return { topic: cell(row, 'topic')!, part: part ? Number(part) : undefined, notes: cell(row, 'notes') || undefined };
    }).filter((t) => t.topic);
  }
  return lines.filter((l) => !l.startsWith('#')).map((topic) => ({ topic }));
};

export type NewListOptions = {
  file: string;
  name?: string;
  series?: string;
  genre: Brief['genre'];
  seconds?: number;
  languages?: string[];
  formats?: Format[];
  pack?: string;
};

export const createTopicList = (o: NewListOptions) => {
  if (!existsSync(o.file)) throw new Error(`no such file: ${o.file}`);
  const created = new Date().toISOString();
  const id = `${created.slice(0, 10)}-${path.basename(o.file).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (existsSync(topicListFile(id))) throw new Error(`topic list ${id} already exists`);
  const list = TopicList.parse({
    id,
    name: o.name ?? id,
    series: o.series,
    genre: o.genre,
    pack: o.pack,
    targetSeconds: o.seconds ?? 45,
    languages: o.languages ?? ['en-IN', 'hi-IN'],
    formats: o.formats ?? ['vertical', 'horizontal'],
    topics: parseTopics(readFileSync(o.file, 'utf8')),
    status: 'draft',
    createdAt: created,
  });
  saveTopicList(list);
  log.info(`topic list ${id}: ${list.topics.length} topics (${list.genre}, ${list.targetSeconds} s, ${list.languages.join('+')}, ${list.formats.join('+')}) — draft`);
  return list;
};

/** The owner's approval. Everything downstream of an approved list runs unattended. */
export const approveTopicList = (id: string) => {
  const list = loadTopicList(id);
  list.status = 'approved';
  list.approvedAt = new Date().toISOString();
  saveTopicList(list);
  log.info(`topic list ${id} approved (${list.topics.length} topics)`);
  return list;
};

export type BatchResult = { slug: string; topic: string; status: 'rendered' | 'failed'; outputs?: string[]; note?: string };

/** `pc make` for every topic of an approved list; a topic that already has a story is resumed, not rewritten. */
export const runBatch = async (id: string, { concurrency = 2, client }: { concurrency?: number; client?: GeminiClient } = {}) => {
  const list = loadTopicList(id);
  if (list.status !== 'approved') throw new Error(`topic list ${id} is not approved (pc topics approve ${id})`);
  const gemini = client ?? makeGemini();
  const results = await mapPool(list.topics, concurrency, async (t): Promise<BatchResult> => {
    let slug = t.slug;
    try {
      if (!slug || loadState(slug).status === 'draft') {
        slug = await quickStory({ topic: t.topic, pack: list.pack, genre: list.genre, seconds: list.targetSeconds, formats: list.formats, series: list.series, notes: t.notes, client: gemini });
        t.slug = slug;
        saveTopicList(list);
      }
      const r = await runStory(slug, { from: 'validate' });
      return { slug, topic: t.topic, status: 'rendered', outputs: r.outputs };
    } catch (e) {
      return { slug: slug ?? '-', topic: t.topic, status: 'failed', note: (e as Error).message };
    }
  });
  for (const r of results) log.info(`  ${r.status.padEnd(9)} ${r.slug}${r.note ? ` — ${r.note.slice(0, 160)}` : ''}`);
  return results;
};
