import { afterEach, describe, expect, it } from 'vitest';
import {
  SEASONS,
  WEATHER_ODDS,
  backdropName,
  dayRoll,
  seasonNow,
  seasonOf,
  setSeasonOverride,
  setWeatherOverride,
  weatherFor,
  weatherNow,
  weatherOf,
  type Season,
  type Weather,
} from '../../src/home/season';

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

afterEach(() => {
  setSeasonOverride(null);
  setWeatherOverride(null);
});

describe('pora roku z daty', () => {
  it('miesiącami: wiosna III–V, lato VI–VIII, jesień IX–XI, zima XII–II', () => {
    expect(seasonOf(day(2026, 2, 28))).toBe('winter');
    expect(seasonOf(day(2026, 3, 1))).toBe('spring');
    expect(seasonOf(day(2026, 5, 31))).toBe('spring');
    expect(seasonOf(day(2026, 6, 1))).toBe('summer');
    expect(seasonOf(day(2026, 8, 31))).toBe('summer');
    expect(seasonOf(day(2026, 9, 1))).toBe('autumn');
    expect(seasonOf(day(2026, 11, 30))).toBe('autumn');
    expect(seasonOf(day(2026, 12, 1))).toBe('winter');
    expect(seasonOf(day(2027, 1, 15))).toBe('winter');
  });
});

describe('pogoda dnia', () => {
  it('szanse w każdej porze roku sumują się do 1', () => {
    for (const s of SEASONS) {
      const sum = WEATHER_ODDS[s].reduce((a, [, p]) => a + p, 0);
      expect(sum, s).toBeCloseTo(1, 9);
    }
  });

  it('cały dzień ta sama pogoda; liczba dnia w [0, 1)', () => {
    expect(weatherOf(day(2026, 10, 19, 0))).toBe(weatherOf(day(2026, 10, 19, 23)));
    expect(dayRoll(day(2026, 10, 19, 0))).toBe(dayRoll(day(2026, 10, 19, 23)));
    for (let d = 1; d <= 31; d++) {
      const r = dayRoll(day(2026, 10, d));
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it('tylko pogody danej pory roku, z szansami jak w tabeli (±5 pkt proc. na 100 latach)', () => {
    const count = new Map<Season, Map<Weather, number>>();
    const total = new Map<Season, number>();
    for (let y = 2000; y < 2100; y++) {
      for (let doy = 0; doy < 365; doy++) {
        const d = new Date(y, 0, 1 + doy, 12);
        const s = seasonOf(d);
        const w = weatherOf(d);
        expect(WEATHER_ODDS[s].map(([x]) => x)).toContain(w);
        const m = count.get(s) ?? new Map<Weather, number>();
        m.set(w, (m.get(w) ?? 0) + 1);
        count.set(s, m);
        total.set(s, (total.get(s) ?? 0) + 1);
      }
    }
    for (const s of SEASONS) {
      for (const [w, p] of WEATHER_ODDS[s]) {
        expect((count.get(s)!.get(w) ?? 0) / total.get(s)!, `${s} ${w}`).toBeGreaterThan(p - 0.05);
        expect((count.get(s)!.get(w) ?? 0) / total.get(s)!, `${s} ${w}`).toBeLessThan(p + 0.05);
      }
    }
  });

  it('weatherFor liczy pogodę z tabeli podanej pory roku', () => {
    const d = day(2026, 7, 10);
    expect(WEATHER_ODDS.winter.map(([x]) => x)).toContain(weatherFor('winter', d));
  });
});

describe('podgląd ?pora= / ?pogoda=', () => {
  it('pora roku nadpisana polską nazwą; pogoda wtedy z tabeli tej pory roku', () => {
    const july = day(2026, 7, 10);
    expect(setSeasonOverride('zima')).toBe(true);
    expect(seasonNow(july)).toBe('winter');
    expect(WEATHER_ODDS.winter.map(([x]) => x)).toContain(weatherNow(july));
    expect(setSeasonOverride('jesien')).toBe(true);
    expect(seasonNow(july)).toBe('autumn');
  });

  it('pogoda nadpisana; zła nazwa — false i bez zmian; null wraca do daty', () => {
    const d = day(2026, 10, 19);
    expect(setWeatherOverride('burza')).toBe(true);
    expect(weatherNow(d)).toBe('storm');
    expect(setWeatherOverride('tornado')).toBe(false);
    expect(weatherNow(d)).toBe('storm');
    expect(setWeatherOverride('snieg')).toBe(true);
    expect(weatherNow(d)).toBe('snow');
    setWeatherOverride(null);
    expect(weatherNow(d)).toBe(weatherOf(d));
    expect(setSeasonOverride('lato?')).toBe(false);
    expect(seasonNow(d)).toBe('autumn');
  });

  it('nazwy plików teł', () => {
    expect(backdropName('winter', 'night')).toBe('winter-night');
  });
});
