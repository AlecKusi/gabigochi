import { ACTIVITIES, activityDuration, activityFrame, nextActivityDelay, type ActivityDef, type ActivityId } from '../pet/activities';
import { FEET_Y } from '../pet/room';
import { FRAMES, type FrameMeta } from '../sprites/loader';
import { drawSprite } from './pixelStage';

/** Środek pokoju, w którym stoją sceny z rekwizytami (biurko, łóżko pacjenta) — tak jak łóżko Gabi. */
export const SCENE_AT = { x: 64, feetY: FEET_Y + 2 } as const;
/** Pierwsza kwestia po tym czasie od startu, kolejne mniej więcej co `LINE_EVERY_MS`. */
export const LINE_FIRST_MS = 1500;
export const LINE_EVERY_MS = 7000;
/** Kwestii nie zaczynamy tuż przed końcem zajęcia. */
const LINE_MIN_LEFT_MS = 2500;

/** Klatka zajęcia postawiona w pokoju (px logiczne). */
export interface Placed {
  frame: string;
  x: number;
  feetY: number;
  /** Scena na środku pokoju (z rekwizytami), a nie postać w miejscu Gabi. */
  centered: boolean;
}

export function placeActivityFrame(def: ActivityDef, frame: string, petX: number): Placed {
  const centered = def.centered.includes(frame);
  return centered ? { frame, ...SCENE_AT, centered } : { frame, x: petX, feetY: FEET_Y, centered };
}

/** Prostokąt (px logiczne) zajmowany przez klatkę, której kotwica stoi w (x, feetY). */
export function frameRect(meta: FrameMeta, x: number, feetY: number): { x: number; y: number; w: number; h: number } {
  const w = meta.w * meta.scale;
  const h = meta.h * meta.scale;
  return { x: x - meta.anchorX * meta.scale, y: feetY - (meta.foot ?? meta.h) * meta.scale, w, h };
}

/** Czy punkt (px logiczne) trafia w scenę na środku pokoju. */
export function hitsScene(p: Placed, x: number, y: number, frames: Record<string, FrameMeta | undefined> = FRAMES): boolean {
  const meta = frames[p.frame];
  if (!meta) return false;
  const r = frameRect(meta, p.x, p.feetY);
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Co narysować w tej chwili: bieżąca klatka i (przy przenikaniu scen) poprzednia. */
export interface ActivityView {
  def: ActivityDef;
  cur: Placed;
  prev: Placed | null;
  /** Udział bieżącej klatki 0–1. */
  blend: number;
}

export interface ActivityStep {
  /** Zajęcie dobiegło końca (nieprzerwane) — ostatnia klatka; wtedy `current` jest już null. */
  finished: Placed | null;
  /** Kwestia do powiedzenia teraz albo null. */
  line: string | null;
}

interface Running {
  def: ActivityDef;
  startedAt: number;
  totalMs: number;
  nextLineAt: number;
  /** Kwestie w losowej kolejności, każda raz. */
  lines: string[];
}

export interface ActivityPlayer {
  /** Trwające zajęcie albo null. */
  readonly current: ActivityDef | null;
  /** Kiedy (performance.now()) pora na samodzielne zajęcie. */
  readonly nextAt: number;
  start(id: ActivityId, now: number): void;
  /** Przerywa zajęcie bez bonusu; zwraca ostatnią klatkę (żeby Gabi została tam, gdzie była scena). */
  stop(now: number, petX: number): Placed | null;
  step(now: number, petX: number): ActivityStep;
  view(now: number, petX: number): ActivityView | null;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Stan zajęć pokoju: start (ręczny lub o czasie `nextAt`), kwestie, koniec po czasie, przerwanie. */
export function createActivityPlayer(now: number, rng: () => number = Math.random): ActivityPlayer {
  let run: Running | null = null;
  let nextAt = now + nextActivityDelay(rng);

  function frameNow(r: Running, t: number, petX: number) {
    const f = activityFrame(r.def, t - r.startedAt, r.totalMs);
    return { f, cur: placeActivityFrame(r.def, f.frame, petX) };
  }

  function end(t: number): void {
    run = null;
    nextAt = t + nextActivityDelay(rng);
  }

  return {
    get current() {
      return run?.def ?? null;
    },
    get nextAt() {
      return nextAt;
    },
    start(id, t) {
      const def = ACTIVITIES[id];
      run = { def, startedAt: t, totalMs: activityDuration(def, rng), nextLineAt: t + LINE_FIRST_MS, lines: shuffled(def.lines, rng) };
    },
    stop(t, petX) {
      if (!run) return null;
      const { cur } = frameNow(run, t, petX);
      end(t);
      return cur;
    },
    step(t, petX) {
      if (!run) return { finished: null, line: null };
      const elapsed = t - run.startedAt;
      if (elapsed >= run.totalMs) {
        const { cur } = frameNow(run, run.startedAt + run.totalMs - 1, petX);
        end(t);
        return { finished: cur, line: null };
      }
      let line: string | null = null;
      if (t >= run.nextLineAt) {
        run.nextLineAt = t + LINE_EVERY_MS + (rng() - 0.5) * 2000;
        if (run.totalMs - elapsed >= LINE_MIN_LEFT_MS) line = run.lines.shift() ?? null;
      }
      return { finished: null, line };
    },
    view(t, petX) {
      if (!run) return null;
      const { f, cur } = frameNow(run, t, petX);
      return { def: run.def, cur, prev: f.prev ? placeActivityFrame(run.def, f.prev, petX) : null, blend: f.blend };
    },
  };
}

/** Rysuje zajęcie w pikselach urządzenia: przy przenikaniu najpierw poprzednia scena (1 − blend), potem bieżąca (blend). */
export function drawActivity(ctx: CanvasRenderingContext2D, k: number, sprites: ReadonlyMap<string, CanvasImageSource>, v: ActivityView): void {
  const layers: [Placed, number][] = v.prev ? [[v.prev, 1 - v.blend], [v.cur, v.blend]] : [[v.cur, 1]];
  for (const [p, alpha] of layers) {
    const img = sprites.get(p.frame);
    const meta = FRAMES[p.frame];
    if (!img || !meta || alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    drawSprite(ctx, k, img, meta, { x: p.x, feetY: p.feetY, flip: false, bob: 0, squash: 0, jump: 0 });
  }
  ctx.globalAlpha = 1;
}
