import { describe, expect, it } from 'vitest';
import { ACTIVITIES, ACTIVITY_IDS, CROSSFADE_MS } from '../../src/pet/activities';
import { FEET_Y } from '../../src/pet/room';
import framesMeta from '../../src/sprites/frames.generated.json';
import { LINE_EVERY_MS, LINE_FIRST_MS, SCENE_AT, createActivityPlayer, frameRect, hitsScene, placeActivityFrame } from '../../src/ui/activityPlayer';

describe('placeActivityFrame', () => {
  it('sceny z rekwizytami na środku pokoju, reszta w miejscu Gabi', () => {
    expect(placeActivityFrame(ACTIVITIES.nursing, 'nurse_3', 30)).toEqual({ frame: 'nurse_3', x: SCENE_AT.x, feetY: FEET_Y + 2, centered: true });
    expect(placeActivityFrame(ACTIVITIES.nursing, 'nurse_1', 30)).toEqual({ frame: 'nurse_1', x: 30, feetY: FEET_Y, centered: false });
    expect(placeActivityFrame(ACTIVITIES.phone, 'phone_2', 90).x).toBe(90);
  });
});

describe('frameRect / hitsScene', () => {
  const meta = { w: 40, h: 20, anchorX: 20, scale: 0.5 };
  it('prostokąt klatki wokół kotwicy, stopy na dole', () => {
    expect(frameRect(meta, 64, 146)).toEqual({ x: 54, y: 136, w: 20, h: 10 });
    expect(frameRect({ ...meta, foot: 10 }, 64, 146).y).toBe(141);
  });
  it('trafienie tylko w obrębie sceny', () => {
    const p = { frame: 'scene', x: 64, feetY: 146, centered: true };
    const frames = { scene: meta };
    expect(hitsScene(p, 64, 140, frames)).toBe(true);
    expect(hitsScene(p, 54, 136, frames)).toBe(true);
    expect(hitsScene(p, 53, 140, frames)).toBe(false);
    expect(hitsScene(p, 64, 130, frames)).toBe(false);
    expect(hitsScene({ ...p, frame: 'brak' }, 64, 140, frames)).toBe(false);
  });
});

describe('createActivityPlayer', () => {
  const rng = () => 0;

  it('samodzielne zajęcie o czasie 60–120 s od startu pokoju', () => {
    const p = createActivityPlayer(1000, rng);
    expect(p.current).toBeNull();
    expect(p.nextAt).toBe(61_000);
  });

  it('historyjka: przenikanie scen, kwestie, koniec z ostatnią klatką', () => {
    const p = createActivityPlayer(0, rng);
    p.start('study', 0);
    expect(p.current?.id).toBe('study');
    expect(p.step(100, 30).line).toBeNull();
    const first = p.step(LINE_FIRST_MS, 30).line;
    expect(ACTIVITIES.study.lines).toContain(first);
    const sceneMs = ACTIVITIES.study.sceneMs!;
    const v = p.view(sceneMs + CROSSFADE_MS / 4, 30)!;
    expect(v.cur.frame).toBe('study_2');
    expect(v.prev?.frame).toBe('study_1');
    expect(v.blend).toBeCloseTo(0.25);
    expect(v.cur.centered).toBe(true);
    const end = p.step(5 * sceneMs, 30);
    expect(end.finished).toEqual({ frame: 'study_5', ...SCENE_AT, centered: true });
    expect(p.current).toBeNull();
    expect(p.view(5 * sceneMs, 30)).toBeNull();
    expect(p.nextAt).toBe(5 * sceneMs + 60_000);
  });

  it('każda kwestia raz, co ~7 s', () => {
    const p = createActivityPlayer(0, () => 0.5);
    p.start('phone', 0); // pętla 25 s przy rng 0.5
    const said: string[] = [];
    for (let t = 0; t < 25_000; t += 100) {
      const st = p.step(t, 50);
      if (st.line) said.push(st.line);
    }
    expect(new Set(said).size).toBe(said.length);
    expect(said.length).toBe(ACTIVITIES.phone.lines.length);
    expect(LINE_EVERY_MS).toBeGreaterThan(5000);
  });

  it('przerwanie: bez końca z bonusem, nowy termin samodzielnego zajęcia', () => {
    const p = createActivityPlayer(0, rng);
    expect(p.stop(10, 40)).toBeNull();
    p.start('music', 0);
    expect(p.stop(5000, 40)).toMatchObject({ x: 40, centered: false });
    expect(p.current).toBeNull();
    expect(p.step(99_000, 40).finished).toBeNull();
    expect(p.nextAt).toBe(65_000);
  });

  it('miny zajęć istnieją wśród portretów', () => {
    for (const id of ACTIVITY_IDS) {
      const a = ACTIVITIES[id].avatar;
      if (a) expect(Object.keys(framesMeta.portraits)).toContain(a);
    }
  });
});
