import { CONFIG } from './config';
import { dayKey } from './time';
import type { GameState } from './types';

export function createState(now: number): GameState {
  return {
    version: 1,
    createdAt: now,
    lastUpdate: now,
    needs: { ...CONFIG.startNeeds },
    coins: CONFIG.coins.start,
    fridge: { kitkat: 1 },
    sleeping: false,
    lastDailyBonus: dayKey(now),
    lastFreeKitkat: null,
    lastPetAt: 0,
    seenBirthday: false,
    records: {},
  };
}
