import { describe, expect, it } from 'vitest';
import {
  RANDOM_LINE_CHANCE,
  SEASON_LINE_CHANCE,
  clockLines,
  clockLinesAt,
  greetingLine,
  pick,
  pickLine,
  weatherLines,
  windowLine,
  worldLine,
} from '../../src/pet/speech';
import { content } from '../../src/content';

const first = () => 0;
/** Generator zwracający kolejno podane wartości, a po ich wyczerpaniu 0. */
const queue = (...values: number[]) => () => values.shift() ?? 0;

describe('pickLine', () => {
  it('głód ma pierwszeństwo', () => {
    expect(content.lines.hungry).toContain(pickLine({ hunger: 10, mood: 10, energy: 10 }, first));
  });
  it('śpiąca', () => {
    expect(content.lines.sleepy).toContain(pickLine({ hunger: 90, mood: 90, energy: 10 }, first));
  });
  it('znudzona', () => {
    expect(content.lines.bored).toContain(pickLine({ hunger: 90, mood: 10, energy: 90 }, first));
  });
  it('zadowolona: zwykła kwestia albo losowy tekst', () => {
    expect(content.lines.happy).toContain(pickLine({ hunger: 90, mood: 90, energy: 90 }, () => 0.9));
    expect(content.lines.random).toContain(pickLine({ hunger: 90, mood: 90, energy: 90 }, first));
  });
  it('losowe teksty Gabi', () => {
    expect(content.lines.random).toContain('Jestem kierowniczka.');
    expect(content.lines.random).toHaveLength(12);
    // przy potrzebach — bez losowych tekstów
    expect(content.lines.random).not.toContain(pickLine({ hunger: 10, mood: 90, energy: 90 }, first));
  });
});

describe('pick', () => {
  it('nie wychodzi poza tablicę', () => {
    expect(pick(['a', 'b'], () => 0.999)).toBe('b');
    expect(pick(['a', 'b'], () => 1)).toBe('a');
  });
});

describe('kwestie o porze roku i pogodzie', () => {
  const L = content.seasonLines;
  const SUN = /słońc|słonecz/i;

  it('jesienią jest pumpkin spice latte; kwestie o kotku mają {kot}', () => {
    expect(L.season.autumn.some((l) => l.includes('pumpkin spice latte'))).toBe(true);
    for (const pool of [...Object.values(L.catWeather), ...Object.values(L.catSeason)]) {
      for (const l of pool ?? []) expect(l).toContain('{kot}');
    }
  });

  it('kotek w słoneczku to kwestia pogodowa (pogodnie), a latem kotek szuka chłodnego kąta', () => {
    expect(L.catWeather.sunny).toEqual(['{kot} wygrzewa się w słoneczku.']);
    expect(L.catSeason.summer).toEqual(['{kot} szuka chłodnego kąta.']);
  });

  it('weatherLines: w dzień wszystkie kwestie, nocą bez słońca; pogodna noc — gwiazdy i księżyc', () => {
    expect(weatherLines('sunny', false)).toBe(L.weather.sunny);
    expect(weatherLines('sunny', true)).toBe(content.lines.windowNight);
    expect(weatherLines('cloudy', false)).toBe(L.weather.cloudy);
    expect(weatherLines('cloudy', true)).toEqual(['Szaro dziś…']);
    for (const w of ['sunny', 'cloudy', 'rain', 'storm', 'snow', 'frost'] as const) {
      const night = weatherLines(w, true);
      expect(night.length, w).toBeGreaterThan(0);
      for (const l of night) expect(l, w).not.toMatch(SUN);
    }
  });

  it('worldLine: z pory roku, pogody albo o kotku w tej pogodzie/porze roku', () => {
    const allowed = [...L.season.winter, ...L.weather.snow, ...(L.catWeather.snow ?? []), ...(L.catSeason.winter ?? [])];
    for (let i = 0; i < 20; i++) {
      expect(allowed).toContain(worldLine({ season: 'winter', weather: 'snow', night: false }, () => i / 20));
      expect(allowed).toContain(worldLine({ season: 'winter', weather: 'snow', night: true }, () => i / 20));
    }
  });

  it('worldLine: pogodna noc nie wspomina o słońcu, a kotek w słoneczku bywa tylko za dnia', () => {
    const night = { season: 'summer', weather: 'sunny', night: true } as const;
    const day = { season: 'summer', weather: 'sunny', night: false } as const;
    const catSun = L.catWeather.sunny![0];
    const seenByDay = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const l = worldLine(night, () => i / 40);
      expect(l).not.toMatch(SUN);
      expect(l).not.toBe(catSun);
      seenByDay.add(worldLine(day, () => i / 40));
    }
    expect(seenByDay.has(catSun)).toBe(true);
    // zachmurzenie nocą: bez „Chmurki zasłoniły słońce.”
    for (let i = 0; i < 20; i++) expect(worldLine({ season: 'autumn', weather: 'cloudy', night: true }, () => i / 20)).not.toMatch(SUN);
  });

  it('przy oknie: w deszcz nigdy „Ładna pogoda!”; pogodnie — zwykłe; nocą deszcz, burza i śnieg po swojemu, reszta — gwiazdy', () => {
    for (let i = 0; i < 20; i++) {
      const r = () => i / 20;
      expect(windowLine('rain', false, r)).not.toBe('Ładna pogoda!');
      expect(L.weather.rain).toContain(windowLine('rain', false, r));
      expect(content.lines.window).toContain(windowLine('sunny', false, r));
      // noc: deszcz, burza i śnieg są widoczne także nocą
      expect(L.weather.rain).toContain(windowLine('rain', true, r));
      expect(L.weather.storm).toContain(windowLine('storm', true, r));
      expect(L.weather.snow).toContain(windowLine('snow', true, r));
      // noc: pogodnie, chmury i mróz — gwiazdy i księżyc
      for (const w of ['sunny', 'cloudy', 'frost'] as const) expect(content.lines.windowNight).toContain(windowLine(w, true, r));
    }
  });

  it('powitanie: czasem o pogodzie, zwykle „Cześć!”; nocą nie o słońcu', () => {
    expect(L.weather.storm).toContain(greetingLine('storm', false, () => 0));
    expect(content.lines.greeting).toContain(greetingLine('storm', false, () => 0.99));
    expect(L.weather.sunny).toContain(greetingLine('sunny', false, () => 0));
    for (let i = 0; i < 20; i++) {
      const line = greetingLine('sunny', true, queue(0, i / 20));
      expect(line).not.toMatch(SUN);
      expect(content.lines.windowNight).toContain(line);
      expect(greetingLine('cloudy', true, queue(0, i / 20))).not.toMatch(SUN);
    }
  });

  it('pogawędka: przy dobrych potrzebach czasem o porze roku; głód dalej wygrywa', () => {
    const world = { season: 'summer', weather: 'sunny', night: false } as const;
    const ok = { hunger: 90, mood: 90, energy: 90 };
    const pool = [...L.season.summer, ...L.weather.sunny, ...(L.catWeather.sunny ?? []), ...(L.catSeason.summer ?? [])];
    // 0.9 — to nie losowy tekst, 0 — kwestia o świecie
    expect(pool).toContain(pickLine(ok, queue(0.9, 0), world));
    expect(content.lines.hungry).toContain(pickLine({ hunger: 10, mood: 90, energy: 90 }, () => 0, world));
    expect(SEASON_LINE_CHANCE).toBeGreaterThan(0.2);
    expect(SEASON_LINE_CHANCE).toBeLessThan(0.5);
  });

  it('losowe teksty Gabi zostają przy 35% także ze światem; pora roku i pogoda zajmują miejsce zwykłych kwestii', () => {
    const world = { season: 'autumn', weather: 'rain', night: false } as const;
    const ok = { hunger: 90, mood: 90, energy: 90 };
    expect(RANDOM_LINE_CHANCE).toBe(0.35);
    expect(content.lines.random).toContain(pickLine(ok, queue(0), world));
    expect(content.lines.random).toContain(pickLine(ok, queue(RANDOM_LINE_CHANCE - 0.01), world));
    expect(content.lines.happy).toContain(pickLine(ok, queue(0.9, 0.99), world));
    // łączny udział kwestii o świecie to nadal SEASON_LINE_CHANCE
    expect((1 - RANDOM_LINE_CHANCE) * (SEASON_LINE_CHANCE / (1 - RANDOM_LINE_CHANCE))).toBeCloseTo(SEASON_LINE_CHANCE);
    // bez świata nic się nie zmienia
    expect(content.lines.random).toContain(pickLine(ok, first));
    expect(content.lines.happy).toContain(pickLine(ok, () => 0.9));
  });
});

describe('clockLines: kwestie zegara ściennego', () => {
  it('noc przed porą snu (zimą od 17:00) — „za oknem ciemno”, a w porze snu — „dobranoc”', () => {
    expect(clockLines('night', true)).toBe(content.lines.clockNight);
    expect(clockLines('night', false)).toBe(content.lines.clockDark);
  });

  it('rano, w dzień i wieczorem — kwestie tej pory dnia, niezależnie od pory snu', () => {
    for (const bedtime of [true, false]) {
      expect(clockLines('morning', bedtime)).toBe(content.lines.clockMorning);
      expect(clockLines('day', bedtime)).toBe(content.lines.clockDay);
      expect(clockLines('evening', bedtime)).toBe(content.lines.clockEvening);
    }
  });

  it('każda kwestia „za oknem ciemno” ma {czas} i nie mówi „już” (pasuje i do zimowego wieczoru, i do poranka)', () => {
    expect(content.lines.clockDark.length).toBeGreaterThan(0);
    for (const l of content.lines.clockDark) {
      expect(l).toContain('{czas}');
      expect(l).not.toMatch(/już/i);
    }
  });
});

describe('clockLinesAt: kwestie zegara wg daty', () => {
  it('zimą wcześnie robi się ciemno (przed porą snu), a po 21 jest pora spać', () => {
    expect(clockLinesAt(new Date(2026, 0, 10, 18, 0))).toBe(content.lines.clockDark);
    expect(clockLinesAt(new Date(2026, 0, 10, 22, 0))).toBe(content.lines.clockNight);
  });

  it('zimowy poranek 6:30 — jeszcze ciemno, ale to już po porze snu', () => {
    expect(clockLinesAt(new Date(2026, 0, 10, 6, 30))).toBe(content.lines.clockDark);
  });

  it('w dzień — kwestie dnia', () => {
    expect(clockLinesAt(new Date(2026, 9, 9, 12, 0))).toBe(content.lines.clockDay);
  });
});

describe('głodny kotek', () => {
  it('kwestie nie przesądzają o płci kotka', () => {
    for (const l of content.lines.catHungry) {
      expect(l).toContain('{kot}');
      expect(l).not.toMatch(/głodn/i);
    }
  });
});
