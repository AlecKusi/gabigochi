/**
 * Pora dnia z zegara telefonu: rano (6–10), dzień (10–18), wieczór (18–21), noc (21–6). Okna i balkon pokazują
 * poranną różowość, wieczorny zachód i nocne niebo; pokój dostaje delikatną poświatę.
 */
export type DayPhase = 'morning' | 'day' | 'evening' | 'night';

export function dayPhase(d: Date): DayPhase {
  const h = d.getHours();
  if (h >= 6 && h < 10) return 'morning';
  if (h >= 10 && h < 18) return 'day';
  if (h >= 18 && h < 21) return 'evening';
  return 'night';
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

/** Niebo nad balkonem: [góra, dół] gradientu. */
export const SKY: Readonly<Record<DayPhase, readonly [string, string]>> = {
  morning: ['#9fc4f0', '#ffc9b5'],
  day: ['#6fb3f2', '#c7e6ff'],
  evening: ['#5b4a9e', '#ff9a6a'],
  night: ['#141238', '#33306e'],
};
