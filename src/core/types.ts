import type { FoodId } from './config';

export interface Needs {
  hunger: number;
  mood: number;
  energy: number;
}

export type MoodLevel = 'happy' | 'ok' | 'sad';

export interface GameState {
  version: 1;
  createdAt: number;
  lastUpdate: number;
  needs: Needs;
  coins: number;
  fridge: Partial<Record<FoodId, number>>;
  sleeping: boolean;
  lastDailyBonus: string;
  lastFreeKitkat: string | null;
  lastPetAt: number;
  seenBirthday: boolean;
  records: Record<string, number>;
}

export interface GameResult {
  gameId: string;
  score: number;
  coins: number;
  moodBoost: number;
  aborted: boolean;
}
