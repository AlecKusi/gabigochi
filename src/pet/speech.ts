import { content } from '../content';
import { needStatus } from '../core/needs';
import type { Needs } from '../core/types';
import { dayPhase, isBedtime, type DayPhase } from '../home/daytime';
import type { Season, Weather } from '../home/season';

export function pick<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

/**
 * Jak często (gdy niczego nie brakuje) Gabi rzuca losowym tekstem zamiast zwykłej kwestii — zawsze 35%,
 * także gdy podano `world` (kwestie o porze roku i pogodzie biorą udział tylko ze „zwykłych”).
 */
export const RANDOM_LINE_CHANCE = 0.35;

/** Pora roku, pogoda i czy jest noc (do kwestii). */
export interface World {
  season: Season;
  weather: Weather;
  /** Noc wg `dayPhase` — wtedy kwestie o pogodzie bez słońca. */
  night: boolean;
}

/**
 * Jaka część wszystkich pogawędek (gdy niczego nie brakuje) jest o porze roku, pogodzie albo o kotku w tej pogodzie.
 * Odejmuje się ją od „zwykłych” kwestii, nie od losowych tekstów Gabi (te zostają przy `RANDOM_LINE_CHANCE`).
 */
export const SEASON_LINE_CHANCE = 1 / 3;
/** Jak często powitanie jest o pogodzie zamiast „Cześć!”. */
export const WEATHER_GREETING_CHANCE = 0.4;

/** Kwestie o pogodzie stosowne do pory: nocą bez słońca (pogodna noc — gwiazdy i księżyc). */
export function weatherLines(weather: Weather, night: boolean): readonly string[] {
  if (night && weather === 'sunny') return content.lines.windowNight;
  const lines = content.seasonLines.weather[weather];
  if (!night) return lines;
  const dark = lines.filter((l) => !/sło[nń]/i.test(l));
  return dark.length > 0 ? dark : content.lines.windowNight;
}

/** Kwestia o porze roku, pogodzie albo o kotku (z `{kot}` — do podstawienia imienia). */
export function worldLine(w: World, rng: () => number = Math.random): string {
  const L = content.seasonLines;
  // kotek wygrzewający się w słoneczku — tylko za dnia
  const catWeather = w.night && w.weather === 'sunny' ? [] : (L.catWeather[w.weather] ?? []);
  return pick([...L.season[w.season], ...weatherLines(w.weather, w.night), ...catWeather, ...(L.catSeason[w.season] ?? [])], rng);
}

/**
 * Przy oknie: w dzień o pogodzie (pogodnie — zwykłe kwestie okna); nocą w deszcz, burzę i śnieg o tej pogodzie,
 * a w pozostałe (pogodnie, chmury, mróz) — o gwiazdach i księżycu.
 */
export function windowLine(weather: Weather, night: boolean, rng: () => number = Math.random): string {
  if (night) {
    const wet = weather === 'rain' || weather === 'storm' || weather === 'snow';
    return pick(wet ? content.seasonLines.weather[weather] : content.lines.windowNight, rng);
  }
  return pick(weather === 'sunny' ? content.lines.window : content.seasonLines.weather[weather], rng);
}

/** Powitanie po otwarciu gry: czasem o pogodzie (nocą bez słońca), zwykle „Cześć!”. */
export function greetingLine(weather: Weather, night: boolean, rng: () => number = Math.random): string {
  return rng() < WEATHER_GREETING_CHANCE ? pick(weatherLines(weather, night), rng) : pick(content.lines.greeting, rng);
}

/**
 * Kwestie zegara ściennego: wg pory dnia, a nocą przed porą snu (zimą wieczorem od 17:00 i rano 6–7) —
 * „za oknem ciemno”, nie „dobranoc”.
 */
export function clockLines(phase: DayPhase, bedtime: boolean): readonly string[] {
  if (phase === 'night') return bedtime ? content.lines.clockNight : content.lines.clockDark;
  return content.lines[phase === 'morning' ? 'clockMorning' : phase === 'day' ? 'clockDay' : 'clockEvening'];
}

/** Kwestie zegara ściennego o tej chwili (pora dnia wg pory roku, pora snu wg godziny). */
export function clockLinesAt(d: Date): readonly string[] {
  return clockLines(dayPhase(d), isBedtime(d));
}

/**
 * Kwestia zależna od potrzeb: głód > senność > nuda > zadowolenie; przy zadowoleniu 35% losowy tekst Gabi,
 * potem (gdy podano `world`) udział kwestii o porze roku i pogodzie, a resztę stanowią zwykłe kwestie.
 */
export function pickLine(needs: Needs, rng: () => number = Math.random, world?: World): string {
  const st = needStatus(needs);
  if (st.hungry) return pick(content.lines.hungry, rng);
  if (st.sleepy) return pick(content.lines.sleepy, rng);
  if (st.bored) return pick(content.lines.bored, rng);
  if (rng() < RANDOM_LINE_CHANCE) return pick(content.lines.random, rng);
  if (world && rng() < SEASON_LINE_CHANCE / (1 - RANDOM_LINE_CHANCE)) return worldLine(world, rng);
  return pick(content.lines.happy, rng);
}
