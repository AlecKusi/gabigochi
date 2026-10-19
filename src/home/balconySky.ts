/**
 * Życie nieba nad balkonem (czyste funkcje; rysuje `pet/room.ts`): w pogodny dzień przelatują klucze ptaków,
 * a w pogodną noc od czasu do czasu spadająca gwiazda. Wspólny „los” `skyHash` służy też drobinkom pogody.
 */

/** Deterministyczny „los” 0–1 (te same okna i gwiazdy przy każdym rysowaniu). */
export function skyHash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
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
