import { describe, expect, it } from 'vitest';
import { CAT_BOUNDS, CAT_SPRITE_NAMES, callToBowl, calmCat, catFrame, catReact, createCat, feedCatInfo, petCatInfo, stepCat, type CatState } from '../../src/home/cat';
import items from '../../src/home/items.generated.json';

const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};
const cat = (p: Partial<CatState>): CatState => ({ x: 50, targetX: 50, mode: 'sit', since: 0, until: 100, facing: 'right', ...p });

describe('kotek w pokoju', () => {
  it('startuje siedząc w granicach pokoju', () => {
    const c = createCat(0, seq(0.5));
    expect(c.mode).toBe('sit');
    expect(c.x).toBeGreaterThanOrEqual(CAT_BOUNDS.minX);
    expect(c.x).toBeLessThanOrEqual(CAT_BOUNDS.maxX);
  });

  it('po siedzeniu idzie na spacer (3 klatki chodu) i siada u celu', () => {
    let c = stepCat(cat({ x: 30 }), 16, 200, seq(0.1, 1));
    expect(c.mode).toBe('walk');
    expect(c.targetX).toBe(CAT_BOUNDS.maxX);
    expect(c.facing).toBe('right');
    const frames = new Set([0, 150, 300, 450].map((t) => catFrame(c, t).sprite));
    expect(frames).toEqual(new Set(['cat_walk_1', 'cat_walk_2', 'cat_walk_3']));
    for (let t = 0; t < 20_000 && c.mode === 'walk'; t += 50) c = stepCat(c, 50, 200 + t, seq(0.5));
    expect(c.mode).toBe('sit');
    expect(c.x).toBe(CAT_BOUNDS.maxX);
  });

  it('bieg jest szybszy niż spacer', () => {
    const run = stepCat(cat({ x: 30 }), 16, 200, seq(0.4, 0.5));
    expect(run.mode).toBe('run');
    const r1 = stepCat(run, 1000, 1200, seq(0.5));
    const walk = stepCat(cat({ x: 30 }), 16, 200, seq(0.1, 1));
    const w1 = stepCat(walk, 1000, 1200, seq(0.5));
    expect(Math.abs(r1.x - 30)).toBeGreaterThan(Math.abs(w1.x - 30));
  });

  it('po drzemce przeciąga się, ziewa i siada', () => {
    let c = stepCat(cat({ mode: 'sleep', until: 10 }), 16, 20, seq(0.5));
    expect(c.mode).toBe('stretch');
    c = stepCat(c, 16, c.until + 1, seq(0.5));
    expect(c.mode).toBe('yawn');
    c = stepCat(c, 16, c.until + 1, seq(0.5));
    expect(c.mode).toBe('sit');
  });

  it('zabawa: przygotowanie, skok w górę i do przodu, lądowanie, zabawa, rzut', () => {
    const c = stepCat(cat({ x: 40 }), 16, 1000, seq(0.8));
    expect(c.mode).toBe('play');
    expect(catFrame(c, 1000).sprite).toBe('cat_prep');
    const leap = catFrame(c, 1000 + 700 + 225);
    expect(leap.sprite).toBe('cat_leap');
    expect(leap.lift).toBeGreaterThan(0);
    expect(leap.dx).toBeGreaterThan(0);
    expect(catFrame(c, 1000 + 700 + 450 + 100).sprite).toBe('cat_land');
    expect(catFrame(c, 1000 + 700 + 450 + 500 + 100).sprite).toBe('cat_play');
    const after = stepCat(c, 16, c.until + 1, seq(0.5));
    expect(after.mode).toBe('sit');
    expect(after.x).toBeGreaterThan(40);
  });

  it('blisko Gabi kot się łasi, przy jedzeniu prosi, przy złości się jeży', () => {
    const rub = stepCat(cat({ x: 50 }), 16, 200, seq(0.1), 58);
    expect(rub.mode).toBe('rub');
    expect(rub.facing).toBe('right');
    expect(catReact(cat({ x: 50 }), 'beg', 0, 60, seq(0.5)).mode).toBe('beg');
    expect(catReact(cat({ x: 10 }), 'beg', 0, 100, seq(0.5)).mode).toBe('sit'); // za daleko
    expect(catReact(cat({ x: 50 }), 'scared', 0, 60, seq(0.5)).mode).toBe('scared');
    expect(catReact(cat({ mode: 'sleep', until: 9999 }), 'scared', 0, 60, seq(0.5)).mode).toBe('sleep');
  });

  it('stuknięty siada i czeka', () => {
    const c = calmCat(cat({ x: 40, targetX: 90, mode: 'walk', until: Infinity }), 1000);
    expect(c).toMatchObject({ mode: 'sit', targetX: 40 });
    expect(c.until).toBeGreaterThan(1000);
  });

  it('każda klatka kota ma obrazek', () => {
    for (const s of CAT_SPRITE_NAMES) expect((items as Record<string, unknown>)[s], s).toBeDefined();
    for (const mode of ['sit', 'sleep', 'wash', 'yawn', 'stretch', 'roll', 'hunt', 'beg', 'rub', 'scared'] as const) {
      expect(CAT_SPRITE_NAMES).toContain(catFrame(cat({ mode, since: 0 }), 100).sprite);
    }
  });

  it('drzemka na legowisku / kanapie: idzie do mebla, śpi wyżej, po przebudzeniu zeskakuje', () => {
    const beds = [{ x: 90, lift: 26 }];
    let c = stepCat(cat({ x: 30 }), 16, 200, seq(0.05, 0.5), { gabiX: null, beds });
    expect(c.mode).toBe('walk');
    expect(c.targetX).toBe(90);
    for (let t = 0; t < 20_000 && c.mode === 'walk'; t += 50) c = stepCat(c, 50, 200 + t, seq(0.5), { gabiX: null, beds });
    expect(c.mode).toBe('sleep');
    expect(c.lift).toBe(26);
    c = stepCat(c, 16, c.until + 1, seq(0.5));
    expect(c.mode).toBe('stretch');
    c = stepCat(c, 16, c.until + 1, seq(0.5));
    expect(c.mode).toBe('yawn');
    expect(c.lift).toBe(0);
  });

  it('pełna miska: kot biegnie i je, potem siada', () => {
    let c = callToBowl(cat({ x: 20, mode: 'sleep', lift: 20, until: 9e9 }), 100, 0);
    expect(c.mode).toBe('run');
    expect(c.lift).toBe(0);
    for (let t = 0; t < 20_000 && c.mode === 'run'; t += 50) c = stepCat(c, 50, t, seq(0.5));
    expect(c.mode).toBe('eat');
    expect(c.x).toBe(91); // obok miski, głową do niej
    expect(c.facing).toBe('right');
    expect(['cat_hunt', 'cat_land']).toContain(catFrame(c, c.since + 100).sprite);
    c = stepCat(c, 16, c.until + 1, seq(0.5));
    expect(c.mode).toBe('sit');
  });

  it('głodny kot prosi Gabi; im większa sympatia, tym częściej się łasi', () => {
    const beg = stepCat(cat({ x: 50 }), 16, 200, seq(0.3), { gabiX: 58, hungry: true, love: 0 });
    expect(beg.mode).toBe('beg');
    const rubLoved = stepCat(cat({ x: 50 }), 16, 200, seq(0.5), { gabiX: 58, love: 100 });
    expect(rubLoved.mode).toBe('rub');
    const noRub = stepCat(cat({ x: 50 }), 16, 200, seq(0.5), { gabiX: 58, love: 0 });
    expect(noRub.mode).not.toBe('rub');
  });

  it('karmienie i głaskanie: najedzenie i sympatia', () => {
    expect(feedCatInfo({ name: 'K', hunger: 10, love: 50 }, 10)).toEqual({ name: 'K', hunger: 100, love: 60 });
    expect(petCatInfo({ name: 'K', hunger: 10, love: 95 }, 20).love).toBe(100);
  });
});

describe('kot je z miski (klatki miski z kotem)', () => {
  const seqv = (...v: number[]) => {
    let i = 0;
    return () => v[i++ % v.length];
  };
  const base = (p: Partial<CatState>): CatState => ({ x: 50, targetX: 50, mode: 'sit', since: 0, until: 100, facing: 'right', ...p });

  it('biegnie na lewą stronę miski i je w klatkach miski: siada, pochyla się, je, na koniec oblizuje się', async () => {
    const { BOWL_SIDE, bowlEatState } = await import('../../src/home/cat');
    let c = callToBowl(base({ x: 110 }), 96, 0, true);
    expect(c.targetX).toBe(96 - BOWL_SIDE);
    for (let t = 0; t < 20_000 && c.mode === 'run'; t += 50) c = stepCat(c, 50, t, seqv(0.5));
    expect(c).toMatchObject({ mode: 'eat', atBowl: true, x: 96 - BOWL_SIDE });
    expect(bowlEatState(c, c.since + 100)).toBe('eat_1');
    expect(bowlEatState(c, c.since + 600)).toBe('eat_2');
    expect(['eat_3', 'eat_4', 'eat_5', 'eat_7']).toContain(bowlEatState(c, c.since + 1500));
    expect(bowlEatState(c, c.until - 100)).toBe('eat_6');
    const after = stepCat(c, 16, c.until + 1, seqv(0.5));
    expect(after.atBowl).toBeUndefined();
    expect(bowlEatState(after, c.until + 2)).toBeNull();
  });

  it('miska przy lewej ścianie — kot je obok jak dawniej (bez klatek miski)', async () => {
    const { bowlEatState } = await import('../../src/home/cat');
    let c = callToBowl(base({ x: 60 }), 16, 0, true);
    for (let t = 0; t < 20_000 && c.mode === 'run'; t += 50) c = stepCat(c, 50, t, seqv(0.5));
    expect(c.mode).toBe('eat');
    expect(c.atBowl).toBe(false);
    expect(bowlEatState(c, c.since + 100)).toBeNull();
  });

  it('każdy stan miski z kotem ma obrazek', () => {
    for (let i = 1; i <= 7; i++) expect((items as Record<string, unknown>)[`cat_bowl_eat_${i}`]).toBeDefined();
  });
});

describe('miska stojąca głębiej', () => {
  it('kot w biegu stopniowo wchodzi w głąb do linii miski, a w zwykłym spacerze wraca na swoją linię', () => {
    const seqv = () => 0.5;
    let c = callToBowl({ x: 40, targetX: 40, mode: 'sit', since: 0, until: 100, facing: 'right' }, 96, 0, true, 18);
    let mid = -1;
    for (let t = 0; t < 20_000 && c.mode === 'run'; t += 50) {
      c = stepCat(c, 50, t, seqv);
      if (mid < 0 && c.x > 60) mid = c.lift ?? 0;
    }
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(18);
    expect(c).toMatchObject({ mode: 'eat', lift: 18 });
    let w: CatState = { ...c, mode: 'walk', targetX: 30, until: Infinity, atBowl: undefined };
    for (let t = 0; t < 20_000 && w.mode === 'walk'; t += 50) w = stepCat(w, 50, 30_000 + t, seqv);
    expect(w.lift ?? 0).toBe(0);
  });
});

describe('mała miska', () => {
  it('da się ją stuknąć obok rysunku (obszar co najmniej 12×10)', async () => {
    const { hitItem } = await import('../../src/home/layout');
    const bowl = { uid: 'b', itemId: 'cat_bowl', x: 96, y: 148, flip: false };
    expect(hitItem([bowl], 96 + 5.5, 147)).toBe(bowl);
    expect(hitItem([bowl], 96, 140)).toBe(bowl);
    expect(hitItem([bowl], 96 + 7, 147)).toBeNull();
  });
});
