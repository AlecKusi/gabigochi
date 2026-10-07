import type { IconName } from '../art/icons';
import { bricksGame } from './bricksGame';
import { candlesGame } from './candlesGame';
import { catchGame } from './catchGame';
import { cryptoGame } from './cryptoGame';
import { memoryGame } from './memoryGame';
import { sudokuGame } from './sudokuGame';
import type { MiniGame } from './types';

export const GAMES: MiniGame[] = [catchGame, candlesGame, bricksGame, memoryGame, sudokuGame, cryptoGame];

/** Gry zapowiedziane, ale jeszcze niegotowe — widoczne jako zablokowane „wkrótce” (obecnie brak). */
export const COMING_SOON: { name: string; icon: IconName; category: MiniGame['category'] }[] = [];
