import type { DayPhase } from './daytime';

/**
 * Życie nieba nad balkonem (czyste funkcje; rysuje `pet/room.ts`): okna w mieście gasną i zapalają się — im później
 * w nocy, tym mniej świeci — a nocą od czasu do czasu przelatuje spadająca gwiazda i część gwiazd migocze.
 */

/** Deterministyczny „los” 0–1 (te same okna i gwiazdy przy każdym rysowaniu). */
export function skyHash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Jaka część okien świeci o tej godzinie: wieczorem prawie wszystkie, w nocy coraz mniej (21:00 ~85%, 1:00 ~55%,
 * 5:00 ~25%); w dzień — żadne.
 */
export function litShare(phase: DayPhase, hours: number): number {
  if (phase === 'evening') return 0.9;
  if (phase !== 'night') return 0;
  const lateness = (((hours - 21) % 24) + 24) % 24 / 9; // 21:00 → 0, 6:00 → 1
  return 0.85 - 0.65 * Math.min(1, lateness);
}

/** Okno `i` świeci? Każde ma własny cykl (40–120 s): na granicy cyklu może zgasnąć albo się zapalić. */
export function windowLit(i: number, clockMs: number, share: number): boolean {
  if (share <= 0) return false;
  const period = 40_000 + skyHash(i * 3.1 + 0.5) * 80_000;
  const cycle = Math.floor((clockMs + skyHash(i * 7.7 + 0.3) * period) / period);
  return skyHash(i * 13.3 + cycle * 0.618 + 1.7) < share;
}

/** Spadająca gwiazda: punkt głowy (px logiczne), kierunek lotu i postęp 0–1. */
export interface Meteor {
  x: number;
  y: number;
  dir: -1 | 1;
  p: number;
}

/** Co tyle ms jest szansa na spadającą gwiazdę; lot trwa `METEOR_MS`. */
export const METEOR_SLOT_MS = 7000;
export const METEOR_MS = 1000;
/** Szansa na gwiazdę w jednym oknie czasu — średnio jedna co ~13 s. */
const METEOR_CHANCE = 0.55;
/** Przelot w px logicznych: w bok i w dół. */
export const METEOR_FLIGHT = { dx: 44, dy: 22 } as const;

/** Spadająca gwiazda w chwili `t` (ms) albo null; lata tylko po niebie nad miastem (y < 64). */
export function meteorAt(t: number): Meteor | null {
  const slot = Math.floor(t / METEOR_SLOT_MS);
  if (skyHash(slot * 1.37 + 0.11) > METEOR_CHANCE) return null;
  const start = slot * METEOR_SLOT_MS + skyHash(slot * 2.71 + 0.2) * (METEOR_SLOT_MS - METEOR_MS);
  const local = t - start;
  if (local < 0 || local > METEOR_MS) return null;
  const p = local / METEOR_MS;
  const dir: -1 | 1 = skyHash(slot * 8.9 + 0.4) < 0.5 ? -1 : 1;
  // start daleko od krawędzi, w którą leci — cała smuga mieści się na niebie i omija księżyc (x ≥ 97)
  const x0 = dir === 1 ? 8 + skyHash(slot * 5.3) * 58 : 50 + skyHash(slot * 5.3) * 45;
  const y0 = 12 + skyHash(slot * 4.1 + 0.7) * 28;
  return { x: x0 + dir * METEOR_FLIGHT.dx * p, y: y0 + METEOR_FLIGHT.dy * p, dir, p };
}

/** Migocząca gwiazda `i` w chwili `t`: przez chwilę przygasa (każda w swoim rytmie). */
export function starDimmed(i: number, t: number): boolean {
  const period = 1800 + skyHash(i * 2.3) * 2600;
  return ((t + skyHash(i * 9.1) * period) % period) / period < 0.12;
}
