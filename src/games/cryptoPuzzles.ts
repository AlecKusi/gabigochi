import data from './cryptoPuzzles.json';
import type { Puzzle } from './cryptoLogic';

/** Gotowy zestaw plansz Szyfrokrzyżówki (układa je tools/make_crypto.py). */
export const PUZZLES: readonly Puzzle[] = data.puzzles;
