import type { Reward } from './types';

/**
 * Skaczący kotek: kotek biegnie sam, coraz szybciej; stuknięcie = skok nad doniczkami i ogórkami. Nad niektórymi
 * przeszkodami wiszą rybki — łapie je w skoku. Pierwsze zderzenie kończy bieg.
 * Wysokości liczone od ziemi w górę (px logiczne), x — w prawo.
 */
export const RUN = {
  W: 128,
  H: 112,
  /** Linia ziemi (px od góry ekranu). */
  groundY: 92,
  catX: 26,
  /** Pole kota do zderzeń: tułów bez ogona (środek przesunięty ku głowie), trochę mniejsze — wybacza muśnięcie. */
  catOffset: 3,
  catW: 16,
  catH: 11,
  gravity: 760,
  jumpV: 230,
  /** Prędkość biegu (px/s): start, przyrost na sekundę, najwięcej. */
  speed0: 55,
  accel: 1.6,
  speedMax: 120,
  /** Wysoka doniczka pojawia się dopiero od tej prędkości (wcześniej nie da się nad nią przeskoczyć). */
  tallFrom: 75,
  fishChance: 0.3,
  /** Rybka wisi tak wysoko nad ziemią (łapie się ją w skoku). */
  fishH: 26,
  fishPoints: 5,
  /** Punkt za każde tyle px biegu. */
  metre: 10,
} as const;

export type ObstacleKind = 'pot' | 'cucumber' | 'tall';

export const OBSTACLES: Readonly<Record<ObstacleKind, { w: number; h: number }>> = {
  pot: { w: 8, h: 12 },
  cucumber: { w: 12, h: 6 },
  tall: { w: 8, h: 16 },
};

export interface Obstacle {
  x: number;
  kind: ObstacleKind;
}

export interface Fish {
  x: number;
  taken: boolean;
}

export interface RunState {
  t: number;
  /** Wysokość kota nad ziemią i prędkość pionowa (w górę dodatnia). */
  y: number;
  vy: number;
  speed: number;
  distance: number;
  obstacles: readonly Obstacle[];
  fish: readonly Fish[];
  fishCount: number;
  /** Ile px biegu do następnej przeszkody. */
  spawnIn: number;
  over: boolean;
}

export type RunEvent = { type: 'jump' } | { type: 'fish' } | { type: 'crash' };

export function createRun(): RunState {
  return { t: 0, y: 0, vy: 0, speed: RUN.speed0, distance: 0, obstacles: [], fish: [], fishCount: 0, spawnIn: 90, over: false };
}

export const runScore = (s: Pick<RunState, 'distance' | 'fishCount'>): number =>
  Math.floor(s.distance / RUN.metre) + s.fishCount * RUN.fishPoints;

/** Skok — tylko z ziemi (bez podwójnego skoku). */
export function jumpRun(s: RunState): { state: RunState; events: RunEvent[] } {
  if (s.over || s.y > 0) return { state: s, events: [] };
  return { state: { ...s, vy: RUN.jumpV }, events: [{ type: 'jump' }] };
}

export function pickObstacle(r: number, speed: number): ObstacleKind {
  if (speed >= RUN.tallFrom && r < 0.25) return 'tall';
  return r < 0.65 ? 'pot' : 'cucumber';
}

/** Czy kot (pole zderzeń) nachodzi na przeszkodę. */
export function hits(y: number, o: Obstacle): boolean {
  const { w, h } = OBSTACLES[o.kind];
  const cx0 = RUN.catX + RUN.catOffset - RUN.catW / 2;
  const cx1 = RUN.catX + RUN.catOffset + RUN.catW / 2;
  return cx1 > o.x + 1 && cx0 < o.x + w - 1 && y < h - 1;
}

export function stepRun(s: RunState, dt: number, rng: () => number): { state: RunState; events: RunEvent[] } {
  if (s.over) return { state: s, events: [] };
  const events: RunEvent[] = [];
  const sec = dt / 1000;
  const speed = Math.min(RUN.speedMax, s.speed + RUN.accel * sec);
  const dx = speed * sec;
  // skok: grawitacja do lądowania
  let vy = s.vy - RUN.gravity * sec;
  let y = s.y + (s.vy + vy) * 0.5 * sec;
  if (y <= 0) {
    y = 0;
    vy = 0;
  }
  let obstacles = s.obstacles.map((o) => ({ ...o, x: o.x - dx })).filter((o) => o.x + OBSTACLES[o.kind].w > -4);
  let fish = s.fish.map((f) => ({ ...f, x: f.x - dx })).filter((f) => f.x > -6 && !f.taken);
  let spawnIn = s.spawnIn - dx;
  if (spawnIn <= 0) {
    const kind = pickObstacle(rng(), speed);
    obstacles = [...obstacles, { x: RUN.W + 4, kind }];
    if (rng() < RUN.fishChance) fish = [...fish, { x: RUN.W + 4 + OBSTACLES[kind].w / 2, taken: false }];
    // odstęp rośnie z prędkością — czas na reakcję zostaje podobny
    spawnIn += 70 + rng() * 70 + speed * 0.6;
  }
  let fishCount = s.fishCount;
  fish = fish.map((f) => {
    const near = Math.abs(f.x - (RUN.catX + RUN.catOffset)) < 9 && Math.abs(y + RUN.catH / 2 - RUN.fishH) < 9;
    if (!near) return f;
    fishCount++;
    events.push({ type: 'fish' });
    return { ...f, taken: true };
  });
  const over = obstacles.some((o) => hits(y, o));
  if (over) events.push({ type: 'crash' });
  return {
    state: { t: s.t + dt, y, vy, speed, distance: s.distance + dx, obstacles, fish, fishCount, spawnIn, over },
    events,
  };
}

/** Nagroda: moneta za każde 6 punktów (od 3 do 50) i +10 humoru. */
export function catRunReward(score: number): Reward {
  return { coins: Math.max(3, Math.min(50, Math.floor(score / 6))), moodBoost: 10 };
}
