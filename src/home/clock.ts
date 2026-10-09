import { dayPhase, type DayPhase } from './daytime';

/**
 * Zegar gry = zegar telefonu. Zegar ścienny ma okienko nieba z porą dnia (klatki `wall_clock_<pora>`) i wskazówki
 * rysowane na żywo; na górnym pasku pokoju — godzina z ikonką pory dnia.
 */
export const WALL_CLOCK = 'wall_clock';

/** Środek tarczy względem kotwicy przedmiotu (x — środek, y — dół) i długości wskazówek; px logiczne. */
export const CLOCK_FACE = { dx: 0, dy: -9.5, hour: 3.4, minute: 5.2, second: 5.4 } as const;

/** „7:05”, „21:30” — godzina bez zera z przodu, minuty dwucyfrowo. */
export function clockText(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Kąty wskazówek w radianach, zgodnie z ruchem wskazówek zegara od „12”; płynne (minuty przesuwają godzinową). */
export function handAngles(d: Date): { hour: number; minute: number; second: number } {
  const s = d.getSeconds() + d.getMilliseconds() / 1000;
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;
  const turn = 2 * Math.PI;
  return { hour: (h / 12) * turn, minute: (m / 60) * turn, second: (Math.floor(s) / 60) * turn };
}

/** Ikonka pory dnia na pasku. */
export const PHASE_ICON: Readonly<Record<DayPhase, 'sunrise' | 'sun' | 'sunset' | 'moon'>> = {
  morning: 'sunrise',
  day: 'sun',
  evening: 'sunset',
  night: 'moon',
};

/** Godzina i pora dnia naraz (pasek, kwestia Gabi). */
export function clockNow(d: Date): { text: string; phase: DayPhase } {
  return { text: clockText(d), phase: dayPhase(d) };
}
