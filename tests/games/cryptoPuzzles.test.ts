import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  COLS,
  ROWS,
  START_REVEALED,
  isSolved,
  puzzleLetters,
  puzzleState,
  solutionNumbers,
} from '../../src/games/cryptoLogic';
import { PUZZLES } from '../../src/games/cryptoPuzzles';

/** Słowa planszy: ciągi ≥ 2 liter w wierszach i kolumnach. */
function words(grid: readonly string[]): string[] {
  const rows = grid.map((r) => [...r]);
  const lines = [...rows, ...Array.from({ length: COLS }, (_, c) => rows.map((r) => r[c]))];
  return lines.flatMap((line) => line.join('').split('#').filter((w) => [...w].length >= 2));
}

describe('zestaw plansz szyfrokrzyżówki', () => {
  it('40 plansz z unikalnymi id', () => {
    expect(PUZZLES).toHaveLength(40);
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(40);
  });

  it('siatka 9×9, tylko polskie litery i #, 18–26% zaczernionych pól', () => {
    for (const p of PUZZLES) {
      expect(p.grid, p.id).toHaveLength(ROWS);
      for (const row of p.grid) {
        expect([...row], p.id).toHaveLength(COLS);
        for (const ch of row) expect(ch === '#' || ALPHABET.includes(ch), `${p.id}: ${ch}`).toBe(true);
      }
      const blocks = puzzleLetters(p).filter((ch) => ch === null).length;
      expect(blocks / (ROWS * COLS), p.id).toBeGreaterThanOrEqual(0.18);
      expect(blocks / (ROWS * COLS), p.id).toBeLessThanOrEqual(0.26);
    }
  });

  it('każde białe pole leży w słowie w poziomie albo w pionie; słowa w planszy się nie powtarzają', () => {
    for (const p of PUZZLES) {
      const L = puzzleLetters(p);
      const white = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS && L[r * COLS + c] !== null;
      L.forEach((ch, i) => {
        if (ch === null) return;
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        expect(white(r, c - 1) || white(r, c + 1) || white(r - 1, c) || white(r + 1, c), `${p.id} pole ${i}`).toBe(true);
      });
      const ws = words(p.grid);
      expect(new Set(ws).size, p.id).toBe(ws.length);
    }
  });

  it('hasło 8–14 liter z liter planszy; słowa osobiste są w siatce', () => {
    for (const p of PUZZLES) {
      const letters = [...p.solution.replaceAll(' ', '')];
      expect(letters.length, p.id).toBeGreaterThanOrEqual(8);
      expect(letters.length, p.id).toBeLessThanOrEqual(14);
      expect(() => solutionNumbers(p, puzzleState(p)), p.id).not.toThrow();
      expect(p.personal.length, p.id).toBeGreaterThanOrEqual(1);
      for (const w of p.personal) expect(words(p.grid), `${p.id}: ${w}`).toContain(w);
    }
  });

  it('każda plansza startuje z START_REVEALED odkrytymi literami i nie jest rozwiązana', () => {
    for (const p of PUZZLES) {
      const s = puzzleState(p);
      expect(s.revealed.filter(Boolean), p.id).toHaveLength(START_REVEALED);
      expect(isSolved(s), p.id).toBe(false);
    }
  });

  it('40 haseł jest różnych', () => {
    expect(new Set(PUZZLES.map((p) => p.solution)).size).toBe(40);
  });
});
