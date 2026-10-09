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

/** Chmurki w dzień (px logiczne): pozycja startowa, szerokość i prędkość dryfu (px/s, w prawo). */
export const CLOUDS: readonly { x: number; y: number; w: number; speed: number }[] = [
  { x: 14, y: 22, w: 16, speed: 1.2 },
  { x: 56, y: 12, w: 16, speed: 0.8 },
  { x: 70, y: 36, w: 16, speed: 1.6 },
  { x: 100, y: 28, w: 10, speed: 2.2 },
];
/** Chmurka znika za prawą krawędzią i wraca zza lewej (pas o tej szerokości poza ekranem). */
const CLOUD_WRAP = 20;

/** Lewy brzeg chmurki `i` w chwili `t` (ms): dryfuje w prawo i zawija się za krawędzią pokoju. */
export function cloudX(i: number, t: number, roomW = 128): number {
  const c = CLOUDS[i];
  const span = roomW + CLOUD_WRAP + c.w;
  return ((((c.x + CLOUD_WRAP + c.w + (c.speed * t) / 1000) % span) + span) % span) - CLOUD_WRAP - c.w;
}

/** Ptak w kluczu: środek (px logiczne) i klatka skrzydeł (0 — w górze, 1 — w dole). */
export interface Bird {
  x: number;
  y: number;
  wings: 0 | 1;
}

/** Co tyle ms jest szansa na klucz ptaków; przelot przez cały pokój trwa `BIRDS_MS`. */
export const BIRDS_SLOT_MS = 11_000;
export const BIRDS_MS = 7000;
const BIRDS_CHANCE = 0.6;
/** Ptaki lecą tylko po niebie (nad miastem). */
export const BIRDS_Y = { min: 14, max: 56 } as const;

/** Ptaki na niebie w chwili `t` (ms): klucz 1–4 ptaków przelatuje z jednej strony na drugą, lekko falując. */
export function birdsAt(t: number, roomW = 128): Bird[] {
  const slot = Math.floor(t / BIRDS_SLOT_MS);
  if (skyHash(slot * 3.17 + 0.9) > BIRDS_CHANCE) return [];
  const start = slot * BIRDS_SLOT_MS + skyHash(slot * 6.13 + 0.1) * (BIRDS_SLOT_MS - BIRDS_MS);
  const local = t - start;
  if (local < 0 || local > BIRDS_MS) return [];
  const p = local / BIRDS_MS;
  const dir = skyHash(slot * 2.29 + 0.6) < 0.5 ? -1 : 1;
  const count = 1 + Math.floor(skyHash(slot * 4.77 + 0.2) * 4);
  const y0 = BIRDS_Y.min + 4 + skyHash(slot * 5.51 + 0.8) * (BIRDS_Y.max - BIRDS_Y.min - 12);
  // przelot od -20 do roomW+20 (klucz wlatuje i wylatuje poza pokój)
  const lead = dir === 1 ? -20 + (roomW + 40) * p : roomW + 20 - (roomW + 40) * p;
  const birds: Bird[] = [];
  for (let k = 0; k < count; k++) {
    // klucz: kolejne ptaki z tyłu, na zmianę wyżej i niżej
    const side = k % 2 === 0 ? 1 : -1;
    const x = lead - dir * 5 * k;
    const y = y0 + side * 3 * Math.ceil(k / 2) + Math.sin((local + k * 300) / 500) * 1.5;
    birds.push({ x, y, wings: Math.floor((local + k * 110) / 190) % 2 === 0 ? 0 : 1 });
  }
  return birds;
}
