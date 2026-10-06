import { CONFIG, foodById, type FoodId } from './config';
import { dayKey } from './time';
import type { GameResult, GameState } from './types';

export type Outcome =
  | { ok: true; state: GameState }
  | { ok: false; reason: 'no-coins' | 'empty' };

const clamp = (v: number) => Math.max(0, Math.min(CONFIG.needs.max, v));

export function priceOf(state: GameState, id: FoodId, now: number): number {
  if (id === 'kitkat' && state.lastFreeKitkat !== dayKey(now)) return 0;
  return foodById(id).price;
}

export function buyFood(state: GameState, id: FoodId, now: number): Outcome {
  const price = priceOf(state, id, now);
  if (state.coins < price) return { ok: false, reason: 'no-coins' };
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - price,
      fridge: { ...state.fridge, [id]: (state.fridge[id] ?? 0) + 1 },
      lastFreeKitkat: id === 'kitkat' && price === 0 ? dayKey(now) : state.lastFreeKitkat,
    },
  };
}

export function feed(state: GameState, id: FoodId): Outcome {
  const count = state.fridge[id] ?? 0;
  if (count <= 0) return { ok: false, reason: 'empty' };
  const food = foodById(id);
  const fridge = { ...state.fridge };
  if (count === 1) delete fridge[id];
  else fridge[id] = count - 1;
  return {
    ok: true,
    state: {
      ...state,
      fridge,
      sleeping: false,
      needs: {
        ...state.needs,
        hunger: clamp(state.needs.hunger + food.hunger),
        mood: clamp(state.needs.mood + food.mood),
      },
    },
  };
}

export function claimDailyBonus(state: GameState, now: number): { state: GameState; granted: boolean } {
  const today = dayKey(now);
  if (state.lastDailyBonus === today) return { state, granted: false };
  return {
    state: { ...state, coins: state.coins + CONFIG.coins.dailyBonus, lastDailyBonus: today },
    granted: true,
  };
}

export function petCharacter(state: GameState, now: number): { state: GameState; accepted: boolean } {
  if (now - state.lastPetAt < CONFIG.pet.cooldownMs) return { state, accepted: false };
  return {
    state: {
      ...state,
      lastPetAt: now,
      needs: { ...state.needs, mood: clamp(state.needs.mood + CONFIG.pet.moodGain) },
    },
    accepted: true,
  };
}

export function applyGameResult(state: GameState, result: GameResult): GameState {
  if (result.aborted) return state;
  const prev = state.records[result.gameId] ?? 0;
  return {
    ...state,
    sleeping: false,
    coins: state.coins + result.coins,
    needs: {
      ...state.needs,
      mood: clamp(state.needs.mood + result.moodBoost),
      energy: clamp(state.needs.energy - CONFIG.games.energyCost),
    },
    records: { ...state.records, [result.gameId]: Math.max(prev, result.score) },
  };
}

export function finishActivity(state: GameState): GameState {
  return { ...state, needs: { ...state.needs, mood: clamp(state.needs.mood + 3) } };
}

export function setSleeping(state: GameState, sleeping: boolean): GameState {
  return state.sleeping === sleeping ? state : { ...state, sleeping };
}
