/**
 * Pora roku i pogoda (czyste funkcje). Pora roku — z miesiąca w telefonie; pogoda — jedna na cały dzień,
 * losowana z daty (ten sam dzień = ta sama pogoda na każdym urządzeniu), z szansami zależnymi od pory roku.
 * Nic z tego nie trafia do zapisu gry. Przy tworzeniu gry można podejrzeć inną porę/pogodę (`?pora=`, `?pogoda=`).
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'frost';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_NAMES: Readonly<Record<Season, string>> = {
  spring: 'Wiosna',
  summer: 'Lato',
  autumn: 'Jesień',
  winter: 'Zima',
};

export const WEATHER_NAMES: Readonly<Record<Weather, string>> = {
  sunny: 'słonecznie',
  cloudy: 'pochmurno',
  rain: 'deszczowo',
  storm: 'burza',
  snow: 'śnieg',
  frost: 'mróz',
};

/** Szanse pogody w każdej porze roku (sumują się do 1; kolejność = kolejność losowania). */
export const WEATHER_ODDS: Readonly<Record<Season, readonly (readonly [Weather, number])[]>> = {
  spring: [['sunny', 0.45], ['cloudy', 0.25], ['rain', 0.3]],
  summer: [['sunny', 0.6], ['cloudy', 0.15], ['rain', 0.1], ['storm', 0.15]],
  autumn: [['sunny', 0.35], ['cloudy', 0.25], ['rain', 0.4]],
  winter: [['snow', 0.4], ['frost', 0.35], ['cloudy', 0.25]],
};

/** Pora roku z miesiąca: wiosna III–V, lato VI–VIII, jesień IX–XI, zima XII–II. */
export function seasonOf(d: Date): Season {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/** Liczba z [0, 1) stała dla dnia kalendarzowego (FNV-1a z „RRRR-M-D”, potem mieszanie jak w mulberry32). */
export function dayRoll(d: Date): number {
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let t = (h + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Pogoda dnia `d` z tabeli szans pory roku `season`. */
export function weatherFor(season: Season, d: Date): Weather {
  const r = dayRoll(d);
  const odds = WEATHER_ODDS[season];
  let acc = 0;
  for (const [w, p] of odds) {
    acc += p;
    if (r < acc) return w;
  }
  return odds[odds.length - 1][0];
}

/** Pogoda dnia wg prawdziwej pory roku. */
export function weatherOf(d: Date): Weather {
  return weatherFor(seasonOf(d), d);
}

export type BackdropTime = 'day' | 'night';

/** Tło balkonu: pora roku × dzień/noc → nazwa pliku w `public/backgrounds` (bez `.png`). */
export function backdropName(season: Season, time: BackdropTime): string {
  return `${season}-${time}`;
}

// ---------------------------------------------------------------------------
// Podgląd przy tworzeniu gry (`?pora=zima&pogoda=snieg`, tylko `npm run dev`)

const SEASON_PARAM: Readonly<Record<string, Season>> = {
  wiosna: 'spring',
  lato: 'summer',
  jesien: 'autumn',
  jesień: 'autumn',
  zima: 'winter',
};

const WEATHER_PARAM: Readonly<Record<string, Weather>> = {
  slonce: 'sunny',
  słońce: 'sunny',
  pochmurno: 'cloudy',
  deszcz: 'rain',
  burza: 'storm',
  snieg: 'snow',
  śnieg: 'snow',
  mroz: 'frost',
  mróz: 'frost',
};

let seasonOverride: Season | null = null;
let weatherOverride: Weather | null = null;

/** Podgląd pory roku (polska nazwa z adresu); null — z daty. Nieznana nazwa → false, bez zmian. */
export function setSeasonOverride(name: string | null): boolean {
  if (name === null) {
    seasonOverride = null;
    return true;
  }
  const s = SEASON_PARAM[name.normalize('NFC').trim().toLowerCase()];
  if (!s) return false;
  seasonOverride = s;
  return true;
}

/** Podgląd pogody (polska nazwa z adresu); null — z daty. Nieznana nazwa → false, bez zmian. */
export function setWeatherOverride(name: string | null): boolean {
  if (name === null) {
    weatherOverride = null;
    return true;
  }
  const w = WEATHER_PARAM[name.normalize('NFC').trim().toLowerCase()];
  if (!w) return false;
  weatherOverride = w;
  return true;
}

/** Pora roku w grze (z daty albo podglądu). */
export function seasonNow(d: Date): Season {
  return seasonOverride ?? seasonOf(d);
}

/** Pogoda w grze (podgląd albo z daty wg pory roku w grze — przy podglądzie zimy pogoda zimowa). */
export function weatherNow(d: Date): Weather {
  return weatherOverride ?? weatherFor(seasonNow(d), d);
}
