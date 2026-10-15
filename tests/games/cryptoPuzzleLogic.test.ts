import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  COLS,
  MAX_HINTS,
  ROWS,
  START_REVEALED,
  applyGuess,
  cryptoReward,
  cryptoScore,
  hint,
  isSolved,
  markSolved,
  nextPuzzle,
  puzzleLetters,
  puzzleOrder,
  puzzleState,
  readProgress,
  readPuzzleSave,
  seedOf,
  solutionNumbers,
  unsolvedNumbers,
  wrongNumbers,
  writePuzzleSave,
  type Puzzle,
} from '../../src/games/cryptoLogic';

/** Plansza testowa (słowa nie muszą być prawdziwe — logika liczy tylko litery i czarne pola). */
const GRID = ['KOT#MAMA#', 'O#OLA#ALE', 'TATA#KURA', '#LAS#OKO#', 'PIES#RAK#', 'A#ULE#BAL', 'NOS#DOM#Y', 'IGŁA#ŻUK#', 'E#ŁÓDŹ#OS'];
const P1: Puzzle = { id: 't1', grid: GRID, solution: 'KOT ALA', personal: ['KOT'] };
const P2: Puzzle = { ...P1, id: 't2' };
const P3: Puzzle = { ...P1, id: 't3' };
const freeLetter = (key: readonly string[]) => ALPHABET.find((ch) => !key.includes(ch))!;

describe('plansza gazetowa: stan na start', () => {
  it('litery wierszami, zaczernione pola jako null', () => {
    const L = puzzleLetters(P1);
    expect(L).toHaveLength(ROWS * COLS);
    expect(L[0]).toBe('K');
    expect(L[3]).toBeNull();
    expect(L.filter((c) => c === null)).toHaveLength(GRID.join('').split('#').length - 1);
  });

  it('ta sama plansza ma zawsze te same liczby; liczba w polu to jego litera w kluczu', () => {
    const a = puzzleState(P1);
    expect(puzzleState(P1)).toEqual(a);
    expect(a).toMatchObject({ id: 't1', rows: ROWS, cols: COLS, hints: 0 });
    expect(new Set(a.key).size).toBe(a.key.length);
    expect(a.key.length).toBe(new Set(puzzleLetters(P1).filter(Boolean)).size);
    puzzleLetters(P1).forEach((ch, i) => {
      if (ch === null) expect(a.cells[i]).toBeNull();
      else expect(a.key[a.cells[i]! - 1]).toBe(ch);
    });
    expect(puzzleState(P2).key).not.toEqual(a.key);
  });

  it('na start 4 odkryte litery, w tym co najmniej 2 spośród czterech najczęstszych', () => {
    const s = puzzleState(P1);
    const shown = s.key.filter((_, i) => s.revealed[i]);
    expect(shown).toHaveLength(START_REVEALED);
    s.revealed.forEach((r, i) => expect(s.guesses[i]).toBe(r ? s.key[i] : null));
    const freq = new Map<string, number>();
    for (const ch of puzzleLetters(P1)) if (ch) freq.set(ch, (freq.get(ch) ?? 0) + 1);
    const top4 = [...freq.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 4).map(([ch]) => ch);
    expect(shown.filter((ch) => top4.includes(ch)).length).toBeGreaterThanOrEqual(2);
  });

  it('ziarno z id: stałe dla id, różne dla różnych id', () => {
    expect(seedOf('p01')).toBe(seedOf('p01'));
    expect(seedOf('p01')).not.toBe(seedOf('p02'));
  });
});

describe('plansza gazetowa: wpisywanie, Sprawdź, podpowiedzi, hasło', () => {
  it('litera trafia do liczby; ta sama litera przy innej liczbie przenosi się; odkrytych nie da się zmienić', () => {
    const s0 = puzzleState(P1);
    const [a, b] = unsolvedNumbers(s0);
    const free = freeLetter(s0.key);
    const s1 = applyGuess(s0, a, free);
    expect(s1.guesses[a - 1]).toBe(free);
    const s2 = applyGuess(s1, b, free);
    expect(s2.guesses[a - 1]).toBeNull();
    expect(s2.guesses[b - 1]).toBe(free);
    const given = s0.revealed.indexOf(true) + 1;
    expect(applyGuess(s0, given, free)).toBe(s0);
    expect(applyGuess(s0, a, s0.key[given - 1])).toBe(s0);
    expect(applyGuess(s1, a, null).guesses[a - 1]).toBeNull();
  });

  it('Sprawdź: tylko liczby z błędną literą (puste i dobre się nie liczą)', () => {
    let s = puzzleState(P1);
    const [a, b] = unsolvedNumbers(s);
    s = applyGuess(s, a, freeLetter(s.key));
    s = applyGuess(s, b, s.key[b - 1]);
    expect(wrongNumbers(s)).toEqual([a]);
  });

  it('wygrana, gdy każda liczba ma swoją literę', () => {
    let s = puzzleState(P1);
    expect(isSolved(s)).toBe(false);
    for (const n of unsolvedNumbers(s)) s = applyGuess(s, n, s.key[n - 1]);
    expect(isSolved(s)).toBe(true);
  });

  it('podpowiedź odkrywa wybraną albo losową liczbę, najwyżej 3', () => {
    let s = puzzleState(P1);
    const n = unsolvedNumbers(s)[2];
    s = hint(s, () => 0, n);
    expect(s.revealed[n - 1]).toBe(true);
    expect(s.guesses[n - 1]).toBe(s.key[n - 1]);
    s = hint(hint(s, () => 0), () => 0);
    expect(s.hints).toBe(MAX_HINTS);
    expect(hint(s, () => 0)).toBe(s);
  });

  it('hasło jako liczby z przerwą; litera hasła spoza planszy to błąd danych', () => {
    const s = puzzleState(P1);
    const n = (ch: string) => s.key.indexOf(ch) + 1;
    expect(solutionNumbers(P1, s)).toEqual([n('K'), n('O'), n('T'), null, n('A'), n('L'), n('A')]);
    expect(() => solutionNumbers({ ...P1, solution: 'XYZ' }, s)).toThrow();
  });

  it('nagroda: 60 monet, −10 za podpowiedź, najmniej 30; +15 humoru', () => {
    expect(cryptoScore(0)).toBe(60);
    expect(cryptoScore(2)).toBe(40);
    expect(cryptoScore(9)).toBe(30);
    expect(cryptoReward(50)).toEqual({ coins: 50, moodBoost: 15 });
  });
});

describe('plansza gazetowa: kolejność i postęp', () => {
  const ALL = [P1, P2, P3];

  it('następna — pierwsza nierozwiązana w kolejności obrotu; porzucona pomijana, chyba że jedyna', () => {
    const order = puzzleOrder(ALL, 0).map((p) => p.id);
    expect(puzzleOrder(ALL, 0).map((p) => p.id)).toEqual(order);
    expect(nextPuzzle(ALL, { round: 0, solved: [] }).puzzle.id).toBe(order[0]);
    expect(nextPuzzle(ALL, { round: 0, solved: [order[0]] }).puzzle.id).toBe(order[1]);
    expect(nextPuzzle(ALL, { round: 0, solved: [] }, order[0]).puzzle.id).toBe(order[1]);
    expect(nextPuzzle(ALL, { round: 0, solved: [order[0], order[1]] }, order[2]).puzzle.id).toBe(order[2]);
  });

  it('pusty zestaw plansz to błąd', () => {
    expect(() => nextPuzzle([], { round: 0, solved: [] })).toThrow();
  });

  it('po rozwiązaniu wszystkich — nowy obrót od pustej listy', () => {
    const r = nextPuzzle(ALL, { round: 0, solved: ['t1', 't2', 't3'] });
    expect(r.progress).toEqual({ round: 1, solved: [] });
    expect(r.puzzle.id).toBe(puzzleOrder(ALL, 1)[0].id);
  });

  it('postęp: odczyt odporny na śmieci, oznaczanie bez powtórzeń', () => {
    expect(readProgress(null)).toEqual({ round: 0, solved: [] });
    expect(readProgress('{zepsute')).toEqual({ round: 0, solved: [] });
    expect(readProgress('{"round":2,"solved":["a","a",3,"b"]}')).toEqual({ round: 2, solved: ['a', 'b'] });
    const p = markSolved({ round: 0, solved: ['a'] }, 'b');
    expect(p.solved).toEqual(['a', 'b']);
    expect(markSolved(p, 'b')).toBe(p);
  });
});

describe('plansza gazetowa: zapis trwającej planszy', () => {
  const ALL = [P1, P2];
  const played = () => {
    let s = puzzleState(P1);
    s = applyGuess(s, unsolvedNumbers(s)[0], freeLetter(s.key));
    return hint(s, () => 0, unsolvedNumbers(s)[1]);
  };

  it('zapis i odczyt zachowują litery, odkrycia i podpowiedzi', () => {
    const s = played();
    expect(s.guesses.some((g, i) => g !== null && !s.revealed[i])).toBe(true);
    expect(readPuzzleSave(writePuzzleSave(s), ALL)).toEqual(s);
  });

  it('stary format, uszkodzony, nieznana plansza → null', () => {
    expect(readPuzzleSave(JSON.stringify({ v: 1, state: {} }), ALL)).toBeNull();
    expect(readPuzzleSave('{zepsute', ALL)).toBeNull();
    expect(readPuzzleSave(null, ALL)).toBeNull();
    expect(readPuzzleSave(writePuzzleSave({ ...played(), id: 'nie-ma' }), ALL)).toBeNull();
  });

  it('nie da się ukryć liter odkrytych na start; rozwiązana plansza i za dużo podpowiedzi → null', () => {
    const s = played();
    const raw = JSON.parse(writePuzzleSave(s));
    expect(readPuzzleSave(JSON.stringify({ ...raw, revealed: raw.revealed.map(() => false) }), ALL)).toBeNull();
    expect(readPuzzleSave(JSON.stringify({ ...raw, guesses: s.key }), ALL)).toBeNull();
    expect(readPuzzleSave(JSON.stringify({ ...raw, hints: MAX_HINTS + 1 }), ALL)).toBeNull();
  });

  it('liczba odkrytych = odkryte na start + podpowiedzi (dopisane ręcznie odkrycie → null)', () => {
    const raw = JSON.parse(writePuzzleSave(played()));
    const key = puzzleState(P1).key;
    const i = raw.revealed.findIndex((r: boolean, k: number) => !r && raw.guesses[k] === null);
    const revealed = [...raw.revealed];
    const guesses = [...raw.guesses];
    revealed[i] = true;
    guesses[i] = key[i];
    expect(readPuzzleSave(JSON.stringify({ ...raw, revealed, guesses }), ALL)).toBeNull();
    // ta sama zmiana, ale z podpowiedzią doliczoną do licznika, jest poprawnym zapisem
    expect(readPuzzleSave(JSON.stringify({ ...raw, revealed, guesses, hints: raw.hints + 1 }), ALL)).not.toBeNull();
  });

  it('odkryta na start zostaje odkryta (przy zgodnej liczbie odkrytych); podpowiedzi poza zakresem → null', () => {
    const base = puzzleState(P1);
    const raw = JSON.parse(writePuzzleSave(base));
    const closed = base.revealed.map((r, k) => (r ? -1 : k)).filter((k) => k >= 0);
    /** Zapis z dodatkowo odkrytymi liczbami (z właściwymi literami) i ewentualnie ukrytą jedną z odkrytych na start. */
    const edited = (extra: number[], hide?: number, hints = raw.hints) => {
      const revealed = [...raw.revealed];
      const guesses = [...raw.guesses];
      for (const k of extra) {
        revealed[k] = true;
        guesses[k] = base.key[k];
      }
      if (hide !== undefined) {
        revealed[hide] = false;
        guesses[hide] = null;
      }
      return readPuzzleSave(JSON.stringify({ ...raw, revealed, guesses, hints }), ALL);
    };

    // (a) jedna odkryta na start ukryta, inna odkryta w jej miejsce, hints bez zmian — liczba odkrytych się zgadza
    const hidden = base.revealed.indexOf(true);
    expect(edited([closed[0]])).toBeNull(); // sama zmiana liczby odkrytych jest odrzucana
    expect(edited([closed[0]], hidden)).toBeNull();
    expect(edited([closed[0]], undefined, 1)).not.toBeNull(); // dodatkowe odkrycie jest poprawne, gdy hints się zgadzają
    // (b) MAX_HINTS + 1 dodatkowych odkryć i hints = MAX_HINTS + 1 — liczba odkrytych się zgadza, ale to za dużo podpowiedzi
    const extra = closed.slice(0, MAX_HINTS + 1);
    expect(base.key.length).toBeGreaterThan(START_REVEALED + MAX_HINTS + 1); // plansza nie jest przez to rozwiązana
    expect(edited(closed.slice(0, MAX_HINTS), undefined, MAX_HINTS)).not.toBeNull(); // granica: dokładnie MAX_HINTS jest w porządku
    expect(edited(extra, undefined, MAX_HINTS + 1)).toBeNull();
  });

  it('odrzuca zapis z tą samą literą przy dwóch liczbach, błędną literą w odkrytej, złą długością i literą spoza alfabetu', () => {
    const raw = JSON.parse(writePuzzleSave(played()));
    const typed = raw.guesses.findIndex((g: string | null, k: number) => g !== null && !raw.revealed[k]);
    const empty = raw.guesses.map((g: string | null, k: number) => (g === null && !raw.revealed[k] ? k : -1)).filter((k: number) => k >= 0);
    const start = puzzleState(P1).revealed.indexOf(true);
    const save = (patch: object) => readPuzzleSave(JSON.stringify({ ...raw, ...patch }), ALL);
    const withGuess = (at: number, letter: string) => raw.guesses.map((g: string | null, k: number) => (k === at ? letter : g));

    expect(save({})).not.toBeNull(); // punkt wyjścia jest poprawny
    expect(save({ guesses: withGuess(empty[0], raw.guesses[typed]) })).toBeNull(); // ta sama litera dwa razy
    expect(save({ guesses: withGuess(start, freeLetter([...raw.guesses, ...puzzleState(P1).key])) })).toBeNull(); // odkryta z inną literą
    expect(save({ guesses: [...raw.guesses, null] })).toBeNull(); // zła długość (reszta bez zmian)
    expect(save({ guesses: withGuess(empty[0], 'X') })).toBeNull(); // spoza alfabetu
  });
});
