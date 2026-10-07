import { ACTIVITIES, activityDuration, activityFrame, isZoom, nextActivityDelay, zoomBase, type ActivityDef, type ActivityId } from '../pet/activities';
import { FEET_Y, ROOM_W } from '../pet/room';
import { FRAMES, type FrameMeta } from '../sprites/loader';
import type { Figures } from '../wardrobe/figures';
import { deviceRect, drawSprite } from './pixelStage';

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

/** Miejsce zajęcia przy meblu (biurko, siedzisko): wszystkie klatki stają w nim jak sceny. */
export interface ActivitySpot {
  x: number;
  feetY: number;
}

export function placeActivityFrame(def: ActivityDef, frame: string, petX: number, spot: ActivitySpot | null = null): Placed {
  if (spot) return { frame, x: spot.x, feetY: spot.feetY, centered: true };
  const centered = def.centered.includes(frame);
  return centered ? { frame, ...SCENE_AT, centered } : { frame, x: petX, feetY: FEET_Y, centered };
}

/**
 * Miejsce przy meblu przesunięte w poziomie tak, żeby każda klatka zajęcia zmieściła się w pokoju (scena nauki
 * jest szersza niż biurko — przy biurku pod samą ścianą wypada odrobinę obok niego).
 */
export function fitSpot(def: ActivityDef, spot: ActivitySpot, roomW: number, frames: Record<string, FrameMeta | undefined> = FRAMES): ActivitySpot {
  let left = 0;
  let right = 0;
  for (const name of [...(def.intro ?? []), ...def.frames, ...(def.outro ? [def.outro] : [])]) {
    if (isZoom(def, name)) continue; // zbliżenia są w okienku, nie przy meblu
    const m = frames[name];
    if (!m) continue;
    left = Math.max(left, m.anchorX * m.scale);
    right = Math.max(right, (m.w - m.anchorX) * m.scale);
  }
  if (left + right > roomW) return spot;
  return { ...spot, x: Math.max(left, Math.min(roomW - right, spot.x)) };
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
  /** Okienko zbliżenia nad Gabi (kadry z uciętymi rekwizytami) albo null. */
  zoom: ZoomView | null;
}

/** Okienko zbliżenia: przezroczystość ramki i klatki w środku z udziałami (przy przenikaniu dwie). */
export interface ZoomView {
  alpha: number;
  layers: [frame: string, alpha: number][];
}

/** Gabi i zbliżenie w danej chwili historyjki: zbliżenie nie zmienia klatki postaci (zostaje scena bazowa). */
export function splitZoom(def: ActivityDef, frame: string, prev: string | null, blend: number): { cur: string; prev: string | null; blend: number; zoom: ZoomView | null } {
  const cur = zoomBase(def, frame);
  const before = prev ? zoomBase(def, prev) : null;
  const zCur = isZoom(def, frame);
  const zPrev = prev !== null && isZoom(def, prev);
  let zoom: ZoomView | null = null;
  if (zCur && zPrev) zoom = { alpha: 1, layers: [[prev!, 1 - blend], [frame, blend]] };
  else if (zCur) zoom = { alpha: prev ? blend : 1, layers: [[frame, 1]] };
  else if (zPrev) zoom = { alpha: 1 - blend, layers: [[prev!, 1]] };
  return before !== null && before !== cur ? { cur, prev: before, blend, zoom } : { cur, prev: null, blend: 1, zoom };
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
  spot: ActivitySpot | null;
}

export interface ActivityPlayer {
  /** Trwające zajęcie albo null. */
  readonly current: ActivityDef | null;
  /** Kiedy (performance.now()) pora na samodzielne zajęcie. */
  readonly nextAt: number;
  /** `spot` — zajęcie przy meblu: klatki rysowane w jego miejscu. */
  start(id: ActivityId, now: number, spot?: ActivitySpot | null): void;
  /** Odkłada samodzielny start (np. gdy w pokoju nie ma dostępnego zajęcia). */
  postpone(now: number): void;
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
    const raw = activityFrame(r.def, t - r.startedAt, r.totalMs);
    const f = splitZoom(r.def, raw.frame, raw.prev, raw.blend);
    return { f, cur: placeActivityFrame(r.def, f.cur, petX, r.spot) };
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
    start(id, t, spot = null) {
      const def = ACTIVITIES[id];
      run = { def, startedAt: t, totalMs: activityDuration(def, rng), nextLineAt: t + LINE_FIRST_MS, lines: shuffled(def.lines, rng), spot };
    },
    postpone(t) {
      nextAt = t + nextActivityDelay(rng);
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
      return { def: run.def, cur, prev: f.prev ? placeActivityFrame(run.def, f.prev, petX, run.spot) : null, blend: f.blend, zoom: f.zoom };
    },
  };
}

/** Rysuje zajęcie w pikselach urządzenia: przy przenikaniu najpierw poprzednia scena (1 − blend), potem bieżąca (blend). */
export function drawActivity(ctx: CanvasRenderingContext2D, k: number, figures: Pick<Figures, 'get'>, v: ActivityView): void {
  const layers: [Placed, number][] = v.prev ? [[v.prev, 1 - v.blend], [v.cur, v.blend]] : [[v.cur, 1]];
  for (const [p, alpha] of layers) {
    const fig = figures.get(p.frame);
    if (!fig || alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    drawSprite(ctx, k, fig.img, fig.meta, { x: p.x, feetY: p.feetY, flip: false, bob: 0, squash: 0, jump: 0 });
  }
  ctx.globalAlpha = 1;
  if (v.zoom) drawZoom(ctx, k, figures, v.def, v.cur, v.zoom);
}

/** Wymiary okienka zbliżenia (px logiczne): jednakowe dla wszystkich zbliżeń zajęcia, z marginesem. */
export function zoomBox(def: ActivityDef, frames: Record<string, FrameMeta | undefined> = FRAMES): { w: number; h: number } {
  let w = 0;
  let h = 0;
  for (const name of def.zoom ?? []) {
    const m = frames[name];
    if (!m) continue;
    w = Math.max(w, m.w * m.scale);
    h = Math.max(h, m.h * m.scale);
  }
  return { w: Math.ceil(w) + 2 * ZOOM_PAD, h: Math.ceil(h) + 2 * ZOOM_PAD };
}

const ZOOM_PAD = 3;
/** Odstęp okienka od czubka sceny i ogonek wskazujący Gabi (px logiczne). */
const ZOOM_GAP = 6;
const INK = '#1b1326';
const PAPER = '#f3ecff';

/** Gdzie stoi okienko zbliżenia nad sceną `cur` (px logiczne): nad głową, w granicach pokoju. */
export function zoomRect(def: ActivityDef, cur: Placed, frames: Record<string, FrameMeta | undefined> = FRAMES): { x: number; y: number; w: number; h: number; tipX: number } {
  const box = zoomBox(def, frames);
  const m = frames[cur.frame];
  const top = m ? frameRect(m, cur.x, cur.feetY).y : cur.feetY - 60;
  const x = Math.round(Math.max(1, Math.min(ROOM_W - 1 - box.w, cur.x - box.w / 2)));
  const y = Math.max(1, Math.round(top - ZOOM_GAP - box.h));
  return { x, y, w: box.w, h: box.h, tipX: Math.round(Math.max(x + 4, Math.min(x + box.w - 5, cur.x))) };
}

function drawZoom(ctx: CanvasRenderingContext2D, k: number, figures: Pick<Figures, 'get'>, def: ActivityDef, cur: Placed, zoom: ZoomView): void {
  const r = zoomRect(def, cur);
  const fill = (x: number, y: number, w: number, h: number, c: string) => {
    const d = deviceRect(k, { x, y, w, h });
    ctx.fillStyle = c;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  };
  ctx.save();
  ctx.globalAlpha = zoom.alpha;
  // ramka z zaokrąglonymi rogami (po pikselu) i ogonek w dół
  fill(r.x + 1, r.y, r.w - 2, r.h, INK);
  fill(r.x, r.y + 1, r.w, r.h - 2, INK);
  fill(r.x + 1, r.y + 1, r.w - 2, r.h - 2, PAPER);
  for (let i = 0; i < 3; i++) {
    fill(r.tipX - 2 + i, r.y + r.h - 1 + i, 4 - 2 * i, 1, INK);
    if (i < 2) fill(r.tipX - 1 + i, r.y + r.h - 1 + i, 2 - 2 * i, 1, PAPER);
  }
  ctx.restore();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const [frame, a] of zoom.layers) {
    const fig = figures.get(frame);
    if (!fig || a <= 0) continue;
    const w = fig.meta.w * fig.meta.scale;
    const h = fig.meta.h * fig.meta.scale;
    // w środku, przy dolnej krawędzi okienka
    const d = deviceRect(k, { x: r.x + (r.w - w) / 2, y: r.y + r.h - ZOOM_PAD - h, w, h });
    ctx.globalAlpha = zoom.alpha * a;
    ctx.drawImage(fig.img, d.x, d.y, d.w, d.h);
  }
  ctx.restore();
}
