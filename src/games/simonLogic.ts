import type { Reward } from './types';

/**
 * Ukulele Simon: Gabi gra melodię na 4 strunach (G, C, E, A), a gracz ją powtarza. Co rundę melodia jest dłuższa
 * o jedną nutę i grana trochę szybciej. Pierwsza pomyłka kończy grę; wynik — liczba powtórzonych melodii.
 */
export const SIMON = {
  /** Struny ukulele od góry: G, C, E, A (Hz — wyżej niż prawdziwe, żeby były czyste w małym głośniku). */
  strings: [
    { name: 'G', freq: 392 },
    { name: 'C', freq: 523 },
    { name: 'E', freq: 659 },
    { name: 'A', freq: 880 },
  ],
} as const;

/** Odstęp między nutami pokazu (ms): 620 w pierwszej rundzie, potem szybciej, najmniej 280. */
export const stepMs = (round: number): number => Math.max(280, 620 - round * 25);

export interface SimonState {
  seq: readonly number[];
  /** Która nuta melodii jest teraz do zagrania przez gracza. */
  pos: number;
  /** Ile melodii gracz już powtórzył. */
  round: number;
  over: boolean;
}

const randomString = (rng: () => number) => Math.min(SIMON.strings.length - 1, Math.floor(rng() * SIMON.strings.length));

export function createSimon(rng: () => number): SimonState {
  return { seq: [randomString(rng)], pos: 0, round: 0, over: false };
}

/** Gracz trąca strunę: dobra nuta — dalej; cała melodia — runda zaliczona i melodia dłuższa o nutę; zła — koniec. */
export function pressString(s: SimonState, i: number, rng: () => number): { state: SimonState; result: 'ok' | 'round' | 'wrong' } {
  if (s.over) return { state: s, result: 'wrong' };
  if (s.seq[s.pos] !== i) return { state: { ...s, over: true }, result: 'wrong' };
  if (s.pos + 1 < s.seq.length) return { state: { ...s, pos: s.pos + 1 }, result: 'ok' };
  return { state: { seq: [...s.seq, randomString(rng)], pos: 0, round: s.round + 1, over: false }, result: 'round' };
}

/** Nagroda: 3 monety za każdą powtórzoną melodię (od 3 do 45) i +12 humoru. */
export function simonReward(rounds: number): Reward {
  return { coins: Math.max(3, Math.min(45, rounds * 3)), moodBoost: 12 };
}
