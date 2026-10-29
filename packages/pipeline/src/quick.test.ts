// The cheap path with a fake Gemini: one call writes script + plan; kit errors go back once for a fix.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import proof from '../../video/fixtures/folklore-proof.spec.json';
import type { GeminiClient } from './gemini';
import { quickCatalogue, quickStory } from './quick';
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

  it('writes script + plan in one call (plus one repair for an unknown set), sets the pack style and approves', async () => {
    const { client, calls } = fake();
    const slug = await quickStory({ topic: 'The girl and the tiger', pack: 'folklore', client });
    expect(calls).toHaveLength(2);
    expect(calls[0].model).toBe('gemini-3.1-flash-lite');
    expect(calls[1].prompt).toContain('folk_spaceport');
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
