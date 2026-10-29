// The cheap path with a fake Gemini: one call writes script + plan; kit errors go back once for a fix.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import proof from '../../video/fixtures/folklore-proof.spec.json';
import type { GeminiClient } from './gemini';
import { quality, quickCatalogue, quickStory } from './quick';
import { loadPlan, loadScript, loadState } from './story';

let tmp: string;
beforeAll(() => {
  tmp = mkdtempSync(path.join(tmpdir(), 'pc-quick-'));
  process.env.PC_DATA_DIR = tmp;
});
afterAll(() => {
  delete process.env.PC_DATA_DIR;
  rmSync(tmp, { recursive: true, force: true });
});

const reply = (set: string) => ({
  title: 'The girl and the tiger',
  lines: [
    {
      id: 'L01',
      vo: 'Long ago, a girl walked into the jungle with a lantern.',
      caption: 'A girl, a lantern, the jungle.',
      beat: 'hook',
    },
    {
      id: 'L02',
      vo: 'In the clearing, a tiger was waiting for her.',
      caption: 'A tiger was waiting.',
      beat: 'turn',
    },
    { id: 'L03', vo: 'It only wanted to know her name.', caption: 'It wanted her name.', beat: 'outro' },
  ],
  leftOut: [],
  characters: proof.characters,
  shots: [
    { ...proof.shots[0], set, lineIds: ['L01'] },
    { ...proof.shots[1], id: 'S02', lineIds: ['L02'] },
    { ...proof.shots[1], id: 'S03', lineIds: ['L03'] },
  ].map(({ durationInFrames: _d, ...s }) => (void _d, s)),
});

const fake = () => {
  const calls: { prompt: string; model: string; config: any }[] = [];
  const client: GeminiClient = {
    models: {
      generateContent: async (req: any) => {
        const prompt = req.contents.map((c: any) => c.parts.map((p: any) => p.text).join('')).join('\n');
        calls.push({ prompt, model: req.model, config: req.config });
        const text = JSON.stringify(reply(calls.length === 1 ? 'folk_spaceport' : 'folk_jungle'));
        return {
          text,
          responseId: 'r',
          usageMetadata: { promptTokenCount: 9000, candidatesTokenCount: 3000 },
          candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text }] } }],
        } as any;
      },
    },
  };
  return { client, calls };
};

describe('pc make (one call)', () => {
  it("keeps the catalogue small: the pack's sets only", () => {
    const cat = quickCatalogue('folklore');
    expect(cat).toContain('folk_village');
    expect(cat).not.toContain('crime_chawl_corridor');
    expect(cat.length / 4).toBeLessThan(9000); // ~tokens
  });

  it('flags short narration, long lines and repeated framing as fixes', () => {
    const script = {
      title: 't',
      hook: 'a',
      sources: [],
      sensitivityNotes: [],
      lines: [
        { id: 'L01', vo: 'one two three four five six', caption: 'c', sourceIds: [], beat: 'hook' as const },
        {
          id: 'L02',
          vo: 'a b c d e f g h i j k l m n o',
          caption: 'c',
          sourceIds: [],
          beat: 'turn' as const,
        },
      ],
    };
    const q = quality(script, 90, [
      'S03: third shot in a row on folk_jungle/full (vary the framing)',
      'S01: nothing moves',
    ]);
    expect(q[0]).toMatch(/21 words but must be about 90/);
    expect(q[1]).toMatch(/L02 has 15 words/);
    expect(q[2]).toMatch(/in a row/);
    expect(q).toHaveLength(3); // plain warnings stay warnings
    expect(quality({ ...script, lines: script.lines.slice(0, 1) }, 6, [])).toEqual([]);
  });

  it('writes script + plan in one call, repairs errors, retries quality issues but never fails on them', async () => {
    const { client, calls } = fake();
    const slug = await quickStory({ topic: 'The girl and the tiger', pack: 'folklore', client });
    // 1: unknown set (+ too short) → 2: still too short → 3: accepted despite the length
    expect(calls).toHaveLength(3);
    expect(calls[0].model).toBe('gemini-3.1-flash-lite');
    expect(calls[1].prompt).toContain('folk_spaceport');
    expect(calls[2].prompt).toMatch(/words but must be about/);
    expect(loadScript(slug).lines).toHaveLength(3);
    expect(loadPlan(slug).style).toBe('diorama');
    expect(loadState(slug).status).toBe('planned');
  });

  it('refuses factual genres (they must cite sources)', async () => {
    await expect(quickStory({ topic: 'x', genre: 'true_crime', client: fake().client })).rejects.toThrow(
      /cite sources/,
    );
  });
});
