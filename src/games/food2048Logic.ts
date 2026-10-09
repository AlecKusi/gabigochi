import type { IconName } from '../art/icons';
import type { Reward } from './types';

/**
 * 2048 z jedzeniem: plansza 4×4, przesunięcie zsuwa wszystkie kafelki w jedną stronę, a dwa jednakowe łączą się
 * w następną potrawę z łańcucha (jabłko → truskawki → … → tort). Po każdym ruchu pojawia się nowe jabłko
 * (czasem truskawki). Koniec, gdy nie ma żadnego ruchu.
 */

/** Łańcuch potraw: poziom 1 = jabłko, ostatni = tort (dwa torty już się nie łączą). */
export const FOOD_CHAIN: readonly IconName[] = [
  'apple', 'strawberry', 'donut', 'sandwich', 'icecream', 'zapiekanka', 'pancakes',
  'pierogi', 'pizza', 'ramen', 'sushi', 'kitkat', 'cake',
];
export const MAX_LEVEL = FOOD_CHAIN.length;
export const SIZE = 4;
/** Szansa, że nowy kafelek to od razu truskawki (poziom 2), a nie jabłko. */
export const SPAWN_TWO = 0.1;

/** Plansza: SIZE×SIZE poziomów wierszami; 0 — puste pole. */
export type Grid = readonly number[];
export type Dir = 'left' | 'right' | 'up' | 'down';

export interface Food2048State {
  grid: Grid;
  score: number;
  moves: number;
  over: boolean;
}

/** Punkty za połączenie w poziom `level`: jak w 2048 (2, 4, 8 … — wartość nowego kafelka). */
export const mergePoints = (level: number): number => 2 ** level;

/** Najwyższy poziom na planszy (0 — pusta). */
export const bestLevel = (grid: Grid): number => Math.max(0, ...grid);

/** Nowy kafelek na losowym pustym polu (jabłko albo — rzadko — truskawki); null, gdy brak miejsca. */
export function spawn(grid: Grid, rng: () => number): { grid: number[]; at: number } | null {
  const empty = grid.flatMap((v, i) => (v === 0 ? [i] : []));
  if (empty.length === 0) return null;
  const at = empty[Math.min(empty.length - 1, Math.floor(rng() * empty.length))];
  const next = [...grid];
  next[at] = rng() < SPAWN_TWO ? 2 : 1;
  return { grid: next, at };
}

export function create2048(rng: () => number): Food2048State {
  let grid: number[] = Array(SIZE * SIZE).fill(0);
  for (let i = 0; i < 2; i++) grid = spawn(grid, rng)!.grid;
  return { grid, score: 0, moves: 0, over: false };
}

/** Zsuwa jedną linię ku początkowi: łączy jednakowe sąsiednie kafelki (każdy najwyżej raz na ruch). */
export function slideLine(line: readonly number[]): { line: number[]; gained: number; merged: number[] } {
  const tiles = line.filter((v) => v !== 0);
  const out: number[] = [];
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1] && tiles[i] < MAX_LEVEL) {
      const level = tiles[i] + 1;
      merged.push(out.length);
      out.push(level);
      gained += mergePoints(level);
      i++;
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, gained, merged };
}

/** Indeksy pól linii `n` w kolejności zsuwania (od pola, do którego kafelki jadą). */
function lineCells(dir: Dir, n: number): number[] {
  const idx = Array.from({ length: SIZE }, (_, k) => k);
  switch (dir) {
    case 'left':
      return idx.map((k) => n * SIZE + k);
    case 'right':
      return idx.map((k) => n * SIZE + (SIZE - 1 - k));
    case 'up':
      return idx.map((k) => k * SIZE + n);
    case 'down':
      return idx.map((k) => (SIZE - 1 - k) * SIZE + n);
  }
}

/** Czy da się wykonać jakikolwiek ruch (puste pole albo dwa jednakowe sąsiednie, poniżej tortu). */
export function canMove(grid: Grid): boolean {
  if (grid.includes(0)) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r * SIZE + c];
      if (v >= MAX_LEVEL) continue;
      if (c + 1 < SIZE && grid[r * SIZE + c + 1] === v) return true;
      if (r + 1 < SIZE && grid[(r + 1) * SIZE + c] === v) return true;
    }
  }
  return false;
}

export interface MoveResult {
  state: Food2048State;
  moved: boolean;
  /** Pola, na których powstał połączony kafelek. */
  merged: number[];
  /** Pole nowego kafelka (null — ruch się nie udał). */
  spawned: number | null;
  gained: number;
}

/** Ruch w stronę `dir`: zsuwa i łączy, dokłada nowy kafelek; bez zmian na planszy — ruch się nie liczy. */
export function move(s: Food2048State, dir: Dir, rng: () => number): MoveResult {
  if (s.over) return { state: s, moved: false, merged: [], spawned: null, gained: 0 };
  const grid = [...s.grid];
  const merged: number[] = [];
  let gained = 0;
  for (let n = 0; n < SIZE; n++) {
    const cells = lineCells(dir, n);
    const r = slideLine(cells.map((i) => grid[i]));
    cells.forEach((cell, k) => (grid[cell] = r.line[k]));
    r.merged.forEach((k) => merged.push(cells[k]));
    gained += r.gained;
  }
  const moved = grid.some((v, i) => v !== s.grid[i]);
  if (!moved) return { state: s, moved: false, merged: [], spawned: null, gained: 0 };
  const sp = spawn(grid, rng);
  const next = sp ? sp.grid : grid;
  return {
    state: { grid: next, score: s.score + gained, moves: s.moves + 1, over: !canMove(next) },
    moved: true,
    merged,
    spawned: sp ? sp.at : null,
    gained,
  };
}

/** Kierunek przesunięcia palca (px CSS); null — za krótkie. */
export function swipeDir(dx: number, dy: number, min = 24): Dir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Nagroda: moneta za każde 80 punktów (od 3 do 50) i +10 humoru. */
export function food2048Reward(score: number): Reward {
  return { coins: Math.max(3, Math.min(50, Math.floor(score / 80))), moodBoost: 10 };
}
