/**
 * Kotek Gabi chodzący po pokoju (czysta logika): siedzi, przechadza się i biega, myje się, ziewa, drzemie
 * (po przebudzeniu przeciąga się), bawi się (przygotowanie → skok → lądowanie → zabawa → rzut), poluje, turla się,
 * łasi się do Gabi, prosi o jedzenie i jeży się, gdy Gabi się złości. W nocy śpi z Gabi w łóżku (jest w klatkach snu).
 */

export type CatMode =
  | 'sit' | 'walk' | 'run' | 'sleep' | 'stretch' | 'yawn' | 'wash'
  | 'play' | 'roll' | 'hunt' | 'beg' | 'rub' | 'scared' | 'eat';

/** Miejsce do spania w pokoju (legowisko, kanapa, fotel): środek i wysokość nad podłogą. */
export interface CatBed {
  x: number;
  lift: number;
}

/** Otoczenie kota w pokoju (z gry): gdzie śpi, gdzie miska, czy jest głodny, jak lubi Gabi. */
export interface CatEnv {
  gabiX: number | null;
  beds?: readonly CatBed[];
  hungry?: boolean;
  /** 0–100: im większa, tym częściej łasi się do Gabi. */
  love?: number;
}

export interface CatState {
  x: number;
  targetX: number;
  mode: CatMode;
  /** Kiedy (ms, zegar animacji) zaczął się obecny tryb — dla sekwencji klatek. */
  since: number;
  /** Do kiedy trwa obecny tryb (spacer i bieg — do dojścia). */
  until: number;
  facing: 'left' | 'right';
  /** Wysokość nad podłogą (śpi na kanapie / w legowisku). */
  lift?: number;
  /** Cel spaceru: po dojściu — sen na meblu albo jedzenie z miski. */
  goal?: { kind: 'sleep'; lift: number } | { kind: 'eat'; bowlX: number };
}

/** Gdzie kot może chodzić (px logiczne pokoju) i jak szybko. */
export const CAT_BOUNDS = { minX: 14, maxX: 114, speed: 11, runSpeed: 34 } as const;
/** Linia łapek kota — tuż przed linią stóp Gabi (kot jest bliżej). */
export const CAT_Y = 150;

/** Wszystkie obrazki kota (public/items) — do wczytania z góry. */
export const CAT_SPRITE_NAMES: readonly string[] = [
  'cat_sit', 'cat_yawn', 'cat_sleep', 'cat_stretch', 'cat_wash',
  'cat_walk_1', 'cat_walk_2', 'cat_walk_3', 'cat_run_1', 'cat_run_2',
  'cat_prep', 'cat_leap', 'cat_land', 'cat_play', 'cat_pounce',
  'cat_hunt', 'cat_scared', 'cat_beg', 'cat_rub', 'cat_roll',
];

/** Zabawa: kolejne klatki (ms) i przesunięcie w przód w czasie skoku. */
const PLAY: readonly { sprite: string; ms: number }[] = [
  { sprite: 'cat_prep', ms: 700 },
  { sprite: 'cat_leap', ms: 450 },
  { sprite: 'cat_land', ms: 500 },
  { sprite: 'cat_play', ms: 1300 },
  { sprite: 'cat_pounce', ms: 500 },
];
const PLAY_MS = PLAY.reduce((a, p) => a + p.ms, 0);
const LEAP_DX = 14;
const LEAP_H = 9;
/** Polowanie: czai się, potem rzut. */
const HUNT_MS = 1800;
const POUNCE_MS = 500;

const DURATION: Readonly<Partial<Record<CatMode, [number, number]>>> = {
  sit: [3000, 7000],
  sleep: [9000, 18000],
  eat: [3500, 4500],
  stretch: [1300, 1600],
  yawn: [1100, 1300],
  wash: [3000, 5000],
  roll: [2200, 3000],
  beg: [2000, 2600],
  rub: [2200, 2800],
  scared: [1400, 1800],
};

const span = ([a, b]: [number, number], rng: () => number) => a + rng() * (b - a);
const randomX = (rng: () => number) => CAT_BOUNDS.minX + rng() * (CAT_BOUNDS.maxX - CAT_BOUNDS.minX);
const clampX = (x: number) => Math.max(CAT_BOUNDS.minX, Math.min(CAT_BOUNDS.maxX, x));

function timed(c: CatState, mode: CatMode, now: number, rng: () => number): CatState {
  const until =
    mode === 'play' ? now + PLAY_MS : mode === 'hunt' ? now + HUNT_MS + POUNCE_MS : now + span(DURATION[mode] ?? [2000, 3000], rng);
  return { ...c, mode, since: now, until, targetX: c.x };
}

function go(c: CatState, mode: 'walk' | 'run', targetX: number, now: number): CatState {
  return { ...c, mode, since: now, until: Infinity, targetX, facing: targetX < c.x ? 'left' : 'right' };
}

export function createCat(now: number, rng: () => number): CatState {
  const x = randomX(rng);
  return { x, targetX: x, mode: 'sit', since: now, until: now + span(DURATION.sit!, rng), facing: rng() < 0.5 ? 'left' : 'right' };
}

/** Co dalej po skończonym trybie (blisko Gabi kot czasem się łasi — tym częściej, im bardziej ją lubi). */
function next(c: CatState, now: number, rng: () => number, env: CatEnv): CatState {
  const gabiX = env.gabiX;
  switch (c.mode) {
    case 'sleep':
      return timed(c, 'stretch', now, rng);
    case 'stretch':
      // zeskok z mebla po przeciągnięciu
      return { ...timed(c, 'yawn', now, rng), lift: 0 };
    case 'sit': {
      const rubChance = 0.15 + 0.4 * ((env.love ?? 60) / 100);
      if (gabiX !== null && Math.abs(gabiX - c.x) < 14 && rng() < rubChance) {
        return { ...timed(c, 'rub', now, rng), facing: gabiX < c.x ? 'left' : 'right' };
      }
      // głodny kot prosi Gabi o jedzenie
      if (env.hungry && gabiX !== null && rng() < 0.5) {
        return Math.abs(gabiX - c.x) < 16
          ? { ...timed(c, 'beg', now, rng), facing: gabiX < c.x ? 'left' : 'right' }
          : go(c, 'walk', clampX(gabiX + (c.x < gabiX ? -12 : 12)), now);
      }
      const r = rng();
      if (r < 0.12 && env.beds && env.beds.length > 0) {
        // drzemka na legowisku / kanapie
        const bed = env.beds[Math.min(env.beds.length - 1, Math.floor(rng() * env.beds.length))];
        return { ...go(c, 'walk', clampX(bed.x), now), goal: { kind: 'sleep', lift: bed.lift } };
      }
      if (r < 0.35) return go(c, 'walk', randomX(rng), now);
      if (r < 0.43) {
        // bieg na drugi koniec pokoju
        const far = c.x < (CAT_BOUNDS.minX + CAT_BOUNDS.maxX) / 2 ? CAT_BOUNDS.maxX - rng() * 15 : CAT_BOUNDS.minX + rng() * 15;
        return go(c, 'run', far, now);
      }
      if (r < 0.55) return timed(c, 'sleep', now, rng);
      if (r < 0.69) return timed(c, 'wash', now, rng);
      if (r < 0.75) return timed(c, 'yawn', now, rng);
      if (r < 0.85) return timed(c, 'play', now, rng);
      if (r < 0.91) return timed(c, 'roll', now, rng);
      return timed(c, 'hunt', now, rng);
    }
    default:
      return timed(c, 'sit', now, rng);
  }
}

export function stepCat(c: CatState, dt: number, now: number, rng: () => number, envOrGabi: CatEnv | number | null = null): CatState {
  const env: CatEnv = typeof envOrGabi === 'object' && envOrGabi !== null ? envOrGabi : { gabiX: envOrGabi };
  if (c.mode === 'walk' || c.mode === 'run') {
    const d = c.targetX - c.x;
    const step = ((c.mode === 'run' ? CAT_BOUNDS.runSpeed : CAT_BOUNDS.speed) * dt) / 1000;
    if (Math.abs(d) <= step) {
      const at = { ...c, x: c.targetX, goal: undefined };
      if (c.goal?.kind === 'sleep') return { ...timed(at, 'sleep', now, rng), lift: c.goal.lift };
      if (c.goal?.kind === 'eat') return { ...timed(at, 'eat', now, rng), facing: c.goal.bowlX < at.x ? 'left' : 'right' };
      return next(at, now, rng, env);
    }
    return { ...c, x: c.x + Math.sign(d) * step };
  }
  if (now >= c.until) {
    // skok w zabawie i rzut w polowaniu przesuwają kota do przodu
    const dir = c.facing === 'left' ? -1 : 1;
    const moved = c.mode === 'play' ? clampX(c.x + dir * LEAP_DX) : c.mode === 'hunt' ? clampX(c.x + dir * 6) : c.x;
    return next({ ...c, x: moved, targetX: moved }, now, rng, env);
  }
  return c;
}

/** Klatka kota w chwili `now`: obrazek, wysokość nad podłogą (skok) i przesunięcie w trakcie skoku. */
export function catFrame(c: CatState, now: number): { sprite: string; lift: number; dx: number; flip: boolean } {
  const t = Math.max(0, now - c.since);
  const flip = c.facing === 'left';
  const dir = flip ? -1 : 1;
  switch (c.mode) {
    case 'walk':
      return { sprite: `cat_walk_${1 + (Math.floor(now / 150) % 3)}`, lift: 0, dx: 0, flip };
    case 'run':
      return { sprite: `cat_run_${1 + (Math.floor(now / 110) % 2)}`, lift: 0, dx: 0, flip };
    case 'play': {
      let acc = 0;
      for (const p of PLAY) {
        if (t < acc + p.ms) {
          if (p.sprite === 'cat_leap') {
            const u = (t - acc) / p.ms;
            return { sprite: p.sprite, lift: Math.round(Math.sin(u * Math.PI) * LEAP_H), dx: Math.round(dir * LEAP_DX * u), flip };
          }
          return { sprite: p.sprite, lift: 0, dx: acc >= PLAY[0].ms + PLAY[1].ms ? dir * LEAP_DX : 0, flip };
        }
        acc += p.ms;
      }
      return { sprite: 'cat_pounce', lift: 0, dx: dir * LEAP_DX, flip };
    }
    case 'hunt':
      return t < HUNT_MS ? { sprite: 'cat_hunt', lift: 0, dx: 0, flip } : { sprite: 'cat_pounce', lift: 0, dx: dir * 6, flip };
    case 'eat':
      // jedzenie z miski: pochylony nad miską, kiwa głową
      return { sprite: Math.floor(t / 400) % 2 === 0 ? 'cat_hunt' : 'cat_land', lift: 0, dx: 0, flip };
    case 'roll':
      // turlanie: przewrót co pół sekundy
      return { sprite: 'cat_roll', lift: 0, dx: 0, flip: Math.floor(t / 500) % 2 === 1 };
    default:
      return { sprite: `cat_${c.mode}`, lift: 0, dx: 0, flip };
  }
}

/** Miska napełniona: kot biegnie do niej i je. */
export function callToBowl(c: CatState, bowlX: number, now: number): CatState {
  // obok miski (głowa nad nią), od strony, z której kot przybiega
  const spot = clampX(bowlX + (c.x < bowlX ? -9 : 9));
  return { ...go({ ...c, lift: 0 }, 'run', spot, now), goal: { kind: 'eat', bowlX } };
}

/** Stuknięty kot siada i czeka na Gabi. */
export function calmCat(c: CatState, now: number): CatState {
  return { ...c, mode: 'sit', since: now, targetX: c.x, until: now + 60_000, lift: 0, goal: undefined };
}

/** Reakcja na Gabi: prosi o jedzenie (gdy Gabi je obok), jeży się (gdy Gabi się złości). */
export function catReact(c: CatState, kind: 'beg' | 'scared', now: number, gabiX: number, rng: () => number): CatState {
  if (c.mode === 'sleep') return c;
  if (kind === 'beg' && Math.abs(gabiX - c.x) > 40) return c;
  return { ...timed(c, kind, now, rng), facing: gabiX < c.x ? 'left' : 'right' };
}

/** Kot nakarmiony z miski: pełny brzuszek i trochę więcej sympatii. */
export function feedCatInfo(info: { name: string; hunger: number; love: number }, feedLove: number): typeof info {
  return { ...info, hunger: 100, love: Math.min(100, info.love + feedLove) };
}

/** Kot pogłaskany: więcej sympatii. */
export function petCatInfo(info: { name: string; hunger: number; love: number }, petLove: number): typeof info {
  return { ...info, love: Math.min(100, info.love + petLove) };
}

