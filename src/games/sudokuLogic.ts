import type { Reward } from './types';

/** 81 pól wierszami; 0 = puste, 1–9 = cyfra. */
export type Grid = number[];
export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
/** Docelowa liczba odkrytych pól (trudne: jeśli się nie da przy jednoznaczności, o 1–2 więcej). */
export const CLUES: Record<Difficulty, number> = { easy: 40, medium: 32, hard: 26 };
export const DIFFICULTY_SCORE: Record<Difficulty, number> = { easy: 30, medium: 50, hard: 80 };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Łatwe', medium: 'Średnie', hard: 'Trudne' };

export function sudokuReward(score: number): Reward {
  return { coins: score, moodBoost: 15 };
}

// ── Geometria ────────────────────────────────────────────────────────────────

const ALL = 0x1ff;
const ROW: number[] = [];
const COL: number[] = [];
const BOX: number[] = [];
for (let i = 0; i < 81; i++) {
  ROW.push(Math.floor(i / 9));
  COL.push(i % 9);
  BOX.push(Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3));
}
const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (ROW[j] === ROW[i] || COL[j] === COL[i] || BOX[j] === BOX[i])) out.push(j);
  }
  return out;
});
const POPCOUNT: number[] = Array.from({ length: 512 }, (_, m) => {
  let n = 0;
  for (let x = m; x; x &= x - 1) n++;
  return n;
});

export const rowOf = (i: number): number => ROW[i];
export const colOf = (i: number): number => COL[i];
export const boxOf = (i: number): number => BOX[i];
/** 20 pól w tym samym wierszu, kolumnie lub bloku (bez samego pola). */
export const peersOf = (i: number): readonly number[] => PEERS[i];

// ── Rozwiązywanie (backtracking z MRV na maskach bitowych) ──────────────────

interface SearchResult {
  count: number;
  first: Grid | null;
}

function search(grid: Grid, limit: number, rng?: () => number): SearchResult {
  const g = grid.slice();
  const rows = new Array<number>(9).fill(0);
  const cols = new Array<number>(9).fill(0);
  const boxes = new Array<number>(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & bit) return { count: 0, first: null };
    rows[ROW[i]] |= bit;
    cols[COL[i]] |= bit;
    boxes[BOX[i]] |= bit;
  }

  const result: SearchResult = { count: 0, first: null };
  const rec = (): boolean => {
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ALL & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
      const n = POPCOUNT[m];
      if (n === 0) return false;
      if (n < bestN) {
        best = i;
        bestMask = m;
        bestN = n;
        if (n === 1) break;
      }
    }
    if (best < 0) {
      result.count++;
      if (!result.first) result.first = g.slice();
      return result.count >= limit;
    }
    const digits: number[] = [];
    for (let v = 1; v <= 9; v++) if (bestMask & (1 << (v - 1))) digits.push(v);
    if (rng) shuffle(digits, rng);
    const r = ROW[best];
    const c = COL[best];
    const b = BOX[best];
    for (const v of digits) {
      const bit = 1 << (v - 1);
      g[best] = v;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      const stop = rec();
      g[best] = 0;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
      if (stop) return true;
    }
    return false;
  };
  rec();
  return result;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Liczba rozwiązań, liczona najwyżej do `limit` (0 przy sprzeczności). */
export function countSolutions(grid: Grid, limit = 2): number {
  return search(grid, limit).count;
}

/** Pierwsze znalezione rozwiązanie albo null. */
export function solve(grid: Grid): Grid | null {
  return search(grid, 1).first;
}

/** Losowa, w pełni wypełniona poprawna plansza. */
export function generateSolved(rng: () => number): Grid {
  return search(new Array<number>(81).fill(0), 1, rng).first!;
}

/**
 * Usuwa cyfry w losowej kolejności, zostawiając tylko te usunięcia, po których łamigłówka ma nadal
 * dokładnie jedno rozwiązanie. Jeśli w jednym przebiegu nie dojdzie do celu, próbuje innej kolejności
 * i zwraca najlepszy wynik.
 */
export function makePuzzle(solved: Grid, difficulty: Difficulty, rng: () => number): Grid {
  const target = CLUES[difficulty];
  let best: Grid = solved.slice();
  let bestClues = 81;
  for (let attempt = 0; attempt < 8 && bestClues > target; attempt++) {
    const g = solved.slice();
    let clues = 81;
    const order = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
    for (const i of order) {
      if (clues <= target) break;
      const v = g[i];
      g[i] = 0;
      if (countSolutions(g, 2) === 1) clues--;
      else g[i] = v;
    }
    if (clues < bestClues) {
      best = g;
      bestClues = clues;
    }
  }
  return best;
}

// ── Sprawdzanie ──────────────────────────────────────────────────────────────

/** Czy `value` w polu `index` nie powtarza się w wierszu, kolumnie ani bloku (samo pole się nie liczy). */
export function isValidPlacement(grid: Grid, index: number, value: number): boolean {
  return PEERS[index].every((j) => grid[j] !== value);
}

/** Pola, których cyfra powtarza się u któregoś sąsiada. */
export function conflicts(grid: Grid): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const v = grid[i];
    if (v && !isValidPlacement(grid, i, v)) out.add(i);
  }
  return out;
}

export function isSolved(grid: Grid): boolean {
  return grid.length === 81 && grid.every((v) => v >= 1 && v <= 9) && conflicts(grid).size === 0;
}

/** Ile razy występuje każda cyfra (indeks 1–9; indeks 0 = puste pola). */
export function digitCounts(grid: Grid): number[] {
  const out = new Array<number>(10).fill(0);
  for (const v of grid) out[v]++;
  return out;
}

// ── Plansza gracza ───────────────────────────────────────────────────────────

export interface Board {
  /** Odkryte na start (0 = do uzupełnienia). */
  puzzle: Grid;
  solution: Grid;
  /** Aktualny stan: odkryte + wpisane przez gracza. */
  cells: Grid;
  /** Notatki ołówkiem: bit (v − 1) = cyfra v. */
  notes: number[];
}

export function newBoard(puzzle: Grid, solution: Grid): Board {
  return { puzzle: puzzle.slice(), solution: solution.slice(), cells: puzzle.slice(), notes: new Array<number>(81).fill(0) };
}

/**
 * Wpisuje cyfrę (ta sama cyfra drugi raz czyści pole). Czyści notatki pola i usuwa tę cyfrę z notatek
 * sąsiadów. Odkrytych pól nie zmienia — wtedy zwraca tę samą planszę.
 */
export function placeDigit(b: Board, index: number, value: number): Board {
  if (b.puzzle[index] !== 0) return b;
  const cells = b.cells.slice();
  const notes = b.notes.slice();
  if (cells[index] === value) {
    cells[index] = 0;
    return { ...b, cells, notes };
  }
  cells[index] = value;
  notes[index] = 0;
  const bit = 1 << (value - 1);
  for (const j of PEERS[index]) notes[j] &= ~bit;
  return { ...b, cells, notes };
}

export function eraseCell(b: Board, index: number): Board {
  if (b.puzzle[index] !== 0 || (b.cells[index] === 0 && b.notes[index] === 0)) return b;
  const cells = b.cells.slice();
  const notes = b.notes.slice();
  cells[index] = 0;
  notes[index] = 0;
  return { ...b, cells, notes };
}

/** Przełącza notatkę w pustym polu; w polu z cyfrą nic nie robi. */
export function toggleNote(b: Board, index: number, value: number): Board {
  if (b.cells[index] !== 0) return b;
  const notes = b.notes.slice();
  notes[index] ^= 1 << (value - 1);
  return { ...b, notes };
}

// ── Zapis rozgrywki w toku ───────────────────────────────────────────────────

export const SUDOKU_SAVE_KEY = 'gabigochi.game.sudoku';

export interface SudokuSave {
  v: 1;
  difficulty: Difficulty;
  board: Board;
  /** Czas gry w ms. */
  elapsed: number;
}

export function serializeSave(s: SudokuSave): string {
  return JSON.stringify(s);
}

const isGrid = (x: unknown, max: number): x is number[] =>
  Array.isArray(x) && x.length === 81 && x.every((v) => Number.isInteger(v) && v >= 0 && v <= max);

/** Odczyt zapisu; cokolwiek niespójnego → null (zapis ignorowany). */
export function parseSave(raw: string | null): SudokuSave | null {
  if (!raw) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof o !== 'object' || o === null) return null;
  const s = o as Record<string, unknown>;
  if (s.v !== 1 || !DIFFICULTIES.includes(s.difficulty as Difficulty)) return null;
  if (typeof s.elapsed !== 'number' || !Number.isFinite(s.elapsed) || s.elapsed < 0) return null;
  const b = s.board as Record<string, unknown> | null;
  if (typeof b !== 'object' || b === null) return null;
  const { puzzle, solution, cells, notes } = b;
  if (!isGrid(puzzle, 9) || !isGrid(solution, 9) || !isGrid(cells, 9) || !isGrid(notes, ALL)) return null;
  if (!isSolved(solution)) return null;
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] !== 0 && (puzzle[i] !== solution[i] || cells[i] !== puzzle[i])) return null;
  }
  if (countSolutions(puzzle, 2) !== 1) return null;
  return {
    v: 1,
    difficulty: s.difficulty as Difficulty,
    board: { puzzle, solution, cells, notes },
    elapsed: s.elapsed,
  };
}

/** Czas jako mm:ss (minuty mogą przekroczyć 59). */
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
