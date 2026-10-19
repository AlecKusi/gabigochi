import { content } from '../content';
import { needStatus } from '../core/needs';
import type { Needs } from '../core/types';
import type { DayPhase } from '../home/daytime';
import type { Season, Weather } from '../home/season';

export function pick<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

/** Jak często (gdy niczego nie brakuje) Gabi rzuca losowym tekstem zamiast zwykłej kwestii. */
export const RANDOM_LINE_CHANCE = 0.35;

/** Pora roku i pogoda (do kwestii). */
export interface World {
  season: Season;
  weather: Weather;
}

/** Jak często (gdy niczego nie brakuje) pogawędka jest o porze roku, pogodzie albo o kotku w tej pogodzie. */
export const SEASON_LINE_CHANCE = 1 / 3;
/** Jak często powitanie jest o pogodzie zamiast „Cześć!”. */
export const WEATHER_GREETING_CHANCE = 0.4;

/** Kwestia o porze roku, pogodzie albo o kotku (z `{kot}` — do podstawienia imienia). */
export function worldLine(w: World, rng: () => number = Math.random): string {
  const L = content.seasonLines;
  return pick([...L.season[w.season], ...L.weather[w.weather], ...(L.catWeather[w.weather] ?? []), ...(L.catSeason[w.season] ?? [])], rng);
}

/** Przy oknie: w dzień o pogodzie (pogodnie — zwykłe kwestie okna), nocą gwiazdy, a w śnieg — o śniegu. */
export function windowLine(weather: Weather, night: boolean, rng: () => number = Math.random): string {
  if (night) return pick(weather === 'snow' ? content.seasonLines.weather.snow : content.lines.windowNight, rng);
  return pick(weather === 'sunny' ? content.lines.window : content.seasonLines.weather[weather], rng);
}

/** Powitanie po otwarciu gry: czasem o pogodzie, zwykle „Cześć!”. */
export function greetingLine(weather: Weather, rng: () => number = Math.random): string {
  return rng() < WEATHER_GREETING_CHANCE ? pick(content.seasonLines.weather[weather], rng) : pick(content.lines.greeting, rng);
}

/** Kwestie zegara ściennego: wg pory dnia, a nocą przed porą snu (zimą od 17:00) — „już ciemno”, nie „dobranoc”. */
export function clockLines(phase: DayPhase, bedtime: boolean): readonly string[] {
  if (phase === 'night') return bedtime ? content.lines.clockNight : content.lines.clockDark;
  return content.lines[phase === 'morning' ? 'clockMorning' : phase === 'day' ? 'clockDay' : 'clockEvening'];
}

/**
 * Kwestia zależna od potrzeb: głód > senność > nuda > zadowolenie; przy zadowoleniu czasem o porze roku i pogodzie
 * (gdy podano `world`), a czasem losowy tekst.
 */
export function pickLine(needs: Needs, rng: () => number = Math.random, world?: World): string {
  const st = needStatus(needs);
  if (st.hungry) return pick(content.lines.hungry, rng);
  if (st.sleepy) return pick(content.lines.sleepy, rng);
  if (st.bored) return pick(content.lines.bored, rng);
  if (world && rng() < SEASON_LINE_CHANCE) return worldLine(world, rng);
  return pick(rng() < RANDOM_LINE_CHANCE ? content.lines.random : content.lines.happy, rng);
}
