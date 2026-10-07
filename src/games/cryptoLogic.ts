import type { Reward } from './types';

export type Rng = () => number;

/** Polski alfabet (32 litery, bez Q/V/X) — kolejność klawiatury. */
export const ALPHABET: readonly string[] = [...'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ'];
const ALPHABET_SET = new Set(ALPHABET);

export const GRID_SIZE = 11;
export const MIN_WORDS = 8;
export const MIN_PERSONAL = 2;
export const MAX_HINTS = 3;
const MAX_WORDS = 14;
const MAX_ATTEMPTS = 60;

export type Dir = 'across' | 'down';

export interface PlacedWord {
  word: string;
  row: number;
  col: number;
  dir: Dir;
  personal: boolean;
}

export interface Crossword {
  rows: number;
  cols: number;
  /** Litera albo null (pole puste), wierszami. */
  cells: (string | null)[];
  words: PlacedWord[];
}

export interface CryptoState {
  rows: number;
  cols: number;
  /** Liczba szyfru 1..N albo null (pole puste), wierszami. */
  cells: (number | null)[];
  /** `key[n - 1]` = litera zaszyfrowana liczbą n. */
  key: string[];
  /** `guesses[n - 1]` = litera wpisana przez gracza dla liczby n. */
  guesses: (string | null)[];
  /** `revealed[n - 1]` = liczba odkryta (na start lub podpowiedzią) — zablokowana. */
  revealed: boolean[];
  hints: number;
}

/** Deterministyczny generator (mulberry32). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Wielkie litery, tylko polski alfabet, długość w zakresie, bez powtórzeń (kolejność zachowana). */
export function normalizeWords(words: readonly string[], minLen = 3, maxLen = GRID_SIZE): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of words) {
    const w = raw.trim().toLocaleUpperCase('pl');
    const letters = [...w];
    if (letters.length < minLen || letters.length > maxLen) continue;
    if (!letters.every((ch) => ALPHABET_SET.has(ch))) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Układanie krzyżówki

interface Board {
  size: number;
  grid: string[]; // '' = puste
  across: Uint8Array;
  down: Uint8Array;
  byLetter: Map<string, number[]>;
  words: PlacedWord[];
}

function newBoard(size: number): Board {
  return {
    size,
    grid: Array<string>(size * size).fill(''),
    across: new Uint8Array(size * size),
    down: new Uint8Array(size * size),
    byLetter: new Map(),
    words: [],
  };
}

const step = (dir: Dir): [number, number] => (dir === 'across' ? [0, 1] : [1, 0]);

/** Liczba skrzyżowań przy poprawnym położeniu, -1 gdy słowa nie da się tu położyć. */
function canPlace(b: Board, L: string[], r: number, c: number, dir: Dir): number {
  const n = b.size;
  const [dr, dc] = step(dir);
  const endR = r + dr * (L.length - 1);
  const endC = c + dc * (L.length - 1);
  if (r < 0 || c < 0 || endR >= n || endC >= n) return -1;
  const filled = (rr: number, cc: number) => rr >= 0 && cc >= 0 && rr < n && cc < n && b.grid[rr * n + cc] !== '';
  if (filled(r - dr, c - dc) || filled(endR + dr, endC + dc)) return -1;
  const used = dir === 'across' ? b.across : b.down;
  let crossings = 0;
  for (let k = 0; k < L.length; k++) {
    const rr = r + dr * k;
    const cc = c + dc * k;
    const p = rr * n + cc;
    const ch = b.grid[p];
    if (ch) {
      if (ch !== L[k] || used[p]) return -1;
      crossings++;
    } else if (filled(rr + dc, cc + dr) || filled(rr - dc, cc - dr)) {
      return -1;
    }
  }
  if (crossings === 0 && b.words.length > 0) return -1;
  if (crossings === L.length) return -1;
  return crossings;
}

function place(b: Board, word: string, L: string[], r: number, c: number, dir: Dir, personal: boolean): void {
  const [dr, dc] = step(dir);
  const used = dir === 'across' ? b.across : b.down;
  for (let k = 0; k < L.length; k++) {
    const p = (r + dr * k) * b.size + c + dc * k;
    if (!b.grid[p]) {
      b.grid[p] = L[k];
      const list = b.byLetter.get(L[k]);
      if (list) list.push(p);
      else b.byLetter.set(L[k], [p]);
    }
    used[p] = 1;
  }
  b.words.push({ word, row: r, col: c, dir, personal });
}

/** Próbuje dołożyć słowo krzyżujące się z planszą; wybiera położenie z największą liczbą skrzyżowań. */
function tryAdd(b: Board, word: string, personal: boolean, rng: Rng): boolean {
  const L = [...word];
  let best: { r: number; c: number; dir: Dir; score: number } | null = null;
  for (let k = 0; k < L.length; k++) {
    const cells = b.byLetter.get(L[k]);
    if (!cells) continue;
    for (const p of cells) {
      const pr = Math.floor(p / b.size);
      const pc = p % b.size;
      for (const dir of ['across', 'down'] as const) {
        const [dr, dc] = step(dir);
        const r = pr - dr * k;
        const c = pc - dc * k;
        const crossings = canPlace(b, L, r, c, dir);
        if (crossings < 0) continue;
        const score = crossings + rng() * 0.9;
        if (!best || score > best.score) best = { r, c, dir, score };
      }
    }
  }
  if (!best) return false;
  place(b, word, L, best.r, best.c, best.dir, personal);
  return true;
}

function attempt(common: string[], personal: string[], rng: Rng, size: number): Board {
  const b = newBoard(size);
  const pers = shuffle(personal, rng);
  const firstIdx = Math.max(0, pers.findIndex((w) => [...w].length >= 5));
  const [first] = pers.splice(firstIdx, 1);
  if (first) {
    const L = [...first];
    const dir: Dir = rng() < 0.5 ? 'across' : 'down';
    const along = Math.floor((size - L.length) * (0.25 + rng() * 0.5));
    const across = Math.floor(size / 2) + Math.floor(rng() * 3) - 1;
    const [r, c] = dir === 'across' ? [across, along] : [along, across];
    place(b, first, L, r, c, dir, true);
  }
  const target = MIN_WORDS + 2 + Math.floor(rng() * (MAX_WORDS - MIN_WORDS - 1));
  const personalTarget = MIN_PERSONAL + (rng() < 0.5 ? 1 : 0);
  let personalCount = first ? 1 : 0;
  for (const w of pers) {
    if (personalCount >= personalTarget) break;
    if (tryAdd(b, w, true, rng)) personalCount++;
  }
  for (const w of shuffle(common, rng)) {
    if (b.words.length >= target) break;
    tryAdd(b, w, false, rng);
  }
  return b;
}

/** Przycina planszę do prostokąta otaczającego litery. */
function crop(b: Board): Crossword {
  const n = b.size;
  let minR = n, maxR = -1, minC = n, maxC = -1;
  b.grid.forEach((ch, p) => {
    if (!ch) return;
    const r = Math.floor(p / n);
    const c = p % n;
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  });
  if (maxR < 0) return { rows: 0, cols: 0, cells: [], words: [] };
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const cells: (string | null)[] = [];
  for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) cells.push(b.grid[r * n + c] || null);
  const words = b.words.map((w) => ({ ...w, row: w.row - minR, col: w.col - minC }));
  return { rows, cols, cells, words };
}

/**
 * Układa krzyżówkę: słowa poziomo i pionowo, każde kolejne krzyżuje się z już położonymi, bez
 * stykania się bokami; ≥ 8 słów, w tym ≥ 2 osobiste. Nieudane układy są odrzucane i ponawiane.
 */
export function buildCrossword(words: readonly string[], personal: readonly string[], rng: Rng, size = GRID_SIZE): Crossword {
  const pers = normalizeWords(personal, 3, size);
  const persSet = new Set(pers);
  const common = normalizeWords(words, 3, size).filter((w) => !persSet.has(w));
  const needPersonal = Math.min(MIN_PERSONAL, pers.length);
  let best: Board | null = null;
  const rank = (b: Board) => (b.words.filter((w) => w.personal).length >= needPersonal ? 1000 : 0) + b.words.length;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const b = attempt(common, pers, rng, size);
    const okPersonal = b.words.filter((w) => w.personal).length >= needPersonal;
    if (okPersonal && b.words.length >= MIN_WORDS) return crop(b);
    if (!best || rank(b) > rank(best)) best = b;
  }
  return crop(best!);
}

// ---------------------------------------------------------------------------
// Szyfr i rozgrywka

/** Losowe przypisanie liczb 1..N literom planszy; zwraca klucz (`key[n - 1]` = litera). */
export function cipher(cw: Crossword, rng: Rng): string[] {
  const letters = [...new Set(cw.cells.filter((c): c is string => !!c))].sort();
  return shuffle(letters, rng);
}

/** 2–3 liczby odkryte na start — wybierane spośród najczęstszych liter planszy. */
export function revealStart(cw: Crossword, key: string[], rng: Rng): number[] {
  const count = Math.min(key.length, 2 + (rng() < 0.5 ? 1 : 0));
  const freq = new Map<string, number>();
  for (const ch of cw.cells) if (ch) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const byFreq = [...key].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || a.localeCompare(b, 'pl'));
  const pool = byFreq.slice(0, Math.max(count, Math.ceil(key.length / 3)));
  return shuffle(pool, rng)
    .slice(0, count)
    .map((ch) => key.indexOf(ch) + 1);
}

export function createPuzzle(cw: Crossword, rng: Rng): CryptoState {
  const key = cipher(cw, rng);
  const shown = new Set(revealStart(cw, key, rng));
  return {
    rows: cw.rows,
    cols: cw.cols,
    cells: cw.cells.map((ch) => (ch ? key.indexOf(ch) + 1 : null)),
    key,
    guesses: key.map((ch, i) => (shown.has(i + 1) ? ch : null)),
    revealed: key.map((_, i) => shown.has(i + 1)),
    hints: 0,
  };
}

export function newPuzzle(common: readonly string[], personal: readonly string[], rng: Rng): CryptoState {
  return createPuzzle(buildCrossword(common, personal, rng), rng);
}

/**
 * Wpisuje literę dla liczby n (czyli we wszystkie pola z tą liczbą); `null` = gumka. Jeśli litera
 * była już wpisana przy innej liczbie, zostaje przeniesiona. Liczby odkryte są zablokowane, a litery
 * odkryte nie mogą trafić gdzie indziej — wtedy stan bez zmian (ta sama referencja).
 */
export function applyGuess(s: CryptoState, n: number, letter: string | null): CryptoState {
  const i = n - 1;
  if (!Number.isInteger(n) || i < 0 || i >= s.key.length || s.revealed[i]) return s;
  if (letter !== null && !ALPHABET_SET.has(letter)) return s;
  if (s.guesses[i] === letter) return s;
  const guesses = [...s.guesses];
  if (letter !== null) {
    const j = guesses.indexOf(letter);
    if (j >= 0) {
      if (s.revealed[j]) return s;
      guesses[j] = null;
    }
  }
  guesses[i] = letter;
  return { ...s, guesses };
}

export function isSolved(s: CryptoState): boolean {
  return s.key.every((ch, i) => s.guesses[i] === ch);
}

/** Liczba z błędną lub brakującą literą — kandydaci do podpowiedzi. */
export function unsolvedNumbers(s: CryptoState): number[] {
  return s.key.flatMap((ch, i) => (s.revealed[i] || s.guesses[i] === ch ? [] : [i + 1]));
}

/** Podpowiedź: odkrywa liczbę `prefer` (jeśli nierozwiązana) albo losową nierozwiązaną. Max 3. */
export function hint(s: CryptoState, rng: Rng, prefer?: number): CryptoState {
  if (s.hints >= MAX_HINTS) return s;
  const open = unsolvedNumbers(s);
  if (!open.length) return s;
  const n = prefer !== undefined && open.includes(prefer) ? prefer : open[Math.floor(rng() * open.length)];
  const i = n - 1;
  const letter = s.key[i];
  const guesses = s.guesses.map((g) => (g === letter ? null : g));
  guesses[i] = letter;
  const revealed = [...s.revealed];
  revealed[i] = true;
  return { ...s, guesses, revealed, hints: s.hints + 1 };
}

export function cryptoScore(hints: number): number {
  return Math.max(30, 60 - 10 * hints);
}

export function cryptoReward(score: number): Reward {
  return { coins: score, moodBoost: 15 };
}

// ---------------------------------------------------------------------------
// Zapis w toku

export const SAVE_KEY = 'gabigochi.game.crypto';

export function serializeSave(s: CryptoState): string {
  return JSON.stringify({ v: 1, state: s });
}

const isInt = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** Odczyt zapisu (obiekt albo JSON). Uszkodzony, niepełny lub już rozwiązany → null. */
export function parseSave(raw: unknown): CryptoState | null {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const { v, state } = data as { v?: unknown; state?: unknown };
  if (v !== 1 || !state || typeof state !== 'object') return null;
  const s = state as Record<string, unknown>;
  const { rows, cols, cells, key, guesses, revealed, hints } = s;
  if (!isInt(rows, 1, GRID_SIZE) || !isInt(cols, 1, GRID_SIZE)) return null;
  if (!Array.isArray(key) || key.length < 1 || key.length > ALPHABET.length) return null;
  if (!key.every((ch) => typeof ch === 'string' && ALPHABET_SET.has(ch)) || new Set(key).size !== key.length) return null;
  const N = key.length;
  if (!Array.isArray(cells) || cells.length !== rows * cols) return null;
  if (!cells.every((c) => c === null || isInt(c, 1, N))) return null;
  const present = new Set(cells.filter((c) => c !== null));
  if (present.size !== N) return null;
  if (!Array.isArray(guesses) || guesses.length !== N) return null;
  if (!guesses.every((g) => g === null || (typeof g === 'string' && ALPHABET_SET.has(g)))) return null;
  const nonNull = guesses.filter((g) => g !== null);
  if (new Set(nonNull).size !== nonNull.length) return null;
  if (!Array.isArray(revealed) || revealed.length !== N || !revealed.every((r) => typeof r === 'boolean')) return null;
  if (!revealed.every((r, i) => !r || guesses[i] === key[i])) return null;
  if (!isInt(hints, 0, MAX_HINTS)) return null;
  const result: CryptoState = {
    rows,
    cols,
    cells: cells as (number | null)[],
    key: key as string[],
    guesses: guesses as (string | null)[],
    revealed: revealed as boolean[],
    hints,
  };
  return isSolved(result) ? null : result;
}
