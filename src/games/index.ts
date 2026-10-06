import type { IconName } from '../art/icons';
import type { MiniGame } from './types';

export const GAMES: MiniGame[] = [];

/** Gry z etapu 2 — widoczne jako zablokowane „wkrótce”. */
export const COMING_SOON: { name: string; icon: IconName; category: MiniGame['category'] }[] = [
  { name: 'Bricks n Balls', icon: 'bricks', category: 'arcade' },
  { name: 'Sudoku', icon: 'grid', category: 'puzzle' },
  { name: 'Szyfrokrzyżówka', icon: 'letters', category: 'puzzle' },
];
