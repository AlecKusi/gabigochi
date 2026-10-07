import { describe, expect, it } from 'vitest';
import { ACTIVITIES, ACTIVITY_IDS, CROSSFADE_MS } from '../../src/pet/activities';
import { FEET_Y } from '../../src/pet/room';
import framesMeta from '../../src/sprites/frames.generated.json';
import { LINE_EVERY_MS, LINE_FIRST_MS, SCENE_AT, createActivityPlayer, frameRect, hitsScene, placeActivityFrame, splitZoom, zoomBox, zoomRect } from '../../src/ui/activityPlayer';

describe('placeActivityFrame', () => {
  it('sceny z rekwizytami na środku pokoju, reszta w miejscu Gabi', () => {
    expect(placeActivityFrame(ACTIVITIES.nursing, 'nurse_4', 30)).toEqual({ frame: 'nurse_4', x: SCENE_AT.x, feetY: FEET_Y + 2, centered: true });
    expect(placeActivityFrame(ACTIVITIES.nursing, 'nurse_1', 30)).toEqual({ frame: 'nurse_1', x: 30, feetY: FEET_Y, centered: false });
    expect(placeActivityFrame(ACTIVITIES.phone, 'phone_2', 90).x).toBe(90);
  });
});

describe('szydełko na meblu', () => {
  it('przy siedzisku klatki bez stołka, w miejscu siedziska', () => {
    const spot = { x: 50, feetY: 137 };
    expect(placeActivityFrame(ACTIVITIES.crochet, 'crochet_2', 30, spot)).toEqual({ frame: 'sit_crochet_2', x: 50, feetY: 137, centered: true });
    expect(placeActivityFrame(ACTIVITIES.crochet, 'crochet_2', 30)).toMatchObject({ frame: 'crochet_2', x: 30 });
    for (const f of Object.values(ACTIVITIES.crochet.seated!)) expect(framesMeta.body).toContain(f);
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
    // zbliżenie: Gabi zostaje przy biurku (study_1), kadr study_2 pojawia się w okienku
    const v = p.view(sceneMs + CROSSFADE_MS / 4, 30)!;
    expect(v.cur.frame).toBe('study_1');
    expect(v.prev).toBeNull();
    expect(v.cur.centered).toBe(true);
    expect(v.zoom?.alpha).toBeCloseTo(0.25);
    expect(v.zoom?.layers).toEqual([['study_2', 1]]);
    const w = p.view(2 * sceneMs + CROSSFADE_MS / 2, 30)!;
    expect(w.zoom?.alpha).toBe(1);
    expect(w.zoom?.layers.map(([f]) => f)).toEqual(['study_2', 'study_3']);
    const end = p.step(5 * sceneMs, 30);
    expect(end.finished).toEqual({ frame: 'study_1', ...SCENE_AT, centered: true });
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

describe('zbliżenia', () => {
  it('praktyka: pacjent w okienku nad Gabi w pozie z poprzedniej sceny, potem okienko znika', () => {
    const def = ACTIVITIES.nursing;
    expect(splitZoom(def, 'nurse_3', null, 1)).toEqual({ cur: 'nurse_2', prev: null, blend: 1, zoom: { alpha: 1, layers: [['nurse_3', 1]] } });
    expect(splitZoom(def, 'nurse_3', 'nurse_2', 0.5)).toMatchObject({ cur: 'nurse_2', prev: null, zoom: { alpha: 0.5 } });
    expect(splitZoom(def, 'nurse_4', 'nurse_3', 0.25)).toEqual({ cur: 'nurse_4', prev: 'nurse_2', blend: 0.25, zoom: { alpha: 0.75, layers: [['nurse_3', 1]] } });
    expect(splitZoom(def, 'nurse_1', null, 1).zoom).toBeNull();
  });

  it('okienko nad sceną, w granicach pokoju, wszystkie zbliżenia się mieszczą', () => {
    for (const def of Object.values(ACTIVITIES)) {
      if (!def.zoom) continue;
      const box = zoomBox(def);
      for (const z of def.zoom) {
        const m = framesMeta.frames[z as keyof typeof framesMeta.frames];
        expect(m.w * m.scale, z).toBeLessThanOrEqual(box.w);
        expect(m.h * m.scale, z).toBeLessThanOrEqual(box.h);
      }
      for (const x of [10, 64, 120]) {
        const base = placeActivityFrame(def, def.frames[0], x);
        const r = zoomRect(def, base);
        expect(r.x).toBeGreaterThanOrEqual(1);
        expect(r.x + r.w).toBeLessThanOrEqual(127);
        expect(r.y).toBeGreaterThanOrEqual(1);
        const m = framesMeta.frames[base.frame as keyof typeof framesMeta.frames];
        expect(r.y + r.h).toBeLessThanOrEqual(frameRect(m, base.x, base.feetY).y);
      }
    }
  });
});
