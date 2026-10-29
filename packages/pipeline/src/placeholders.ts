// `pc assets placeholders`: synthesise a few original music beds and SFX with ffmpeg so the pipeline has
// something to duck and place before the owner adds licensed tracks (spec 8.4). Replace them freely.
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { MusicTrack, SfxEntry } from '@papercut/schema';
import { assetsDir, ensureDir, ffmpeg, log, readJsonIf, writeJson } from '@papercut/shared';

const LICENSE = 'original placeholder synthesised by `pc assets placeholders` (free to use; replace with licensed audio)';

type Gen = { id: string; file: string; args: string[] };

const MUSIC: (Gen & { mood: string[]; bpm?: number })[] = [
  {
    id: 'placeholder_dark_drone',
    file: 'placeholder_dark_drone.wav',
    mood: ['dark', 'tense', 'ominous'],
    args: [
      '-f', 'lavfi', '-i',
      "aevalsrc='0.30*sin(2*PI*55*t)*(0.6+0.4*sin(2*PI*0.09*t)) + 0.18*sin(2*PI*82.41*t)*(0.55+0.45*sin(2*PI*0.06*t+1)) + 0.10*sin(2*PI*130.81*t+0.8*sin(2*PI*0.3*t))*(0.5+0.5*sin(2*PI*0.04*t+2))':s=48000:d=90",
      '-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.25:d=90:r=48000',
      '-filter_complex', '[1]lowpass=f=300[n];[0][n]amix=inputs=2:weights=1 0.5,aecho=0.8:0.7:220|470:0.35|0.22,lowpass=f=2400,afade=t=in:d=2,afade=t=out:st=88:d=2,volume=1.6[a]',
      '-map', '[a]', '-ac', '2',
    ],
  },
  {
    id: 'placeholder_melancholy_pad',
    file: 'placeholder_melancholy_pad.wav',
    mood: ['melancholy', 'sad', 'reflective'],
    args: [
      '-f', 'lavfi', '-i',
      "aevalsrc='0.16*sin(2*PI*110*t)+0.12*sin(2*PI*130.81*t)+0.10*sin(2*PI*164.81*t)+0.06*sin(2*PI*220*t)*(0.5+0.5*sin(2*PI*0.08*t))':s=48000:d=90",
      '-af', 'tremolo=f=0.2:d=0.4,aecho=0.8:0.8:300|620:0.4|0.3,lowpass=f=1800,afade=t=in:d=2,afade=t=out:st=88:d=2,volume=1.8',
      '-ac', '2',
    ],
  },
];

const SFX: (Gen & { loop?: boolean })[] = [
  { id: 'thud', file: 'placeholder_thud.wav', args: ['-f', 'lavfi', '-i', "aevalsrc='0.9*sin(2*PI*62*t)*exp(-14*t)+0.3*sin(2*PI*120*t)*exp(-30*t)':s=48000:d=0.6"] },
  {
    id: 'door_knock',
    file: 'placeholder_door_knock.wav',
    args: ['-f', 'lavfi', '-i', "aevalsrc='0.8*(sin(2*PI*180*t)*exp(-40*t)+sin(2*PI*180*(t-0.28))*exp(-40*(t-0.28))*gte(t,0.28)+sin(2*PI*175*(t-0.56))*exp(-40*(t-0.56))*gte(t,0.56))':s=48000:d=1.0", '-af', 'lowpass=f=900'],
  },
  { id: 'paper_slide', file: 'placeholder_paper_slide.wav', args: ['-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.6:d=0.45:r=48000', '-af', 'highpass=f=1200,lowpass=f=6000,afade=t=in:d=0.08,afade=t=out:st=0.2:d=0.25'] },
  { id: 'light_buzz', file: 'placeholder_light_buzz.wav', loop: true, args: ['-f', 'lavfi', '-i', "aevalsrc='0.08*sin(2*PI*100*t)+0.05*sin(2*PI*200*t)+0.03*sin(2*PI*300*t)':s=48000:d=4"] },
  { id: 'wind_loop', file: 'placeholder_wind_loop.wav', loop: true, args: ['-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.5:d=8:r=48000', '-af', 'lowpass=f=500,tremolo=f=0.15:d=0.6,volume=0.8'] },
  { id: 'clock_tick', file: 'placeholder_clock_tick.wav', loop: true, args: ['-f', 'lavfi', '-i', "aevalsrc='0.5*sin(2*PI*2400*mod(t,1))*exp(-180*mod(t,1))':s=48000:d=4"] },
  { id: 'fire_crackle_loop', file: 'placeholder_fire_crackle_loop.wav', loop: true, args: ['-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.35:d=6:r=48000', '-af', 'lowpass=f=900,volume=0.7'] },
];

export const generatePlaceholders = async ({ force = false } = {}) => {
  const musicDir = ensureDir(path.join(assetsDir(), 'music'));
  const sfxDir = ensureDir(path.join(assetsDir(), 'sfx'));
  // previous placeholder entries are recognised by their licence and regenerated; owner entries are kept
  const music = (readJsonIf<MusicTrack[]>(path.join(musicDir, 'music.json')) ?? []).filter((t) => t.license !== LICENSE);
  const sfx = (readJsonIf<SfxEntry[]>(path.join(sfxDir, 'sfx.json')) ?? []).filter((e) => e.license !== LICENSE);
  const known = new Set(sfx.map((s) => s.id));

  for (const m of MUSIC) {
    const out = path.join(musicDir, m.file);
    if (force || !existsSync(out)) await ffmpeg([...m.args, out]);
    music.push({ id: m.id, file: m.file, mood: m.mood, bpm: m.bpm, loopable: true, license: LICENSE });
    log.info(`music ${m.id}`);
  }
  for (const s of SFX) {
    const out = path.join(sfxDir, s.file);
    if (force || !existsSync(out)) await ffmpeg([...s.args, out]);
    // owner-provided sfx with the same id win
    if (!known.has(s.id)) sfx.push({ id: s.id, file: s.file, loop: !!s.loop, license: LICENSE });
    log.info(`sfx ${s.id}`);
  }
  writeJson(path.join(musicDir, 'music.json'), music);
  writeJson(path.join(sfxDir, 'sfx.json'), sfx);
};
