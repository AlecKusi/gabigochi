import type { Reward } from './types';

export type Rng = () => number;

/** Polski alfabet (32 litery, bez Q/V/X) — kolejność klawiatury. */
export const ALPHABET: readonly string[] = [...'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ'];
const ALPHABET_SET = new Set(ALPHABET);

export const MAX_HINTS = 3;

export interface CryptoState {
  /** Plansza z zestawu (`Puzzle.id`). */
  id: string;
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

// ---------------------------------------------------------------------------
// Szyfr i rozgrywka

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
// Plansze gazetowe (gotowy zestaw z tools/make_crypto.py)

export const ROWS = 9;
export const COLS = 9;
/** Ile liter jest odkrytych na start. */
export const START_REVEALED = 4;
/** Lista rozwiązanych plansz i numer obrotu zestawu (osobno od trwającej planszy). */
export const PROGRESS_KEY = 'gabigochi.game.cryptoSolved';

/** Plansza z `cryptoPuzzles.json`: 9 wierszy po 9 znaków (`#` — zaczernione pole), hasło, słowa osobiste. */
export interface Puzzle {
  id: string;
  grid: readonly string[];
  solution: string;
  personal: readonly string[];
}

/** Ziarno losowania liczb planszy z jej `id` (FNV-1a) — ta sama plansza ma zawsze te same liczby. */
export function seedOf(id: string): number {
  let h = 0x811c9dc5;
  for (const ch of id) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Litery planszy wierszami; zaczernione pole — null. */
export function puzzleLetters(p: Puzzle): (string | null)[] {
  return p.grid.flatMap((row) => [...row].map((ch) => (ch === '#' ? null : ch)));
}

/** Liczby odkryte na start: 2 spośród 4 najczęstszych liter planszy i 2 losowe ze środka listy częstości. */
export function startNumbers(letters: readonly (string | null)[], key: readonly string[], rng: Rng): number[] {
  const freq = new Map<string, number>();
  for (const ch of letters) if (ch) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const byFreq = [...key].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || (a < b ? -1 : a > b ? 1 : 0));
  const top = shuffle(byFreq.slice(0, 4), rng).slice(0, 2);
  const middle = shuffle(byFreq.slice(4, Math.max(6, Math.ceil(byFreq.length * 0.6))), rng).slice(0, Math.max(0, START_REVEALED - 2));
  return [...top, ...middle].map((ch) => key.indexOf(ch) + 1);
}

/** Stan nowej planszy: liczby 1..N losowane z ziarnem `id`, `START_REVEALED` liter odkrytych. */
export function puzzleState(p: Puzzle): CryptoState {
  const rng = seededRng(seedOf(p.id));
  const letters = puzzleLetters(p);
  const key = shuffle([...new Set(letters.filter((c): c is string => c !== null))].sort(), rng);
  const shown = new Set(startNumbers(letters, key, rng));
  return {
    id: p.id,
    rows: ROWS,
    cols: COLS,
    cells: letters.map((ch) => (ch === null ? null : key.indexOf(ch) + 1)),
    key,
    guesses: key.map((ch, i) => (shown.has(i + 1) ? ch : null)),
    revealed: key.map((_, i) => shown.has(i + 1)),
    hints: 0,
  };
}

/** „Sprawdź”: liczby z wpisaną błędną literą (puste się nie liczą). */
export function wrongNumbers(s: CryptoState): number[] {
  return s.key.flatMap((ch, i) => (s.guesses[i] !== null && s.guesses[i] !== ch ? [i + 1] : []));
}

/** Hasło jako liczby (null — przerwa między słowami). Litera hasła spoza planszy to błąd danych. */
export function solutionNumbers(p: Puzzle, s: CryptoState): (number | null)[] {
  return [...p.solution].map((ch) => {
    if (ch === ' ') return null;
    const n = s.key.indexOf(ch) + 1;
    if (n === 0) throw new Error(`Litera hasła ${ch} spoza planszy ${p.id}`);
    return n;
  });
}

/** Postęp w zestawie: numer obrotu (kolejność plansz) i rozwiązane plansze. */
export interface Progress {
  round: number;
  solved: string[];
}

export function readProgress(raw: unknown): Progress {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { round: 0, solved: [] };
    }
  }
  if (!data || typeof data !== 'object') return { round: 0, solved: [] };
  const { round, solved } = data as { round?: unknown; solved?: unknown };
  return {
    round: Number.isInteger(round) && (round as number) >= 0 ? (round as number) : 0,
    solved: Array.isArray(solved) ? [...new Set(solved.filter((x): x is string => typeof x === 'string'))] : [],
  };
}

export function markSolved(pr: Progress, id: string): Progress {
  return pr.solved.includes(id) ? pr : { ...pr, solved: [...pr.solved, id] };
}

/** Kolejność plansz w danym obrocie (każdy obrót inaczej potasowany). */
export function puzzleOrder(puzzles: readonly Puzzle[], round: number): Puzzle[] {
  return shuffle(puzzles, seededRng(1000 + round));
}

/**
 * Następna plansza: pierwsza nierozwiązana w kolejności obrotu. Gdy `skip` (porzucona plansza) jest wśród
 * nierozwiązanych — następna nierozwiązana PO nim, z przejściem na początek (chyba że to jedyna nierozwiązana).
 * Gdy wszystkie są rozwiązane — nowy obrót (inna kolejność, pusta lista).
 */
export function nextPuzzle(puzzles: readonly Puzzle[], pr: Progress, skip?: string): { puzzle: Puzzle; progress: Progress } {
  if (puzzles.length === 0) throw new Error('Pusty zestaw plansz');
  const done = new Set(pr.solved);
  let progress = pr;
  let open = puzzleOrder(puzzles, pr.round).filter((p) => !done.has(p.id));
  if (open.length === 0) {
    progress = { round: pr.round + 1, solved: [] };
    open = puzzleOrder(puzzles, progress.round);
  }
  const k = skip === undefined ? -1 : open.findIndex((p) => p.id === skip);
  return { puzzle: k >= 0 && open.length > 1 ? open[(k + 1) % open.length] : open[0], progress };
}

/** Zapis trwającej planszy (format 2: plansza z zestawu + wpisane litery). */
export function writePuzzleSave(s: CryptoState): string {
  return JSON.stringify({ v: 2, id: s.id, guesses: s.guesses, revealed: s.revealed, hints: s.hints });
}

/** Odczyt zapisu formatu 2. Stary format, uszkodzony, nieznana plansza albo już rozwiązana → null. */
export function readPuzzleSave(raw: unknown, puzzles: readonly Puzzle[]): CryptoState | null {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const { v, id, guesses, revealed, hints } = data as Record<string, unknown>;
  if (v !== 2 || typeof id !== 'string') return null;
  const puzzle = puzzles.find((p) => p.id === id);
  if (!puzzle) return null;
  const base = puzzleState(puzzle);
  const n = base.key.length;
  if (!Array.isArray(guesses) || guesses.length !== n) return null;
  if (!guesses.every((g) => g === null || (typeof g === 'string' && ALPHABET_SET.has(g)))) return null;
  const typed = guesses.filter((g) => g !== null);
  if (new Set(typed).size !== typed.length) return null;
  if (!Array.isArray(revealed) || revealed.length !== n || !revealed.every((r) => typeof r === 'boolean')) return null;
  if (!revealed.every((r, i) => !r || guesses[i] === base.key[i])) return null;
  if (!base.revealed.every((r, i) => !r || revealed[i])) return null;
  if (!Number.isInteger(hints) || (hints as number) < 0 || (hints as number) > MAX_HINTS) return null;
  if (revealed.filter(Boolean).length !== base.revealed.filter(Boolean).length + (hints as number)) return null;
  const s: CryptoState = { ...base, guesses: guesses as (string | null)[], revealed: revealed as boolean[], hints: hints as number };
  return isSolved(s) ? null : s;
}

// ---------------------------------------------------------------------------
// Zapis w toku

export const SAVE_KEY = 'gabigochi.game.crypto';
