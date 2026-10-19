import { seasonNow, type Season } from './season';

/**
 * Pora dnia z zegara telefonu, zależna od pory roku: zimą krótki dzień (noc od 17), latem długi (noc od 22),
 * wiosną i jesienią rano 6–10, dzień 10–18, wieczór 18–21, noc 21–6. Okna i balkon pokazują poranną różowość,
 * wieczorny zachód i nocne niebo; pokój dostaje delikatną poświatę. Tylko wygląd — sen i potrzeby bez zmian.
 */
export type DayPhase = 'morning' | 'day' | 'evening' | 'night';

/** Początki pór dnia (godzina z ułamkiem) w każdej porze roku. */
export const PHASE_STARTS: Readonly<Record<Season, { morning: number; day: number; evening: number; night: number }>> = {
  winter: { morning: 7, day: 9, evening: 15.5, night: 17 },
  spring: { morning: 6, day: 10, evening: 18, night: 21 },
  summer: { morning: 5, day: 9, evening: 20, night: 22 },
  autumn: { morning: 6, day: 10, evening: 18, night: 21 },
};

const hoursOf = (d: Date) => d.getHours() + d.getMinutes() / 60;

export function dayPhase(d: Date): DayPhase {
  const s = PHASE_STARTS[seasonNow(d)];
  const h = hoursOf(d);
  if (h >= s.morning && h < s.day) return 'morning';
  if (h >= s.day && h < s.evening) return 'day';
  if (h >= s.evening && h < s.night) return 'evening';
  return 'night';
}

/** Jak daleko w zmierzch: 0 — rano i w dzień, 1 — w nocy, wieczorem rośnie od 0 do 1 (przejście tła balkonu). */
export function eveningProgress(d: Date): number {
  const s = PHASE_STARTS[seasonNow(d)];
  const h = hoursOf(d);
  if (h >= s.morning && h < s.evening) return 0;
  if (h >= s.evening && h < s.night) return (h - s.evening) / (s.night - s.evening);
  return 1;
}

export const PHASE_NAMES: Readonly<Record<DayPhase, string>> = {
  morning: 'Poranek',
  day: 'Dzień',
  evening: 'Wieczór',
  night: 'Noc',
};

/** Barwa szyby w oknach (null — bez zmian). */
export const WINDOW_PHASE_TINT: Readonly<Record<DayPhase, string | null>> = {
  morning: 'rgba(255, 168, 150, 0.30)',
  day: null,
  evening: 'rgba(255, 118, 56, 0.36)',
  night: 'rgba(20, 16, 60, 0.55)',
};

/** Delikatna poświata całego pokoju, gdy światło jest zapalone (Gabi nie śpi). */
export const ROOM_PHASE_TINT: Readonly<Record<DayPhase, string | null>> = {
  morning: 'rgba(255, 214, 180, 0.10)',
  day: null,
  evening: 'rgba(255, 150, 80, 0.12)',
  night: 'rgba(40, 24, 90, 0.16)',
};
