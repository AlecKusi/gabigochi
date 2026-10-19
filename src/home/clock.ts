import { dayPhase, type DayPhase } from './daytime';
import { seasonNow, weatherNow, type Season, type Weather } from './season';

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

/** Przesunięcie godziny gry względem telefonu (podgląd innej pory dnia; patrz `setClockOverride`). */
let clockOffsetMs = 0;

/**
 * Podgląd innej pory dnia: godzina gry ustawiona na `hhmm` („23”, „7:30”) dzisiaj i dalej płynie normalnie;
 * null — zegar telefonu. Zmienia tylko wygląd i kwestie (okna, balkon, zegary) — potrzeby liczą się dalej
 * od prawdziwego czasu. Zwraca false dla złego zapisu (zegar bez zmian).
 */
export function setClockOverride(hhmm: string | null, now = Date.now()): boolean {
  if (hhmm === null) {
    clockOffsetMs = 0;
    return true;
  }
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(hhmm.trim());
  if (!m || Number(m[1]) > 23 || Number(m[2] ?? 0) > 59) return false;
  const d = new Date(now);
  d.setHours(Number(m[1]), Number(m[2] ?? 0), 0, 0);
  clockOffsetMs = d.getTime() - now;
  return true;
}

/** Godzina gry: zegar telefonu (albo przestawiony do podglądu). */
export function gameClock(now = Date.now()): Date {
  return new Date(now + clockOffsetMs);
}

/** Ikonka pory dnia na pasku. */
export const PHASE_ICON: Readonly<Record<DayPhase, 'sunrise' | 'sun' | 'sunset' | 'moon'>> = {
  morning: 'sunrise',
  day: 'sun',
  evening: 'sunset',
  night: 'moon',
};

/** Ikonka pogody na pasku (pogodnie — bez ikonki: słońce/księżyc pokazuje już pora dnia). */
export const WEATHER_ICON: Readonly<Record<Weather, 'weather_cloud' | 'weather_rain' | 'weather_storm' | 'weather_snow' | 'weather_frost' | null>> = {
  sunny: null,
  cloudy: 'weather_cloud',
  rain: 'weather_rain',
  storm: 'weather_storm',
  snow: 'weather_snow',
  frost: 'weather_frost',
};

/** Godzina, pora dnia, pora roku i pogoda naraz (pasek, kwestia Gabi). */
export function clockNow(d: Date): { text: string; phase: DayPhase; season: Season; weather: Weather } {
  return { text: clockText(d), phase: dayPhase(d), season: seasonNow(d), weather: weatherNow(d) };
}
