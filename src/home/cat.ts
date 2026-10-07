/**
 * Kotek Gabi chodzący po pokoju (czysta logika): siedzi, przechadza się, przeciąga się i drzemie.
 * W nocy śpi z Gabi w łóżku (jest w klatkach snu), więc w pokoju go wtedy nie ma.
 */

export type CatMode = 'sit' | 'walk' | 'sleep' | 'stretch';

export interface CatState {
  x: number;
  targetX: number;
  mode: CatMode;
  /** Do kiedy (ms, zegar animacji) trwa obecny tryb (spacer — do dojścia). */
  until: number;
  facing: 'left' | 'right';
}

/** Gdzie kot może chodzić (px logiczne pokoju) i jak szybko. */
export const CAT_BOUNDS = { minX: 14, maxX: 114, speed: 11 } as const;
/** Linia łapek kota — tuż przed linią stóp Gabi (kot jest bliżej). */
export const CAT_Y = 150;

export const CAT_SPRITES: Readonly<Record<CatMode, string>> = {
  sit: 'cat_sit',
  walk: 'cat_walk',
  sleep: 'cat_sleep',
  stretch: 'cat_stretch',
};

const DURATION: Readonly<Record<Exclude<CatMode, 'walk'>, [number, number]>> = {
  sit: [3000, 7000],
  sleep: [9000, 18000],
  stretch: [1200, 1800],
};

const span = ([a, b]: [number, number], rng: () => number) => a + rng() * (b - a);

export function createCat(now: number, rng: () => number): CatState {
  const x = CAT_BOUNDS.minX + rng() * (CAT_BOUNDS.maxX - CAT_BOUNDS.minX);
  return { x, targetX: x, mode: 'sit', until: now + span(DURATION.sit, rng), facing: rng() < 0.5 ? 'left' : 'right' };
}

/** Następny tryb po skończonym: po drzemce przeciąganie, po siedzeniu spacer albo drzemka, po spacerze siad. */
function next(c: CatState, now: number, rng: () => number): CatState {
  if (c.mode === 'sleep') return { ...c, mode: 'stretch', until: now + span(DURATION.stretch, rng) };
  if (c.mode === 'walk' || c.mode === 'stretch') return { ...c, mode: 'sit', until: now + span(DURATION.sit, rng) };
  if (rng() < 0.25) return { ...c, mode: 'sleep', until: now + span(DURATION.sleep, rng) };
  const targetX = CAT_BOUNDS.minX + rng() * (CAT_BOUNDS.maxX - CAT_BOUNDS.minX);
  return { ...c, mode: 'walk', targetX, until: Infinity, facing: targetX < c.x ? 'left' : 'right' };
}

export function stepCat(c: CatState, dt: number, now: number, rng: () => number): CatState {
  if (c.mode === 'walk') {
    const d = c.targetX - c.x;
    const step = (CAT_BOUNDS.speed * dt) / 1000;
    if (Math.abs(d) <= step) return next({ ...c, x: c.targetX }, now, rng);
    return { ...c, x: c.x + Math.sign(d) * step };
  }
  return now >= c.until ? next(c, now, rng) : c;
}

/** Stuknięty kot siada i czeka na Gabi. */
export function calmCat(c: CatState, now: number): CatState {
  return { ...c, mode: 'sit', targetX: c.x, until: now + 60_000 };
}
