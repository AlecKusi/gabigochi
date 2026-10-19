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
  mirrorIn,
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
  });

  it('mróz: kilka wolnych płatków, stała liczba (bez pojawiania się i znikania)', () => {
    const skyCount = frostFlakes(SKY, 0).length;
    const paneCount = frostFlakes(PANE, 0).length;
    expect(skyCount).toBeGreaterThanOrEqual(1);
    expect(skyCount).toBeLessThanOrEqual(3);
    expect(paneCount).toBe(1);
    for (let t = 0; t <= 60_000; t += 500) {
      expect(frostFlakes(SKY, t).length, `balkon @${t}`).toBe(skyCount);
      expect(frostFlakes(PANE, t).length, `szyba @${t}`).toBe(paneCount);
    }
  });

  it('mnożnik gęstości: więcej drobinek, wciąż w obszarze i te same pierwsze (płynnie)', () => {
    const fns: [string, (a: Area, t: number, k?: number) => Particle[]][] = [
      ['deszcz', (a, t, k) => rain(a, t, false, k)],
      ['ulewa', (a, t, k) => rain(a, t, true, k)],
      ['śnieg', snow],
      ['mróz', frostFlakes],
      ['liście', leaves],
      ['płatki', petals],
    ];
    expect(rain(PANE, 0, false, 3).length).toBeGreaterThan(rain(PANE, 0, false).length);
    for (const [name, fn] of fns) {
      const dense = fn(SKY, 4321, 3);
      const base = fn(SKY, 4321);
      expect(dense.length, name).toBeGreaterThan(base.length);
      expect(fn(SKY, 4321, 1), name).toEqual(base);
      expect(dense.slice(0, base.length), name).toEqual(base);
      expect(inside(dense, SKY), name).toBe(true);
    }
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

  it('śnieg — same białe płatki; deszcz — kreski 1×3; mróz — zawsze 1–3 płatki', () => {
    const s = scene({ season: 'winter', weather: 'snow' });
    expect(s.length).toBeGreaterThan(20);
    expect(colours(s)).toEqual(new Set(['#ffffff']));
    const r = scene({ weather: 'rain', open: false });
    expect(r.every((p) => p.w === 1 && p.h === 3)).toBe(true);
    for (let t = 0; t <= 30_000; t += 1000) {
      const n = scene({ season: 'winter', weather: 'frost', t }).length;
      expect(n, `mróz @${t}`).toBeGreaterThanOrEqual(1);
      expect(n, `mróz @${t}`).toBeLessThanOrEqual(3);
    }
  });

  it('gęstość sceny: więcej opadów, wszystko w obszarze (obszar nie od zera)', () => {
    const area: Area = { x: 5, y: 7, w: 60, h: 50 };
    const cases: Partial<Parameters<typeof weatherParticles>[0]>[] = [
      { weather: 'rain' },
      { weather: 'storm' },
      { season: 'winter', weather: 'snow' },
      { season: 'winter', weather: 'frost' },
      { season: 'autumn', weather: 'sunny' },
      { season: 'spring', weather: 'sunny' },
    ];
    for (const c of cases) {
      const label = `${c.season ?? 'autumn'} ${c.weather}`;
      const base = scene({ ...c, area, open: false });
      for (const t of [0, 1500, 77_777]) {
        const dense = scene({ ...c, area, open: false, t, density: 3 });
        expect(dense.length, label).toBeGreaterThan(0);
        expect(inside(dense, area), `${label} @${t}`).toBe(true);
      }
      const denser = scene({ ...c, area, open: false, density: 3 }).length;
      // mróz to zawsze kilka płatków (przy małym obszarze działa minimum), reszta wyraźnie gęstnieje
      if (c.weather === 'frost') expect(denser, label).toBeGreaterThanOrEqual(base.length);
      else expect(denser, label).toBeGreaterThan(base.length);
      expect(scene({ ...c, area, open: false, density: 1 }), label).toEqual(base);
    }
  });

  it('odbicie drobinek w obszarze: zostają w nim, x odbity względem środka obszaru, reszta bez zmian', () => {
    const area: Area = { x: 5, y: 7, w: 20, h: 18 };
    const ps = snow(area, 3000, 3);
    const m = mirrorIn(ps, area);
    expect(m.length).toBe(ps.length);
    expect(inside(m, area)).toBe(true);
    m.forEach((p, i) => {
      expect(p.x).toBeCloseTo(area.x + area.w - (ps[i].x + ps[i].w - area.x), 9);
      expect({ ...p, x: 0 }).toEqual({ ...ps[i], x: 0 });
    });
    expect(mirrorIn(m, area)).toEqual(ps);
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

  it('chmury nie zakrywają sopla przy słońcu (x 79–81, y 8–12) ani nie wychodzą ponad niebo', () => {
    for (const weather of ['cloudy', 'rain', 'storm', 'snow'] as const) {
      for (let t = 0; t <= 600_000; t += 7919) {
        const cs = overcast(SKY, t, weather, false);
        expect(inside(cs, SKY)).toBe(true);
        const hit = cs.find((c) => c.x < 82 && c.x + c.w > 79 && c.y < 13 && c.y + c.h > 8);
        expect(hit, `${weather} @${t}`).toBeUndefined();
      }
    }
  });

  it('odcień pogody: pogodnie bez, pochmurno/deszcz/burza coraz ciemniej', () => {
    expect(WEATHER_TINT.sunny).toBeNull();
    expect(WEATHER_TINT.frost).toBeNull();
    for (const w of ['cloudy', 'rain', 'storm', 'snow'] as const) expect(WEATHER_TINT[w]).toMatch(/^rgba/);
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
});
