export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** Klucz dnia w lokalnej strefie czasowej, np. "2026-10-06". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Numer dnia życia zwierzaka: dzień utworzenia = 1. */
export function dayNumber(createdAt: number, now: number): number {
  const a = new Date(createdAt);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / DAY) + 1;
}
