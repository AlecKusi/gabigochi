import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  GRID_SIZE,
  MAX_HINTS,
  MIN_PERSONAL,
  MIN_WORDS,
  applyGuess,
  buildCrossword,
  cipher,
  createPuzzle,
  cryptoReward,
  cryptoScore,
  hint,
  isSolved,
  normalizeWords,
  parseSave,
  revealStart,
  seededRng,
  type Crossword,
  type CryptoState,
} from '../../src/games/cryptoLogic';
import { COMMON_WORDS, PERSONAL_WORDS } from '../../src/games/cryptoWords';

const SEEDS = Array.from({ length: 25 }, (_, i) => i * 7919 + 1);

const at = (cw: Crossword, r: number, c: number) => cw.cells[r * cw.cols + c];

function readWord(cw: Crossword, w: Crossword['words'][number]): string {
  const [dr, dc] = w.dir === 'across' ? [0, 1] : [1, 0];
  let s = '';
  for (let k = 0; k < [...w.word].length; k++) s += at(cw, w.row + dr * k, w.col + dc * k) ?? '?';
  return s;
}

/** Wszystkie maksymalne ciągi liter (≥ 2) w wierszach i kolumnach. */
function runs(cw: Crossword): string[] {
  const out: string[] = [];
  const scan = (len1: number, len2: number, get: (a: number, b: number) => string | null, dir: string) => {
    for (let a = 0; a < len1; a++) {
      let start = -1;
      for (let b = 0; b <= len2; b++) {
        const ch = b < len2 ? get(a, b) : null;
        if (ch && start < 0) start = b;
        if (!ch && start >= 0) {
          if (b - start >= 2) out.push(`${dir}:${dir === 'across' ? a : start}:${dir === 'across' ? start : a}`);
          start = -1;
        }
      }
    }
  };
  scan(cw.rows, cw.cols, (r, c) => at(cw, r, c), 'across');
  scan(cw.cols, cw.rows, (c, r) => at(cw, r, c), 'down');
  return out.sort();
}

describe('normalizeWords', () => {
  it('wielkie litery, bez duplikatów, bez Q/V/X i spoza zakresu długości', () => {
    expect(normalizeWords(['kot', 'KOT', 'xero', 'Vat', 'ab', 'żółw', 'DZIEWIĘĆDZIESIĄT'], 3, 11)).toEqual(['KOT', 'ŻÓŁW']);
  });
});

describe('listy słów', () => {
  it('ok. 300 popularnych słów 3–9 liter, tylko polski alfabet, bez powtórzeń', () => {
    const norm = normalizeWords(COMMON_WORDS, 3, 9);
    expect(norm.length).toBe(COMMON_WORDS.length);
    expect(COMMON_WORDS.length).toBeGreaterThanOrEqual(280);
  });

  it('alfabet ma 32 litery z polskimi znakami', () => {
    expect(ALPHABET).toHaveLength(32);
    for (const ch of 'ĄĆĘŁŃÓŚŹŻ') expect(ALPHABET).toContain(ch);
    for (const ch of 'QVX') expect(ALPHABET).not.toContain(ch);
  });

  it('słowa osobiste istnieją', () => {
    expect(normalizeWords(PERSONAL_WORDS, 3, GRID_SIZE).length).toBeGreaterThanOrEqual(MIN_PERSONAL);
  });
});

describe('buildCrossword', () => {
  const personal = normalizeWords(PERSONAL_WORDS, 3, GRID_SIZE);
  const boards = SEEDS.map((seed) => buildCrossword(COMMON_WORDS, PERSONAL_WORDS, seededRng(seed)));

  it('mieści się w siatce 11×11, ≥ 8 słów, ≥ 2 osobiste', () => {
    for (const cw of boards) {
      expect(cw.rows).toBeLessThanOrEqual(GRID_SIZE);
      expect(cw.cols).toBeLessThanOrEqual(GRID_SIZE);
      expect(cw.cells).toHaveLength(cw.rows * cw.cols);
      expect(cw.words.length).toBeGreaterThanOrEqual(MIN_WORDS);
      const pers = cw.words.filter((w) => w.personal);
      expect(pers.length).toBeGreaterThanOrEqual(MIN_PERSONAL);
      for (const w of pers) expect(personal).toContain(w.word);
    }
  });

  it('każde słowo odczytywalne z siatki, pochodzi z list i występuje raz', () => {
    const all = new Set([...normalizeWords(COMMON_WORDS, 3, GRID_SIZE), ...personal]);
    for (const cw of boards) {
      for (const w of cw.words) {
        expect(readWord(cw, w)).toBe(w.word);
        expect(all.has(w.word)).toBe(true);
      }
      expect(new Set(cw.words.map((w) => w.word)).size).toBe(cw.words.length);
    }
  });

  it('brak stykających się słów: każdy ciąg liter ≥ 2 to dokładnie jedno ułożone słowo', () => {
    for (const cw of boards) {
      const placed = cw.words.map((w) => `${w.dir}:${w.row}:${w.col}`).sort();
      expect(runs(cw)).toEqual(placed);
    }
  });

  it('słowa się krzyżują: litery tworzą jedną spójną planszę, każda kratka należy do słowa', () => {
    for (const cw of boards) {
      const filled = cw.cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
      const seen = new Set<number>([filled[0]]);
      const stack = [filled[0]];
      while (stack.length) {
        const p = stack.pop()!;
        const r = Math.floor(p / cw.cols);
        const c = p % cw.cols;
        for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
          if (nr < 0 || nc < 0 || nr >= cw.rows || nc >= cw.cols) continue;
          const q = nr * cw.cols + nc;
          if (cw.cells[q] && !seen.has(q)) {
            seen.add(q);
            stack.push(q);
          }
        }
      }
      expect(seen.size).toBe(filled.length);
      // każde słowo poza pierwszym ma co najmniej jedno skrzyżowanie
      const owners = new Map<number, number>();
      for (const w of cw.words) {
        const [dr, dc] = w.dir === 'across' ? [0, 1] : [1, 0];
        for (let k = 0; k < w.word.length; k++) {
          const p = (w.row + dr * k) * cw.cols + w.col + dc * k;
          owners.set(p, (owners.get(p) ?? 0) + 1);
        }
      }
      for (const p of filled) expect(owners.get(p)).toBeGreaterThanOrEqual(1);
      for (const w of cw.words) {
        const [dr, dc] = w.dir === 'across' ? [0, 1] : [1, 0];
        let crossings = 0;
        for (let k = 0; k < w.word.length; k++) if (owners.get((w.row + dr * k) * cw.cols + w.col + dc * k) === 2) crossings++;
        expect(crossings).toBeGreaterThanOrEqual(1);
      }
      // ramka przycięta do liter
      expect(cw.cells.slice(0, cw.cols).some(Boolean)).toBe(true);
      expect(cw.cells.slice(-cw.cols).some(Boolean)).toBe(true);
    }
  });

  it('deterministyczny przy tym samym ziarnie', () => {
    const a = buildCrossword(COMMON_WORDS, PERSONAL_WORDS, seededRng(42));
    const b = buildCrossword(COMMON_WORDS, PERSONAL_WORDS, seededRng(42));
    expect(a).toEqual(b);
    const c = buildCrossword(COMMON_WORDS, PERSONAL_WORDS, seededRng(43));
    expect(c).not.toEqual(a);
  });

  it('obsługuje polskie litery jako osobne znaki', () => {
    const cw = buildCrossword(['ŻÓŁW', 'ŁÓDŹ', 'ŚWIAT', 'GĘŚ', 'MIĘSO', 'KOŃ', 'DŹWIG', 'RĘKA', 'WĄŻ', 'ŻABA', 'ŁĄKA', 'ŚLIMAK', 'ŻÓŁTKO', 'MĄKA', 'SÓL'], ['ŻÓŁTKO', 'ŚWIEŻE', 'ŁÓŻKO'], seededRng(5));
    for (const w of cw.words) expect(readWord(cw, w)).toBe(w.word);
    expect(cw.cells.some((c) => c && 'ĄĆĘŁŃÓŚŹŻ'.includes(c))).toBe(true);
  });

  it('szybki: średnio poniżej 30 ms na planszę', () => {
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) buildCrossword(COMMON_WORDS, PERSONAL_WORDS, seededRng(1000 + i));
    expect((performance.now() - t0) / 40).toBeLessThan(30);
  });
});

describe('cipher i revealStart', () => {
  const cw = buildCrossword(COMMON_WORDS, PERSONAL_WORDS, seededRng(7));
  const letters = new Set(cw.cells.filter((c): c is string => !!c));

  it('bijekcja: każda litera planszy ma jedną liczbę 1..N i odwrotnie', () => {
    const key = cipher(cw, seededRng(1));
    expect(key).toHaveLength(letters.size);
    expect(new Set(key)).toEqual(letters);
  });

  it('2–3 odkryte liczby na start, różne, z zakresu', () => {
    for (const seed of SEEDS) {
      const key = cipher(cw, seededRng(seed));
      const nums = revealStart(cw, key, seededRng(seed));
      expect(nums.length).toBeGreaterThanOrEqual(2);
      expect(nums.length).toBeLessThanOrEqual(3);
      expect(new Set(nums).size).toBe(nums.length);
      for (const n of nums) expect(n >= 1 && n <= key.length).toBe(true);
    }
  });

  it('createPuzzle: liczby w polach zgodne z kluczem, odkryte litery wpisane', () => {
    const s = createPuzzle(cw, seededRng(3));
    cw.cells.forEach((ch, i) => {
      if (ch) expect(s.key[s.cells[i]! - 1]).toBe(ch);
      else expect(s.cells[i]).toBeNull();
    });
    const rev = s.revealed.filter(Boolean).length;
    expect(rev).toBeGreaterThanOrEqual(2);
    s.revealed.forEach((r, i) => expect(s.guesses[i]).toBe(r ? s.key[i] : null));
    expect(s.hints).toBe(0);
    expect(isSolved(s)).toBe(false);
  });
});

function tiny(): CryptoState {
  // plansza „KOT” – liczby: K=1, O=2, T=3; 2 odkryte
  return {
    rows: 1,
    cols: 3,
    cells: [1, 2, 3],
    key: ['K', 'O', 'T'],
    guesses: [null, 'O', null],
    revealed: [false, true, false],
    hints: 0,
  };
}

describe('applyGuess', () => {
  it('wpisuje literę dla liczby (wszystkie pola z tą liczbą)', () => {
    const s = applyGuess(tiny(), 1, 'K');
    expect(s.guesses).toEqual(['K', 'O', null]);
  });

  it('litera użyta przy innej liczbie zostaje przeniesiona', () => {
    let s = applyGuess(tiny(), 1, 'A');
    s = applyGuess(s, 3, 'A');
    expect(s.guesses).toEqual([null, 'O', 'A']);
  });

  it('nie zmienia odkrytej liczby ani nie przyjmuje litery odkrytej gdzie indziej', () => {
    const t = tiny();
    expect(applyGuess(t, 2, 'A')).toBe(t);
    expect(applyGuess(t, 1, 'O')).toBe(t);
  });

  it('gumka czyści, nieznana litera i zła liczba ignorowane', () => {
    const s = applyGuess(applyGuess(tiny(), 1, 'K'), 1, null);
    expect(s.guesses[0]).toBeNull();
    const t = tiny();
    expect(applyGuess(t, 1, 'Q')).toBe(t);
    expect(applyGuess(t, 9, 'A')).toBe(t);
  });

  it('nie mutuje stanu wejściowego', () => {
    const t = tiny();
    applyGuess(t, 1, 'K');
    expect(t.guesses).toEqual([null, 'O', null]);
  });
});

describe('isSolved', () => {
  it('rozwiązana, gdy wszystkie liczby mają poprawne litery', () => {
    let s = applyGuess(tiny(), 1, 'K');
    expect(isSolved(s)).toBe(false);
    s = applyGuess(s, 3, 'T');
    expect(isSolved(s)).toBe(true);
    expect(isSolved(applyGuess(s, 3, 'A'))).toBe(false);
  });
});

describe('hint', () => {
  it('odkrywa wskazaną liczbę, przenosząc literę z błędnej', () => {
    let s = applyGuess(tiny(), 3, 'K');
    s = hint(s, seededRng(1), 1);
    expect(s.guesses).toEqual(['K', 'O', null]);
    expect(s.revealed).toEqual([true, true, false]);
    expect(s.hints).toBe(1);
  });

  it('bez wskazania odkrywa losową nierozwiązaną; maksymalnie 3', () => {
    const big: CryptoState = {
      rows: 1,
      cols: 6,
      cells: [1, 2, 3, 4, 5, 6],
      key: ['A', 'B', 'C', 'D', 'E', 'F'],
      guesses: [null, null, null, null, null, null],
      revealed: [false, false, false, false, false, false],
      hints: 0,
    };
    let s = big;
    for (let i = 0; i < MAX_HINTS; i++) s = hint(s, seededRng(i + 1));
    expect(s.hints).toBe(MAX_HINTS);
    expect(s.revealed.filter(Boolean)).toHaveLength(MAX_HINTS);
    expect(hint(s, seededRng(9))).toBe(s);
  });

  it('wskazana liczba już odkryta → losuje inną', () => {
    const s = hint(tiny(), seededRng(2), 2);
    expect(s.revealed.filter(Boolean)).toHaveLength(2);
    expect(s.revealed[1]).toBe(true);
  });
});

describe('wynik i nagroda', () => {
  it('60 minus 10 za podpowiedź, min 30', () => {
    expect(cryptoScore(0)).toBe(60);
    expect(cryptoScore(1)).toBe(50);
    expect(cryptoScore(3)).toBe(30);
    expect(cryptoScore(5)).toBe(30);
  });

  it('cryptoReward: monety = wynik, humor +15', () => {
    expect(cryptoReward(60)).toEqual({ coins: 60, moodBoost: 15 });
    expect(cryptoReward(30)).toEqual({ coins: 30, moodBoost: 15 });
    expect(cryptoReward(0)).toEqual({ coins: 0, moodBoost: 15 });
  });
});

describe('parseSave', () => {
  const good = createPuzzle(buildCrossword(COMMON_WORDS, PERSONAL_WORDS, seededRng(11)), seededRng(11));

  it('przyjmuje poprawny zapis (także jako JSON)', () => {
    expect(parseSave(JSON.parse(JSON.stringify({ v: 1, state: good })))).toEqual(good);
    expect(parseSave(JSON.stringify({ v: 1, state: good }))).toEqual(good);
  });

  it('odrzuca uszkodzone zapisy', () => {
    const bad = (patch: Partial<CryptoState>) => parseSave({ v: 1, state: { ...good, ...patch } });
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{nie json')).toBeNull();
    expect(parseSave({ v: 2, state: good })).toBeNull();
    expect(bad({ rows: 0 })).toBeNull();
    expect(bad({ cells: good.cells.slice(1) })).toBeNull();
    expect(bad({ key: [...good.key.slice(1), good.key[0], 'A'] })).toBeNull();
    expect(bad({ key: good.key.map(() => 'A') })).toBeNull();
    expect(bad({ guesses: good.guesses.map(() => 'Q') })).toBeNull();
    expect(bad({ revealed: good.revealed.map(() => 'tak' as unknown as boolean) })).toBeNull();
    expect(bad({ hints: 7 })).toBeNull();
    expect(bad({ cells: good.cells.map((c) => (c ? 999 : c)) })).toBeNull();
  });

  it('odrzuca planszę już rozwiązaną', () => {
    expect(parseSave({ v: 1, state: { ...good, guesses: [...good.key] } })).toBeNull();
  });
});
