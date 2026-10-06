import { HOUR } from '../core/time';
import type { GameState } from '../core/types';

/** Bonus humoru za interakcję z przedmiotem — najwyżej raz na tyle ms na przedmiot (uid). */
export const REWARD_COOLDOWN = HOUR;

export function canReward(state: GameState, uid: string, now: number): boolean {
  const last = state.itemCooldowns[uid];
  return last === undefined || now - last >= REWARD_COOLDOWN;
}

/** Zapamiętuje bonus dla `uid`; przy okazji usuwa wpisy, których cooldown już minął (zapis nie rośnie). */
export function markReward(state: GameState, uid: string, now: number): GameState {
  const itemCooldowns: Record<string, number> = {};
  for (const [k, t] of Object.entries(state.itemCooldowns)) if (now - t < REWARD_COOLDOWN) itemCooldowns[k] = t;
  itemCooldowns[uid] = now;
  return { ...state, itemCooldowns };
}
