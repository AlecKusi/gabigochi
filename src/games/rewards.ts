import type { Reward } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function catchReward(score: number): Reward {
  return { coins: Math.min(50, Math.floor(score / 10)), moodBoost: 10 };
}

export function candlesReward(score: number): Reward {
  return { coins: clamp(Math.round(score * 0.35), 5, 40), moodBoost: 15 };
}

export function memoryReward(score: number): Reward {
  return { coins: clamp(Math.round(score * 0.4), 15, 40), moodBoost: 10 };
}
