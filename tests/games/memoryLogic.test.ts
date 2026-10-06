import { describe, expect, it } from 'vitest';
import { createMemory, flipCard, isComplete, memoryScore, resolveMismatch, type MemoryState } from '../../src/games/memoryLogic';

const FACES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ordered = (): MemoryState => ({
  cards: ['a', 'a', 'b', 'b'].map((face) => ({ face, up: false, matched: false })),
  first: null,
  second: null,
  moves: 0,
  locked: false,
});

describe('createMemory', () => {
  it('16 kart, każdy obrazek dwa razy', () => {
    const s = createMemory(FACES, Math.random);
    expect(s.cards).toHaveLength(16);
    for (const f of FACES) expect(s.cards.filter((c) => c.face === f)).toHaveLength(2);
  });
});

describe('flipCard', () => {
  it('para zostaje odkryta na stałe', () => {
    let s = flipCard(ordered(), 0);
    s = flipCard(s, 1);
    expect(s.cards[0].matched && s.cards[1].matched).toBe(true);
    expect(s.moves).toBe(1);
    expect(s.first).toBeNull();
  });

  it('pomyłka blokuje planszę do resolveMismatch', () => {
    let s = flipCard(ordered(), 0);
    s = flipCard(s, 2);
    expect(s.locked).toBe(true);
    expect(flipCard(s, 3)).toBe(s);
    s = resolveMismatch(s);
    expect(s.locked).toBe(false);
    expect(s.cards[0].up || s.cards[2].up).toBe(false);
  });

  it('ignoruje odkrytą kartę', () => {
    const s = flipCard(ordered(), 0);
    expect(flipCard(s, 0)).toBe(s);
  });

  it('koniec, gdy wszystkie pary znalezione', () => {
    let s = ordered();
    for (const i of [0, 1, 2, 3]) s = flipCard(s, i);
    expect(isComplete(s)).toBe(true);
  });
});

describe('memoryScore', () => {
  it('mniej ruchów = więcej punktów', () => {
    expect(memoryScore(8)).toBe(100);
    expect(memoryScore(20)).toBe(52);
    expect(memoryScore(50)).toBe(10);
  });
});
