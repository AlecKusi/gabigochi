import type { Reward } from './types';

/**
 * Kot w pudełkach: 9 pudełek, z których co chwilę wyskakuje kotek (czasem złoty) albo ogórek. Stuknij kotka,
 * zanim się schowa; ogórka nie ruszaj. Im dalej, tym częściej i krócej wyglądają, a naraz mogą być nawet trzy.
 */
export const BOXES = {
  count: 9,
  duration: 30_000,
  /** Szansa na złotego kota i na ogórek (ogórki dopiero po kilku sekundach). */
  goldenChance: 0.08,
  cucumberChance: 0.16,
  cucumberFrom: 5000,
  points: { cat: 1, golden: 5, cucumber: -3 },
  /** Co ile ms coś wyskakuje: na początku i na końcu gry. */
  spawnMs: [850, 420],
  /** Jak długo wystaje: na początku i na końcu gry. */
  stayMs: [1300, 650],
  /** Po stuknięciu kot jeszcze chwilę jest widoczny (wystraszony), potem się chowa. */
  hitShowMs: 300,
} as const;

export type Popper = 'cat' | 'golden' | 'cucumber';

export interface Hole {
  kind: Popper;
  since: number;
  until: number;
  hit: boolean;
}

export interface BoxesState {
  t: number;
  holes: readonly (Hole | null)[];
  score: number;
  caught: number;
  spawnIn: number;
  over: boolean;
}

export type BoxesEvent =
  | { type: 'pop'; i: number; kind: Popper }
  | { type: 'hit'; i: number; kind: Popper; points: number }
  | { type: 'miss'; i: number }
  | { type: 'over' };

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export function createBoxes(): BoxesState {
  return { t: 0, holes: Array(BOXES.count).fill(null), score: 0, caught: 0, spawnIn: 600, over: false };
}

/** Ile naraz może wystawać: 1 na początku, potem 2, pod koniec 3. */
export const maxActive = (t: number): number => 1 + Math.floor(Math.min(1, t / BOXES.duration) * 2.5);

export function pickPopper(r: number, t: number): Popper {
  if (r < BOXES.goldenChance) return 'golden';
  if (t >= BOXES.cucumberFrom && r < BOXES.goldenChance + BOXES.cucumberChance) return 'cucumber';
  return 'cat';
}

export function stepBoxes(s: BoxesState, dt: number, rng: () => number): { state: BoxesState; events: BoxesEvent[] } {
  if (s.over) return { state: s, events: [] };
  const events: BoxesEvent[] = [];
  const t = s.t + dt;
  const p = Math.min(1, t / BOXES.duration);
  const holes = s.holes.map((h) => (h && t >= h.until ? null : h));
  let spawnIn = s.spawnIn - dt;
  if (spawnIn <= 0 && t < BOXES.duration) {
    spawnIn += lerp(BOXES.spawnMs[0], BOXES.spawnMs[1], p);
    const free = holes.flatMap((h, i) => (h ? [] : [i]));
    const active = holes.filter((h) => h && !h.hit).length;
    if (free.length > 0 && active < maxActive(t)) {
      const i = free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
      const kind = pickPopper(rng(), t);
      holes[i] = { kind, since: t, until: t + lerp(BOXES.stayMs[0], BOXES.stayMs[1], p), hit: false };
      events.push({ type: 'pop', i, kind });
    }
  }
  const over = t >= BOXES.duration;
  if (over) events.push({ type: 'over' });
  return { state: { ...s, t, holes, spawnIn, over }, events };
}

/** Stuknięcie pudełka `i`: kotek (złoty) — punkty, ogórek — kara; puste — pudło bez kary. */
export function tapBox(s: BoxesState, i: number): { state: BoxesState; events: BoxesEvent[] } {
  const h = s.holes[i];
  if (s.over || !h || h.hit) return { state: s, events: [{ type: 'miss', i }] };
  const points = BOXES.points[h.kind];
  const holes = s.holes.map((x, j) => (j === i && x ? { ...x, hit: true, until: s.t + BOXES.hitShowMs } : x));
  return {
    state: { ...s, holes, score: Math.max(0, s.score + points), caught: s.caught + (h.kind === 'cucumber' ? 0 : 1) },
    events: [{ type: 'hit', i, kind: h.kind, points }],
  };
}

/** Nagroda: ok. 1,2 monety za punkt (od 3 do 45) i +10 humoru. */
export function catBoxesReward(score: number): Reward {
  return { coins: Math.max(3, Math.min(45, Math.round(score * 1.2))), moodBoost: 10 };
}
