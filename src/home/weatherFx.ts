import { skyHash as hash } from './balconySky';
import type { DayPhase } from './daytime';
import type { Season, Weather } from './season';

/**
 * Drobinki pogody i pór roku jako czyste funkcje czasu (te same dla tej samej chwili): deszcz, ulewa, śnieg,
 * pojedyncze płatki przy mrozie, liście jesienią, płatki kwiatów wiosną, motyle i świetliki latem, migotanie gwiazd,
 * błyskawice i szare chmury. Współrzędne w obszarze `Area` — na balkonie px logiczne pokoju, w oknie px natywne sprite'a.
 */

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Jeden prostokącik do narysowania (kropla, płatek, liść…). */
export interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const wrap = (v: number, span: number) => ((v % span) + span) % span;

/** Ile drobinek na tę powierzchnię (gęstość na px², `k` — mnożnik gęstości), co najmniej `min`. */
const countFor = (a: Area, density: number, min: number, k = 1) => Math.max(min, Math.round(a.w * a.h * density * k));

interface Fall {
  /** Prędkość spadania (px/s): od–do. */
  speed: readonly [number, number];
  /** Dryf w bok (px/s). */
  drift: number;
  /** Kołysanie na boki (px). */
  sway: number;
  size: (i: number, t: number) => readonly [number, number];
  color: (i: number) => string;
}

/** Drobinki spadające w dół (zawijane w obszarze), z dryfem w bok i kołysaniem. */
function falling(a: Area, t: number, n: number, seed: number, o: Fall): Particle[] {
  const out: Particle[] = [];
  const s = t / 1000;
  for (let i = 0; i < n; i++) {
    const k = i + seed * 1000;
    const speed = o.speed[0] + hash(k * 1.3 + 0.1) * (o.speed[1] - o.speed[0]);
    const [w, h] = o.size(i, t);
    const y = a.y + wrap(hash(k * 3.3 + 0.7) * a.h + s * speed, a.h);
    const x = a.x + wrap(hash(k * 2.1 + 0.3) * a.w + s * o.drift + Math.sin(t / 900 + i) * o.sway, a.w);
    out.push({ x: Math.min(x, a.x + a.w - w), y: Math.min(y, a.y + a.h - h), w, h, color: o.color(i) });
  }
  return out;
}

/** Deszcz (ukośne kreski 1×3); `heavy` — ulewa (burza); `k` — mnożnik gęstości. */
export function rain(a: Area, t: number, heavy: boolean, k = 1): Particle[] {
  return falling(a, t, countFor(a, heavy ? 0.006 : 0.0035, heavy ? 5 : 3, k), 1, {
    speed: heavy ? [150, 190] : [110, 150],
    drift: heavy ? 45 : 25,
    sway: 0,
    size: () => [1, 3],
    color: () => 'rgba(205, 222, 255, 0.75)',
  });
}

/** Śnieg: płatki 1–2 px, różna prędkość, kołysanie. */
export function snow(a: Area, t: number, k = 1): Particle[] {
  return falling(a, t, countFor(a, 0.004, 4, k), 2, {
    speed: [8, 16],
    drift: 2,
    sway: 3,
    size: (i) => (hash(i * 5.7) > 0.8 ? [2, 2] : [1, 1]),
    color: () => '#ffffff',
  });
}

/** Mróz: zaledwie kilka wolnych płatków (bez migania — liczba stała, płatki zawijają się na brzegach). */
export function frostFlakes(a: Area, t: number, k = 1): Particle[] {
  return falling(a, t, countFor(a, 0.0001, 1, k), 3, {
    speed: [6, 10],
    drift: 1,
    sway: 2,
    size: () => [1, 1],
    color: () => '#f4fbff',
  });
}

const SPLASH = 'rgba(220, 235, 255, 0.85)';

/** Rozpryski deszczu przy krawędzi balkonu (dolny rząd obszaru): kropla uderza i rozpryskuje się na boki. */
export function splashes(a: Area, t: number, heavy: boolean): Particle[] {
  const out: Particle[] = [];
  const n = Math.max(2, Math.round(a.w / (heavy ? 10 : 16)));
  const y = a.y + a.h - 1;
  for (let i = 0; i < n; i++) {
    const period = 500 + hash(i * 6.1 + 0.9) * 600;
    const local = wrap(t + hash(i * 3.9 + 0.2) * period, period);
    if (local >= 180) continue;
    const x = Math.round(a.x + 1 + hash(i * 4.7 + 0.5) * (a.w - 3));
    if (local < 90) out.push({ x, y, w: 1, h: 1, color: SPLASH });
    else out.push({ x: x - 1, y: y - 1, w: 1, h: 1, color: SPLASH }, { x: x + 1, y: y - 1, w: 1, h: 1, color: SPLASH });
  }
  return out;
}

const LEAF_COLORS = ['#e8902c', '#c9581e', '#f2c14a', '#a8452a'];

/** Jesienne liście: koziołkują (2×1 ↔ 1×2), lecą z wiatrem. */
export function leaves(a: Area, t: number, k = 1): Particle[] {
  return falling(a, t, countFor(a, 0.0011, 2, k), 4, {
    speed: [10, 20],
    drift: 12,
    sway: 6,
    size: (i, tt) => (Math.floor(tt / 250 + i) % 2 ? [2, 1] : [1, 2]),
    color: (i) => LEAF_COLORS[i % LEAF_COLORS.length],
  });
}

const PETAL_COLORS = ['#ffc4dc', '#ffffff', '#ffb0cf'];

/** Wiosenne płatki kwiatów. */
export function petals(a: Area, t: number, k = 1): Particle[] {
  return falling(a, t, countFor(a, 0.0015, 2, k), 5, {
    speed: [7, 14],
    drift: 9,
    sway: 5,
    size: () => [1, 1],
    color: (i) => PETAL_COLORS[i % PETAL_COLORS.length],
  });
}

const WING_COLORS = ['#ffd34d', '#ff9ad5', '#9ad0ff'];

/** Trzy motyle: tułów i machające skrzydła, krążą w dolnej części obszaru. */
export function butterflies(a: Area, t: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 3; i++) {
    const cx = a.x + a.w * (0.2 + 0.3 * i) + Math.sin(t / 800 + i * 2) * Math.min(14, a.w * 0.12);
    const cy = a.y + a.h * 0.6 + Math.cos(t / 600 + i) * Math.min(10, a.h * 0.12);
    const ww = Math.floor(t / 150 + i) % 2 === 0 ? 2 : 1;
    const x = Math.min(Math.max(Math.round(cx), a.x + ww), a.x + a.w - 1 - ww);
    const y = Math.min(Math.max(Math.round(cy), a.y), a.y + a.h - 2);
    out.push(
      { x: x - ww, y, w: ww, h: 2, color: WING_COLORS[i] },
      { x, y, w: 1, h: 2, color: '#2a1f3d' },
      { x: x + 1, y, w: ww, h: 2, color: WING_COLORS[i] },
    );
  }
  return out;
}

/** Świetliki: migające żółtozielone punkciki nisko, nad krzakami. */
export function fireflies(a: Area, t: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 10; i++) {
    if (wrap(t / 400 + hash(i * 7.1) * 10, 3) >= 1.6) continue;
    const x = a.x + hash(i * 2.9 + 0.4) * (a.w - 1) + Math.sin(t / 1300 + i) * 2;
    const y = a.y + a.h * 0.45 + hash(i * 4.3 + 0.2) * (a.h * 0.55 - 1) + Math.cos(t / 1100 + i) * 2;
    out.push({
      x: Math.min(Math.max(x, a.x), a.x + a.w - 1),
      y: Math.min(Math.max(y, a.y), a.y + a.h - 1),
      w: 1,
      h: 1,
      color: '#e8ff8a',
    });
  }
  return out;
}

/** Migoczące gwiazdy w górnej części nieba: każda co chwilę na moment rozbłyska. */
export function twinkles(a: Area, t: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 14; i++) {
    const period = 1800 + hash(i * 2.3) * 2600;
    if (wrap(t + hash(i * 9.1) * period, period) / period >= 0.15) continue;
    out.push({
      x: a.x + Math.floor(hash(i * 5.9 + 0.3) * a.w),
      y: a.y + Math.floor(hash(i * 6.7 + 0.8) * a.h * 0.45),
      w: 1,
      h: 1,
      color: '#ffffff',
    });
  }
  return out;
}

/** Co tyle ms jest szansa na błyskawicę (w burzy). */
export const LIGHTNING_SLOT_MS = 4200;
const LIGHTNING_CHANCE = 0.7;
/** Błysk zaczyna się w pierwszych 1700 ms okna — kolejne błyski (i grzmoty) dzieli co najmniej 2,5 s. */
const FLASH_WINDOW_MS = 1700;

/** Początek błysku w oknie czasu `slot` (ms) albo null — w tym oknie bez błyskawicy. */
function flashStart(slot: number): number | null {
  if (hash(slot * 3.71 + 0.5) > LIGHTNING_CHANCE) return null;
  return slot * LIGHTNING_SLOT_MS + hash(slot * 1.93 + 0.2) * FLASH_WINDOW_MS;
}

/** Jasność błysku burzy w chwili `t` (0–1): podwójne mignięcie raz na kilka sekund. */
export function lightning(t: number): number {
  const slot = Math.floor(t / LIGHTNING_SLOT_MS);
  const start = flashStart(slot);
  if (start === null) return 0;
  const local = t - start;
  if (local >= 0 && local < 120) return 1;
  if (local >= 220 && local < 300) return 0.6;
  return 0;
}

/** Numer okna czasu z trwającym błyskiem (grzmot raz na błysk) albo null. */
export function flashSlot(t: number): number | null {
  return lightning(t) > 0 ? Math.floor(t / LIGHTNING_SLOT_MS) : null;
}

/** Co w danej chwili pada albo lata (balkon: `open` — także motyle i świetliki; okno: tylko opady). */
export interface WeatherScene {
  season: Season;
  weather: Weather;
  phase: DayPhase;
  area: Area;
  t: number;
  open: boolean;
  /** Mnożnik gęstości opadów i listowia (domyślnie 1) — np. gęściej na małej szybie okna. */
  density?: number;
}

export function weatherParticles(s: WeatherScene): Particle[] {
  const { area: a, t } = s;
  const k = s.density ?? 1;
  const out: Particle[] = [];
  const daylight = s.phase === 'day' || s.phase === 'morning';
  if (s.weather === 'rain' || s.weather === 'storm') out.push(...rain(a, t, s.weather === 'storm', k));
  if (s.open && (s.weather === 'rain' || s.weather === 'storm')) out.push(...splashes(a, t, s.weather === 'storm'));
  if (s.weather === 'snow') out.push(...snow(a, t, k));
  if (s.weather === 'frost') out.push(...frostFlakes(a, t, k));
  if (s.season === 'autumn' && (s.weather === 'sunny' || s.weather === 'cloudy')) out.push(...leaves(a, t, k));
  if (s.season === 'spring' && s.weather === 'sunny') out.push(...petals(a, t, k));
  if (s.open && s.season === 'summer' && s.weather === 'sunny' && daylight) out.push(...butterflies(a, t));
  if (s.open && s.season === 'summer' && s.phase === 'night' && (s.weather === 'sunny' || s.weather === 'cloudy')) {
    out.push(...fireflies(a, t));
  }
  return out;
}

/**
 * Drobinki odbite w poziomie w obrębie obszaru `a` (nadal w nim): okno odbite (`flip`) rysujemy odwróconą warstwą,
 * więc odbicie z góry sprawia, że na ekranie wiatr dalej wieje w tę samą stronę.
 */
export function mirrorIn(ps: readonly Particle[], a: Area): Particle[] {
  return ps.map((p) => ({ ...p, x: 2 * a.x + a.w - p.x - p.w }));
}

/** Kolor chmur: [dzień, noc]. Pogodnie i przy mrozie — bez chmur. */
const OVERCAST: Readonly<Partial<Record<Weather, readonly [string, string]>>> = {
  cloudy: ['#c9ced8', '#4a4d66'],
  rain: ['#9aa2b2', '#3e4258'],
  storm: ['#5d6378', '#2e3146'],
  snow: ['#dfe3ea', '#7d8296'],
};

/** Namalowane słońce i księżyc (px logiczne balkonu) z marginesem 1 px. */
export const SUN_BOX: Area = { x: 83, y: 10, w: 15, h: 15 };

/**
 * Szare chmury przy pochmurnej pogodzie, deszczu, burzy i śniegu: jedna stoi na słońcu/księżycu (zasłania je),
 * pięć płynie powoli w prawo. Prostokąty przycięte do obszaru `a` (niebo balkonu).
 */
export function overcast(a: Area, t: number, weather: Weather, night: boolean): Particle[] {
  const c = OVERCAST[weather];
  if (!c) return [];
  const color = night ? c[1] : c[0];
  const out: Particle[] = [];
  const push = (x: number, y: number, w: number, h: number) => {
    const x0 = Math.max(a.x, Math.round(x));
    const x1 = Math.min(a.x + a.w, Math.round(x + w));
    const y0 = Math.max(a.y, Math.round(y));
    const y1 = Math.min(a.y + a.h, Math.round(y + h));
    if (x1 > x0 && y1 > y0) out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color });
  };
  // stała chmura na słońcu/księżycu: korpus i szerszy dół (schodkowo)
  push(SUN_BOX.x - 1, a.y, SUN_BOX.w + 2, SUN_BOX.h + 1);
  push(SUN_BOX.x - 6, SUN_BOX.y + 8, SUN_BOX.w + 12, 9);
  for (let i = 0; i < 5; i++) {
    const w = 24 + Math.round(hash(i * 2.7 + 0.4) * 14);
    const span = a.w + w + 20;
    const x = a.x - w - 10 + wrap(hash(i * 5.1 + 0.2) * span + (t / 1000) * (1.5 + i * 0.4), span);
    const y = a.y + 9 + Math.round(hash(i * 3.3 + 0.9) * 26);
    const top = Math.round(w * 0.25);
    push(x, y, w, 5);
    push(x + top, y - 3, w - 2 * top, 3);
  }
  return out;
}

/** Odcień pogody: na tło balkonu i na okna (pogodnie i przy mrozie bez zmian). */
export const WEATHER_TINT: Readonly<Record<Weather, string | null>> = {
  sunny: null,
  frost: null,
  cloudy: 'rgba(110, 118, 140, 0.22)',
  rain: 'rgba(60, 70, 100, 0.32)',
  storm: 'rgba(35, 38, 62, 0.42)',
  snow: 'rgba(190, 200, 225, 0.14)',
};
