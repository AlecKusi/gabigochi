import type { IconName } from '../art/icons';
import { bricksGame } from './bricksGame';
import { candlesGame } from './candlesGame';
import { catBoxesGame } from './catBoxesGame';
import { catRunGame } from './catRunGame';
import { catchGame } from './catchGame';
import { cryptoGame } from './cryptoGame';
import { cupsGame } from './cupsGame';
import { food2048Game } from './food2048Game';
import { memoryGame } from './memoryGame';
import { simonGame } from './simonGame';
import { sudokuGame } from './sudokuGame';
import type { MiniGame } from './types';

export const GAMES: MiniGame[] = [
  catchGame, candlesGame, bricksGame, catBoxesGame, cupsGame, catRunGame,
  memoryGame, sudokuGame, cryptoGame, food2048Game, simonGame,
];

/** Gry zapowiedziane, ale jeszcze niegotowe — widoczne jako zablokowane „wkrótce” (obecnie brak). */
export const COMING_SOON: { name: string; icon: IconName; category: MiniGame['category'] }[] = [];
