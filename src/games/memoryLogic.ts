export interface Card {
  face: string;
  up: boolean;
  matched: boolean;
}

export interface MemoryState {
  cards: Card[];
  first: number | null;
  second: number | null;
  moves: number;
  locked: boolean;
}

export function createMemory(faces: readonly string[], rng: () => number): MemoryState {
  const deck = [...faces, ...faces];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { cards: deck.map((face) => ({ face, up: false, matched: false })), first: null, second: null, moves: 0, locked: false };
}

export function flipCard(s: MemoryState, i: number): MemoryState {
  const card = s.cards[i];
  if (s.locked || !card || card.up || card.matched) return s;
  const cards = s.cards.map((c, j) => (j === i ? { ...c, up: true } : c));
  if (s.first === null) return { ...s, cards, first: i };
  const moves = s.moves + 1;
  const first = s.first;
  if (cards[first].face === card.face) {
    const matched = cards.map((c, j) => (j === i || j === first ? { ...c, matched: true } : c));
    return { ...s, cards: matched, first: null, second: null, moves };
  }
  return { ...s, cards, second: i, moves, locked: true };
}

export function resolveMismatch(s: MemoryState): MemoryState {
  if (!s.locked || s.first === null || s.second === null) return s;
  const { first, second } = s;
  const cards = s.cards.map((c, j) => (j === first || j === second ? { ...c, up: false } : c));
  return { ...s, cards, first: null, second: null, locked: false };
}

export const isComplete = (s: MemoryState): boolean => s.cards.every((c) => c.matched);

/** 8 ruchów (idealnie) = 100 pkt, każdy dodatkowy ruch −4, minimum 10. */
export function memoryScore(moves: number): number {
  return Math.max(10, Math.min(100, 100 - (moves - 8) * 4));
}
