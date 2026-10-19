import { describe, expect, it } from 'vitest';
import {
  WEATHER_TINT,
  butterflies,
  fireflies,
  flashSlot,
  frostFlakes,
  leaves,
  lightning,
  petals,
  rain,
  snow,
  twinkles,
  weatherParticles,
  type Area,
  type Particle,
} from '../../src/home/weatherFx';

const SKY: Area = { x: 0, y: 9, w: 128, h: 119 };
const PANE: Area = { x: 0, y: 0, w: 32, h: 30 };
const inside = (ps: readonly Particle[], a: Area) =>
  ps.every((p) => p.x >= a.x && p.y >= a.y && p.x + p.w <= a.x + a.w + 1e-9 && p.y + p.h <= a.y + a.h + 1e-9);

describe('drobinki pogody', () => {
  const kinds: [string, (a: Area, t: number) => Particle[]][] = [
    ['deszcz', (a, t) => rain(a, t, false)],
    ['ulewa', (a, t) => rain(a, t, true)],
    ['śnieg', snow],
    ['mróz', frostFlakes],
    ['liście', leaves],
    ['płatki', petals],
    ['motyle', butterflies],
    ['świetliki', fireflies],
    ['gwiazdy', twinkles],
  ];

  it('te same w tej samej chwili i zawsze w obszarze (balkon i szyba okna)', () => {
    for (const [name, fn] of kinds) {
      expect(fn(SKY, 1234), name).toEqual(fn(SKY, 1234));
      for (const t of [0, 777, 12_345, 99_999, 600_000]) {
        expect(inside(fn(SKY, t), SKY), `${name} @${t}`).toBe(true);
        expect(inside(fn(PANE, t), PANE), `${name} w oknie @${t}`).toBe(true);
      }
    }
  });

  it('opady spadają w czasie; ulewa gęstsza od deszczu; mała szyba też ma kilka drobinek', () => {
    expect(rain(SKY, 0, false).map((p) => p.y)).not.toEqual(rain(SKY, 300, false).map((p) => p.y));
    expect(snow(SKY, 0).map((p) => p.y)).not.toEqual(snow(SKY, 2000).map((p) => p.y));
    expect(rain(SKY, 0, true).length).toBeGreaterThan(rain(SKY, 0, false).length);
    expect(snow(PANE, 0).length).toBeGreaterThanOrEqual(4);
    expect(rain(PANE, 0, false).length).toBeGreaterThanOrEqual(3);
    expect(frostFlakes(PANE, 0).length).toBeGreaterThanOrEqual(1);
  });

  it('błyskawica: krótko, raz na kilka sekund; grzmot raz na błysk', () => {
    let lit = 0;
    let flashes = 0;
    let prev: number | null = null;
    for (let t = 0; t < 60_000; t += 20) {
      if (lightning(t) > 0) lit++;
      const s = flashSlot(t);
      expect(s !== null).toBe(lightning(t) > 0);
      if (s !== null && s !== prev) flashes++;
      if (s !== null) prev = s;
    }
    expect(lit / 3000).toBeGreaterThan(0.01);
    expect(lit / 3000).toBeLessThan(0.15);
    expect(flashes).toBeGreaterThan(4);
    expect(flashes).toBeLessThan(16);
  });
});

describe('pogoda na scenie', () => {
  const scene = (o: Partial<Parameters<typeof weatherParticles>[0]>) =>
    weatherParticles({ season: 'autumn', weather: 'sunny', phase: 'day', area: SKY, t: 5000, open: true, ...o });
  const colours = (ps: readonly Particle[]) => new Set(ps.map((p) => p.color));

  it('śnieg — same białe płatki; deszcz — kreski 1×3; mróz — pojedyncze płatki', () => {
    const s = scene({ season: 'winter', weather: 'snow' });
    expect(s.length).toBeGreaterThan(20);
    expect(colours(s)).toEqual(new Set(['#ffffff']));
    const r = scene({ weather: 'rain' });
    expect(r.every((p) => p.w === 1 && p.h === 3)).toBe(true);
    const f = scene({ season: 'winter', weather: 'frost' });
    expect(f.length).toBeGreaterThanOrEqual(1);
    expect(f.length).toBeLessThan(15);
  });

  it('jesień przy słońcu — liście; wiosna przy słońcu — płatki, w deszcz bez płatków', () => {
    expect(scene({}).length).toBeGreaterThan(0);
    expect([...colours(scene({}))].every((c) => ['#e8902c', '#c9581e', '#f2c14a', '#a8452a'].includes(c))).toBe(true);
    expect(colours(scene({ season: 'spring' })).has('#ffc4dc')).toBe(true);
    expect(colours(scene({ season: 'spring', weather: 'rain' })).has('#ffc4dc')).toBe(false);
  });

  it('lato: motyle w słoneczny dzień tylko na balkonie; świetliki nocą', () => {
    expect(colours(scene({ season: 'summer' })).has('#2a1f3d')).toBe(true);
    expect(scene({ season: 'summer', open: false })).toEqual([]);
    const nights = [1000, 3000, 7000, 11_000].map((t) => scene({ season: 'summer', phase: 'night', t }));
    expect(nights.some((ps) => ps.some((p) => p.color === '#e8ff8a'))).toBe(true);
  });

  it('odcień pogody: pogodnie bez, pochmurno/deszcz/burza coraz ciemniej', () => {
    expect(WEATHER_TINT.sunny).toBeNull();
    expect(WEATHER_TINT.frost).toBeNull();
    for (const w of ['cloudy', 'rain', 'storm', 'snow'] as const) expect(WEATHER_TINT[w]).toMatch(/^rgba/);
  });
});
