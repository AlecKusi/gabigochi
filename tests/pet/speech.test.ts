import { describe, expect, it } from 'vitest';
import { SEASON_LINE_CHANCE, clockLines, greetingLine, pick, pickLine, windowLine, worldLine } from '../../src/pet/speech';
import { content } from '../../src/content';

const first = () => 0;

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

  it('jesienią jest pumpkin spice latte; kwestie o kotku mają {kot}', () => {
    expect(L.season.autumn.some((l) => l.includes('pumpkin spice latte'))).toBe(true);
    for (const pool of [...Object.values(L.catWeather), ...Object.values(L.catSeason)]) {
      for (const l of pool ?? []) expect(l).toContain('{kot}');
    }
  });

  it('worldLine: z pory roku, pogody albo o kotku w tej pogodzie/porze roku', () => {
    const allowed = [...L.season.winter, ...L.weather.snow, ...(L.catWeather.snow ?? []), ...(L.catSeason.winter ?? [])];
    for (let i = 0; i < 20; i++) expect(allowed).toContain(worldLine({ season: 'winter', weather: 'snow' }, () => i / 20));
  });

  it('przy oknie: w deszcz nigdy „Ładna pogoda!”; pogodnie — zwykłe; nocą gwiazdy, a w śnieg — śnieg', () => {
    for (let i = 0; i < 20; i++) {
      const r = () => i / 20;
      expect(windowLine('rain', false, r)).not.toBe('Ładna pogoda!');
      expect(L.weather.rain).toContain(windowLine('rain', false, r));
      expect(content.lines.window).toContain(windowLine('sunny', false, r));
      expect(content.lines.windowNight).toContain(windowLine('rain', true, r));
      expect(L.weather.snow).toContain(windowLine('snow', true, r));
    }
  });

  it('powitanie: czasem o pogodzie, zwykle „Cześć!”', () => {
    expect(L.weather.storm).toContain(greetingLine('storm', () => 0));
    expect(content.lines.greeting).toContain(greetingLine('storm', () => 0.99));
  });

  it('pogawędka: przy dobrych potrzebach czasem o porze roku; głód dalej wygrywa', () => {
    const world = { season: 'summer', weather: 'sunny' } as const;
    const ok = { hunger: 90, mood: 90, energy: 90 };
    const pool = [...L.season.summer, ...L.weather.sunny, ...(L.catWeather.sunny ?? []), ...(L.catSeason.summer ?? [])];
    expect(pool).toContain(pickLine(ok, () => 0, world));
    expect(content.lines.hungry).toContain(pickLine({ hunger: 10, mood: 90, energy: 90 }, () => 0, world));
    expect(SEASON_LINE_CHANCE).toBeGreaterThan(0.2);
    expect(SEASON_LINE_CHANCE).toBeLessThan(0.5);
  });
});

describe('clockLines: kwestie zegara ściennego', () => {
  it('noc przed porą snu (zimą od 17:00) — „już ciemno”, a w porze snu — „dobranoc”', () => {
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

  it('każda kwestia „już ciemno” ma {czas}', () => {
    expect(content.lines.clockDark.length).toBeGreaterThan(0);
    for (const l of content.lines.clockDark) expect(l).toContain('{czas}');
  });
});
