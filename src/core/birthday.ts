import { content } from '../content';
import { CONFIG } from './config';
import type { GameState } from './types';

/** Czy `now` (czas lokalny) to dzień urodzin Gabi. */
export function isBirthday(now: number): boolean {
  const d = new Date(now);
  return d.getMonth() + 1 === content.birthday.month && d.getDate() === content.birthday.day;
}

/** Ile lat kończy Gabi w roku `now`. */
export function ageOn(now: number): number {
  return new Date(now).getFullYear() - content.birthday.year;
}

/** Urodzinowy prezent (monety) — raz w roku, w dniu urodzin. */
export function claimBirthdayGift(state: GameState, now: number): { state: GameState; granted: boolean } {
  const year = new Date(now).getFullYear();
  if (!isBirthday(now) || state.lastBirthdayGift === year) return { state, granted: false };
  return { state: { ...state, coins: state.coins + CONFIG.coins.birthdayGift, lastBirthdayGift: year }, granted: true };
}

/** Kwestia z wiekiem (znacznik `{wiek}`). */
export function withAge(line: string, now: number): string {
  return line.split('{wiek}').join(String(ageOn(now)));
}
