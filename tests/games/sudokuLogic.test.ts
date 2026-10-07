import { describe, expect, it } from 'vitest';
import {
  CLUES,
  DIFFICULTY_SCORE,
  SUDOKU_SAVE_KEY,
  conflicts,
  countSolutions,
  digitCounts,
  eraseCell,
  formatTime,
  generateSolved,
  isSolved,
  isValidPlacement,
  makePuzzle,
  newBoard,
  parseSave,
  peersOf,
  placeDigit,
  serializeSave,
  solve,
  sudokuReward,
  toggleNote,
  type Difficulty,
  type Grid,
} from '../../src/games/sudokuLogic';

/** Deterministyczny generator liczb losowych do testów. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clues = (g: Grid) => g.filter((v) => v !== 0).length;

/** Poprawne rozwiązanie wzorcowe (przesunięcia wierszy). */
const PATTERN: Grid = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9);
  const c = i % 9;
  return ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
});

describe('generateSolved', () => {
  it('daje poprawnie wypełnioną planszę', () => {
    for (const seed of [1, 2, 3, 42]) {
      const g = generateSolved(mulberry32(seed));
      expect(g).toHaveLength(81);
      expect(g.every((v) => v >= 1 && v <= 9)).toBe(true);
      expect(isSolved(g)).toBe(true);
    }
  });

  it('ten sam rng → ta sama plansza, inny rng → inna', () => {
    expect(generateSolved(mulberry32(7))).toEqual(generateSolved(mulberry32(7)));
    expect(generateSolved(mulberry32(7))).not.toEqual(generateSolved(mulberry32(8)));
  });
});

describe('countSolutions / solve', () => {
  it('pełna poprawna plansza ma 1 rozwiązanie, pusta – co najmniej limit', () => {
    expect(countSolutions(PATTERN)).toBe(1);
    expect(countSolutions(Array(81).fill(0), 2)).toBe(2);
  });

  it('plansza ze sprzecznością ma 0 rozwiązań', () => {
    const g = Array(81).fill(0);
    g[0] = 5;
    g[1] = 5;
    expect(countSolutions(g)).toBe(0);
    expect(solve(g)).toBeNull();
  });

  it('solve odtwarza rozwiązanie', () => {
    const p = PATTERN.slice();
    for (const i of [0, 10, 20, 30, 40, 50, 60, 70, 80]) p[i] = 0;
    expect(solve(p)).toEqual(PATTERN);
  });
});

describe('makePuzzle', () => {
  const levels: Difficulty[] = ['easy', 'medium', 'hard'];

  it('łamigłówka ma dokładnie jedno rozwiązanie – to wylosowane', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const d of levels) {
        const rng = mulberry32(seed * 10 + d.length);
        const solved = generateSolved(rng);
        const puzzle = makePuzzle(solved, d, rng);
        expect(countSolutions(puzzle, 2)).toBe(1);
        expect(solve(puzzle)).toEqual(solved);
        puzzle.forEach((v, i) => {
          if (v !== 0) expect(v).toBe(solved[i]);
        });
      }
    }
  });

  it('liczba odkrytych pól zależy od poziomu', () => {
    expect(CLUES).toEqual({ easy: 40, medium: 32, hard: 26 });
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      const rng = mulberry32(seed);
      const solved = generateSolved(rng);
      expect(clues(makePuzzle(solved, 'easy', rng))).toBe(40);
      expect(clues(makePuzzle(solved, 'medium', rng))).toBe(32);
      const hard = clues(makePuzzle(solved, 'hard', rng));
      expect(hard).toBeGreaterThanOrEqual(26);
      expect(hard).toBeLessThanOrEqual(28);
    }
  });

  it('deterministyczna przy tym samym rng', () => {
    const a = makePuzzle(PATTERN, 'medium', mulberry32(99));
    const b = makePuzzle(PATTERN, 'medium', mulberry32(99));
    expect(a).toEqual(b);
  });

  it('trudna plansza powstaje szybko', () => {
    const rng = mulberry32(2026);
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) makePuzzle(generateSolved(rng), 'hard', rng);
    expect((performance.now() - t0) / 10).toBeLessThan(100);
  });
});

describe('isValidPlacement / conflicts / isSolved', () => {
  it('sprawdza wiersz, kolumnę i blok', () => {
    const g = Array(81).fill(0);
    g[0] = 5;
    expect(isValidPlacement(g, 8, 5)).toBe(false); // wiersz
    expect(isValidPlacement(g, 72, 5)).toBe(false); // kolumna
    expect(isValidPlacement(g, 20, 5)).toBe(false); // blok
    expect(isValidPlacement(g, 40, 5)).toBe(true);
    expect(isValidPlacement(g, 0, 5)).toBe(true); // samo pole się nie liczy
  });

  it('konflikty obejmują wszystkie powtórzone cyfry', () => {
    const g = Array(81).fill(0);
    g[0] = 3;
    g[4] = 3;
    g[10] = 3;
    g[80] = 3;
    g[40] = 7;
    expect([...conflicts(g)].sort((a, b) => a - b)).toEqual([0, 4, 10]);
    expect(conflicts(PATTERN).size).toBe(0);
  });

  it('isSolved: pełna i bez konfliktów', () => {
    expect(isSolved(PATTERN)).toBe(true);
    const partial = PATTERN.slice();
    partial[5] = 0;
    expect(isSolved(partial)).toBe(false);
    const wrong = PATTERN.slice();
    [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
    expect(isSolved(wrong)).toBe(false);
  });

  it('peersOf: 20 sąsiadów bez samego pola', () => {
    const p = peersOf(40);
    expect(p).toHaveLength(20);
    expect(p).not.toContain(40);
    expect(new Set(p).size).toBe(20);
  });
});

describe('plansza gracza', () => {
  const puzzle = PATTERN.map((v, i) => (i % 2 === 0 ? v : 0));

  it('placeDigit wpisuje cyfrę, nie rusza odkrytych pól', () => {
    const b = newBoard(puzzle, PATTERN);
    expect(b.cells).toEqual(puzzle);
    expect(placeDigit(b, 0, 9)).toBe(b);
    const b2 = placeDigit(b, 1, 4);
    expect(b2.cells[1]).toBe(4);
    expect(b.cells[1]).toBe(0);
  });

  it('ta sama cyfra drugi raz czyści pole', () => {
    const b = placeDigit(newBoard(puzzle, PATTERN), 1, 4);
    expect(placeDigit(b, 1, 4).cells[1]).toBe(0);
  });

  it('notatki: przełączanie, tylko w pustym polu, znikają po wpisaniu cyfry u sąsiadów', () => {
    let b = newBoard(puzzle, PATTERN);
    b = toggleNote(b, 1, 3);
    b = toggleNote(b, 1, 5);
    b = toggleNote(b, 3, 5);
    expect(b.notes[1]).toBe((1 << 2) | (1 << 4));
    expect(toggleNote(b, 0, 2)).toBe(b);
    b = toggleNote(b, 1, 3);
    expect(b.notes[1]).toBe(1 << 4);
    b = placeDigit(b, 5, 5); // ten sam wiersz co pola 1 i 3
    expect(b.notes[1]).toBe(0);
    expect(b.notes[3]).toBe(0);
    expect(toggleNote(b, 5, 1)).toBe(b);
    b = placeDigit(b, 1, 2);
    expect(b.notes[1]).toBe(0);
  });

  it('eraseCell czyści cyfrę i notatki, pomija odkryte pola', () => {
    let b = newBoard(puzzle, PATTERN);
    expect(eraseCell(b, 0)).toBe(b);
    expect(eraseCell(b, 1)).toBe(b);
    b = placeDigit(b, 1, 4);
    expect(eraseCell(b, 1).cells[1]).toBe(0);
    b = toggleNote(newBoard(puzzle, PATTERN), 3, 6);
    expect(eraseCell(b, 3).notes[3]).toBe(0);
  });

  it('digitCounts liczy wpisane cyfry', () => {
    const c = digitCounts(PATTERN);
    expect(c.slice(1)).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(digitCounts(Array(81).fill(0))[5]).toBe(0);
  });
});

describe('zapis w toku', () => {
  const puzzle = makePuzzle(PATTERN, 'easy', mulberry32(5));
  const given = puzzle.findIndex((v) => v !== 0);
  const [e1, e2] = puzzle.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  const save = () => ({
    v: 1 as const,
    difficulty: 'medium' as Difficulty,
    board: toggleNote(placeDigit(newBoard(puzzle, PATTERN), e1, PATTERN[e1]), e2, 7),
    elapsed: 65_000,
  });

  it('klucz gry', () => {
    expect(SUDOKU_SAVE_KEY).toBe('gabigochi.game.sudoku');
  });

  it('zapis i odczyt dają to samo', () => {
    const s = save();
    expect(parseSave(serializeSave(s))).toEqual(s);
  });

  it('uszkodzony zapis jest ignorowany', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{')).toBeNull();
    expect(parseSave('42')).toBeNull();
    const bad = (patch: (o: any) => void) => {
      const o = JSON.parse(serializeSave(save()));
      patch(o);
      return parseSave(JSON.stringify(o));
    };
    expect(bad((o) => (o.v = 2))).toBeNull();
    expect(bad((o) => (o.difficulty = 'insane'))).toBeNull();
    expect(bad((o) => (o.elapsed = -1))).toBeNull();
    expect(bad((o) => o.board.cells.pop())).toBeNull();
    expect(bad((o) => (o.board.cells[e1] = 10))).toBeNull();
    expect(bad((o) => (o.board.notes[e2] = 1024))).toBeNull();
    expect(bad((o) => (o.board.cells[given] = 0))).toBeNull(); // odkryte pole zmienione
    expect(bad((o) => (o.board.solution[0] = o.board.solution[1]))).toBeNull(); // złe rozwiązanie
    expect(bad((o) => (o.board.puzzle[e1] = PATTERN[e1] === 1 ? 2 : 1))).toBeNull(); // niezgodne z rozwiązaniem
    expect(bad((o) => (o.board.puzzle = Array(81).fill(0)))).toBeNull(); // niejednoznaczna
  });
});

describe('wynik i nagroda', () => {
  it('punkty za poziom', () => {
    expect(DIFFICULTY_SCORE).toEqual({ easy: 30, medium: 50, hard: 80 });
  });

  it('sudokuReward: monety = wynik, humor +15', () => {
    expect(sudokuReward(0)).toEqual({ coins: 0, moodBoost: 15 });
    expect(sudokuReward(30)).toEqual({ coins: 30, moodBoost: 15 });
    expect(sudokuReward(80)).toEqual({ coins: 80, moodBoost: 15 });
  });

  it('formatTime: mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65_400)).toBe('01:05');
    expect(formatTime(3_600_000 + 5_000)).toBe('60:05');
  });
});
