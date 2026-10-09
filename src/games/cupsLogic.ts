import type { Reward } from './types';

/**
 * Trzy kubki: kotek chowa się pod kubkiem, kubki zamieniają się miejscami, a gracz zgaduje, pod którym jest.
 * Co rundę więcej zamian i szybciej. 3 serduszka — każda pomyłka zabiera jedno.
 */
export const CUPS = {
  count: 3,
  lives: 3,
  /** Zamiany w pierwszej rundzie; co rundę o jedną więcej (najwięcej `maxSwaps`). */
  baseSwaps: 3,
  maxSwaps: 14,
} as const;

/** Czas jednej zamiany (ms): 480 w pierwszej rundzie, potem szybciej, najmniej 170. */
export const swapMs = (round: number): number => Math.max(170, 480 - round * 28);

/** Ile zamian w rundzie `round` (od 0). */
export const swapCount = (round: number): number => Math.min(CUPS.maxSwaps, CUPS.baseSwaps + round);

/** Losowe zamiany miejsc (pary różnych miejsc 0–2). */
export function makeSwaps(round: number, rng: () => number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < swapCount(round); k++) {
    const a = Math.min(CUPS.count - 1, Math.floor(rng() * CUPS.count));
    const b = (a + 1 + Math.min(CUPS.count - 2, Math.floor(rng() * (CUPS.count - 1)))) % CUPS.count;
    out.push([a, b]);
  }
  return out;
}

/** Miejsce kubka z kotkiem po zamianach (start — miejsce na początku). */
export function trackCup(start: number, swaps: readonly (readonly [number, number])[]): number {
  let at = start;
  for (const [a, b] of swaps) {
    if (at === a) at = b;
    else if (at === b) at = a;
  }
  return at;
}

export interface CupsState {
  round: number;
  score: number;
  lives: number;
  over: boolean;
}

export const createCups = (): CupsState => ({ round: 0, score: 0, lives: CUPS.lives, over: false });

/** Wybór kubka: trafiony — punkt i następna runda; pudło — minus serduszko (bez serduszek — koniec). */
export function guessCup(s: CupsState, picked: number, catAt: number): { state: CupsState; correct: boolean } {
  if (s.over) return { state: s, correct: false };
  if (picked === catAt) return { state: { ...s, round: s.round + 1, score: s.score + 1 }, correct: true };
  const lives = s.lives - 1;
  return { state: { ...s, round: s.round + 1, lives, over: lives <= 0 }, correct: false };
}

/** Nagroda: 3 monety za trafienie (od 3 do 45) i +10 humoru. */
export function cupsReward(score: number): Reward {
  return { coins: Math.max(3, Math.min(45, score * 3)), moodBoost: 10 };
}
