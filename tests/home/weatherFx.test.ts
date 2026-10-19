import { describe, expect, it } from 'vitest';
import {
  SUN_BOX,
  WEATHER_TINT,
  butterflies,
  fireflies,
  flashSlot,
  frostFlakes,
  leaves,
  lightning,
  overcast,
  petals,
  rain,
  snow,
  splashes,
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
    ['rozpryski', (a, t) => splashes(a, t, true)],
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
    // mróz: tylko czasem pojedynczy płatek
    let frostSeen = 0;
    for (let t = 0; t <= 30_000; t += 500) {
      const n = frostFlakes(PANE, t).length;
      frostSeen = Math.max(frostSeen, n);
      expect(n, `mróz @${t}`).toBeLessThanOrEqual(3);
    }
    expect(frostSeen).toBeGreaterThanOrEqual(1);
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

  it('błyski (a z nimi grzmoty) nigdy się nie nakładają: co najmniej 2,4 s odstępu', () => {
    const starts: number[] = [];
    let prev: number | null = null;
    for (let t = 0; t < 10 * 60_000; t += 10) {
      const s = flashSlot(t);
      if (s !== null && s !== prev) starts.push(t);
      if (s !== null) prev = s;
    }
    expect(starts.length).toBeGreaterThan(50);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i] - starts[i - 1], `odstęp przed błyskiem @${starts[i]}`).toBeGreaterThanOrEqual(2400);
    }
  });
});

describe('pogoda na scenie', () => {
  const scene = (o: Partial<Parameters<typeof weatherParticles>[0]>) =>
    weatherParticles({ season: 'autumn', weather: 'sunny', phase: 'day', area: SKY, t: 5000, open: true, ...o });
  const colours = (ps: readonly Particle[]) => new Set(ps.map((p) => p.color));

  it('śnieg — same białe płatki; deszcz — kreski 1×3; mróz — tylko czasem pojedyncze płatki', () => {
    const s = scene({ season: 'winter', weather: 'snow' });
    expect(s.length).toBeGreaterThan(20);
    expect(colours(s)).toEqual(new Set(['#ffffff']));
    const r = scene({ weather: 'rain', open: false });
    expect(r.every((p) => p.w === 1 && p.h === 3)).toBe(true);
    let frostMax = 0;
    for (let t = 0; t <= 30_000; t += 1000) {
      frostMax = Math.max(frostMax, scene({ season: 'winter', weather: 'frost', t }).length);
    }
    expect(frostMax).toBeGreaterThanOrEqual(1);
    expect(frostMax).toBeLessThan(8);
  });

  it('deszcz na balkonie rozpryskuje się przy samej krawędzi (w oknie — bez rozprysków)', () => {
    let splashed = 0;
    for (let t = 0; t <= 2000; t += 50) {
      for (const p of scene({ weather: 'rain', open: true, t })) {
        if (p.w === 1 && p.h === 1 && p.y >= SKY.y + SKY.h - 2) splashed++;
      }
    }
    expect(splashed).toBeGreaterThan(0);
    expect(scene({ weather: 'storm', open: false }).every((p) => !(p.w === 1 && p.h === 1))).toBe(true);
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

  it('chmury: szare przy pochmurnej pogodzie, deszczu, burzy i śniegu — całkiem zasłaniają słońce i księżyc', () => {
    for (const weather of ['cloudy', 'rain', 'storm', 'snow'] as const) {
      for (const night of [false, true]) {
        for (const t of [0, 123_456]) {
          const cs = overcast(SKY, t, weather, night);
          expect(cs.length, `${weather} ${night} @${t}`).toBeGreaterThan(0);
          expect(inside(cs, SKY)).toBe(true);
          for (let x = SUN_BOX.x; x < SUN_BOX.x + SUN_BOX.w; x++) {
            for (let y = SUN_BOX.y; y < SUN_BOX.y + SUN_BOX.h; y++) {
              const covered = cs.some((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
              expect(covered, `${weather} ${night ? 'noc' : 'dzień'} @${t}: piksel ${x},${y}`).toBe(true);
            }
          }
        }
      }
    }
    expect(overcast(SKY, 0, 'sunny', false)).toEqual([]);
    expect(overcast(SKY, 0, 'frost', true)).toEqual([]);
  });

  it('odcień pogody: pogodnie bez, pochmurno/deszcz/burza coraz ciemniej', () => {
    expect(WEATHER_TINT.sunny).toBeNull();
    expect(WEATHER_TINT.frost).toBeNull();
    for (const w of ['cloudy', 'rain', 'storm', 'snow'] as const) expect(WEATHER_TINT[w]).toMatch(/^rgba/);
  });
});
