import { describe, expect, it } from 'vitest';
import {
  ACTIVITIES, ACTIVITY_IDS, CROSSFADE_MS, activityDuration, activityFrame, allActivityFrames,
  nextActivityDelay, pickActivity,
} from '../../src/pet/activities';
import framesMeta from '../../src/sprites/frames.generated.json';

describe('activityFrame — historyjka', () => {
  const def = ACTIVITIES.study;
  it('sceny po kolei, przenikanie na początku każdej', () => {
    expect(activityFrame(def, 0, activityDuration(def, () => 0))).toEqual({ frame: 'study_1', prev: null, blend: 1 });
    const mid = activityFrame(def, def.sceneMs! + CROSSFADE_MS / 2, 1e9);
    expect(mid.frame).toBe('study_2');
    expect(mid.prev).toBe('study_1');
    expect(mid.blend).toBeCloseTo(0.5);
    expect(activityFrame(def, def.sceneMs! * 1.5, 1e9)).toEqual({ frame: 'study_2', prev: null, blend: 1 });
  });
  it('ostatnia scena trzyma się do końca', () => {
    expect(activityFrame(def, def.sceneMs! * 99, 1e9).frame).toBe('study_5');
  });
});

describe('activityFrame — pętla z intro i zakończeniem', () => {
  const music = ACTIVITIES.music;
  it('intro, potem pętla, na koniec outro', () => {
    const total = 25_000;
    expect(activityFrame(music, 0, total).frame).toBe('music_1');
    expect(activityFrame(music, 900, total).frame).toBe('music_2');
    expect(['music_3', 'music_4']).toContain(activityFrame(music, 5000, total).frame);
    expect(activityFrame(music, total - 500, total).frame).toBe('music_5');
  });
  it('szydełko kończy pokazaniem sweterka', () => {
    const c = ACTIVITIES.crochet;
    expect(activityFrame(c, 20_000 - 1000, 20_000).frame).toBe('crochet_5');
    expect(activityFrame(c, 3000, 20_000).frame).not.toBe('crochet_5');
  });
});

describe('losowanie', () => {
  it('pickActivity zwraca każde zajęcie', () => {
    const got = new Set(ACTIVITY_IDS.map((_, i) => pickActivity(() => (i + 0.5) / ACTIVITY_IDS.length)));
    expect(got.size).toBe(ACTIVITY_IDS.length);
  });
  it('odstęp 60–120 s', () => {
    expect(nextActivityDelay(() => 0)).toBe(60_000);
    expect(nextActivityDelay(() => 0.999999)).toBeLessThanOrEqual(120_000);
  });
  it('czas trwania: historyjka = sceny × czas sceny, pętla 20–30 s', () => {
    expect(activityDuration(ACTIVITIES.nursing, () => 0.5)).toBe(5 * ACTIVITIES.nursing.sceneMs!);
    expect(activityDuration(ACTIVITIES.phone, () => 0)).toBe(20_000);
    expect(activityDuration(ACTIVITIES.phone, () => 1)).toBe(30_000);
  });
});

describe('klatki', () => {
  it('klatki zajęć istnieją w frames.generated.json', () => {
    for (const f of allActivityFrames()) expect(framesMeta.body).toContain(f);
  });
});
