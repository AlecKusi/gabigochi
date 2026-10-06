import type { Needs } from '../core/types';

export type StatusAnim = 'starving' | 'exhausted' | 'hungry' | 'tired' | 'sad' | null;
export type AvatarEmotion = 'crazy' | 'scared' | null;

/** Progi stanów (spec §4): poniżej wartości stan jest aktywny. */
export const STATUS = { starving: 10, exhausted: 8, hungry: 25, tired: 20, sad: 30 } as const;
/** 5 stuknięć w 3 s — złość. */
export const ANGRY_TAPS = { count: 5, windowMs: 3000 } as const;
/** 3 KitKaty w 10 min — cukrowy szał. */
export const SUGAR_RUSH = { count: 3, windowMs: 600_000 } as const;

export function statusAnimation(n: Needs): StatusAnim {
  if (n.hunger < STATUS.starving) return 'starving';
  if (n.energy < STATUS.exhausted) return 'exhausted';
  if (n.hunger < STATUS.hungry) return 'hungry';
  if (n.energy < STATUS.tired) return 'tired';
  if (n.mood < STATUS.sad) return 'sad';
  return null;
}

/** Ile znaczników czasu mieści się w oknie [now − windowMs, now]. */
export function countRecent(times: readonly number[], now: number, windowMs: number): number {
  return times.filter((t) => t <= now && now - t <= windowMs).length;
}

const CRAZY_FACES = ['face_crazy_1', 'face_crazy_2', 'face_crazy_3'];

/** Portret do nagłówka: emocja > stan > zwykły portret. */
export function avatarFor(status: StatusAnim, emotion: AvatarEmotion, t: number): string {
  if (emotion === 'crazy') return CRAZY_FACES[Math.floor(t / 400) % CRAZY_FACES.length];
  if (emotion === 'scared') return 'face_dizzy';
  if (status === 'starving' || status === 'hungry') return 'face_hungry';
  if (status === 'exhausted' || status === 'tired') return 'face_tired';
  return 'portrait_a';
}
