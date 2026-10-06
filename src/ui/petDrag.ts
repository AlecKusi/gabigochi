import { ROOM_BOUNDS } from '../pet/brain';
import { landingEmotion, startFall, stepFall, type Fall } from '../pet/fall';
import { FEET_Y } from '../pet/room';
import { DISPLAY_HEIGHT, type FrameMeta } from '../sprites/loader';

/**
 * Przeciąganie palcem (spec §4): ruch > `startDist` px logicznych od dotknięcia postaci = złapanie;
 * przez `pickMs` klatka złapania, potem dyndanie (przy prędkości > `panicSpeed` px log./s panika,
 * powrót do dyndania poniżej `calmSpeed`, żeby klatki nie migotały na granicy).
 */
export const DRAG = { startDist: 6, pickMs: 200, panicSpeed: 120, calmSpeed: 80 } as const;

export type DragAnim = 'drag_pick' | 'drag_dangle' | 'drag_panic';

export function dragAnimation(heldMs: number, speed: number, panic: boolean): DragAnim {
  if (heldMs < DRAG.pickMs) return 'drag_pick';
  return speed > (panic ? DRAG.calmSpeed : DRAG.panicSpeed) ? 'drag_panic' : 'drag_dangle';
}

/** Wygładzona prędkość palca. */
export const smoothSpeed = (prev: number, inst: number): number => prev * 0.7 + inst * 0.3;

export const clampRoomX = (x: number): number => Math.max(ROOM_BOUNDS.minX, Math.min(ROOM_BOUNDS.maxX, x));

/** Stopy klatki trzymanej za czubek głowy (górę obrazka w `top`); nigdy poniżej podłogi. */
export function heldFeetY(meta: FrameMeta | undefined, top: number, floorY: number): number {
  const foot = meta ? (meta.foot ?? meta.h) * meta.scale : DISPLAY_HEIGHT;
  return Math.min(floorY, top + foot);
}

export interface PetDragHooks {
  toLogical(e: PointerEvent): { x: number; y: number };
  /** Czy dotknięcie w tym miejscu łapie postać (pokój sprawdza też sen/pobudkę). */
  canGrab(x: number, y: number): boolean;
  /** Puszczenie bez przesunięcia — zwykłe stuknięcie. */
  onTap(now: number): void;
  onGrab(now: number): void;
  onLand(emotion: 'scared' | 'happy', x: number, now: number): void;
}

export interface PetDrag {
  /** Postać jest trzymana albo spada — pokój nie steruje nią wtedy. */
  readonly busy: boolean;
  /** Fizyka spadania i wygaszanie prędkości, gdy palec stoi; może wywołać `onLand`. */
  step(dtMs: number, now: number): void;
  /** Animacja trzymania/spadania albo `null`. */
  pose(now: number): DragAnim | null;
  /** Położenie (px logiczne) dla bieżącej klatki `meta`; ważne, gdy `pose()` ≠ null. */
  place(meta: FrameMeta | undefined): { x: number; feetY: number };
  /** Porzuca trzymanie/spadanie bez lądowania (np. gdy Gabi idzie spać). */
  cancel(): void;
  destroy(): void;
}

interface Held {
  x: number;
  y: number;
  startedAt: number;
  movedAt: number;
  lastStamp: number;
  speed: number;
  panic: boolean;
  feetY: number;
}

/** Po tylu ms bez ruchu palca prędkość wygasa. */
const STILL_MS = 60;
/** Dolna granica odstępu zdarzeń przy liczeniu prędkości (zdarzenia potrafią przyjść paczką). */
const MIN_EVENT_DT_MS = 8;

export function createPetDrag(canvas: HTMLCanvasElement, hooks: PetDragHooks): PetDrag {
  let down: { id: number; x: number; y: number } | null = null;
  let held: Held | null = null;
  let fall: Fall | null = null;
  let fallX = 0;

  function releaseCapture(id: number): void {
    try {
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    } catch {
      /* brak przechwycenia — nic do zwolnienia */
    }
  }

  /** Koniec gestu: upuszczenie, jeśli trzymana; stuknięcie tylko przy zwykłym puszczeniu bez ruchu. */
  function end(tap: boolean): void {
    if (!down) return;
    // Najpierw czyścimy stan: zwolnienie przechwycenia może od razu wywołać `lostpointercapture`.
    const id = down.id;
    down = null;
    releaseCapture(id);
    const now = performance.now();
    if (held) {
      fallX = clampRoomX(held.x);
      fall = startFall(FEET_Y - held.feetY);
      held = null;
    } else if (tap) {
      hooks.onTap(now);
    }
  }

  function cancel(): void {
    const id = down?.id;
    down = null;
    held = null;
    fall = null;
    if (id !== undefined) releaseCapture(id);
  }

  const onDown = (e: PointerEvent) => {
    if (down || held || fall || !e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = hooks.toLogical(e);
    if (!hooks.canGrab(p.x, p.y)) return;
    down = { id: e.pointerId, x: p.x, y: p.y };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* bez przechwycenia ruch i puszczenie i tak dochodzą przez window */
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    const p = hooks.toLogical(e);
    const now = performance.now();
    if (!held) {
      if (Math.hypot(p.x - down.x, p.y - down.y) <= DRAG.startDist) return;
      held = { x: p.x, y: p.y, startedAt: now, movedAt: now, lastStamp: e.timeStamp, speed: 0, panic: false, feetY: heldFeetY(undefined, p.y, FEET_Y) };
      hooks.onGrab(now);
      return;
    }
    const dt = Math.max(MIN_EVENT_DT_MS, e.timeStamp - held.lastStamp) / 1000;
    held.speed = smoothSpeed(held.speed, Math.hypot(p.x - held.x, p.y - held.y) / dt);
    held.x = p.x;
    held.y = p.y;
    held.lastStamp = e.timeStamp;
    held.movedAt = now;
  };

  const onUp = (e: PointerEvent) => {
    if (down && e.pointerId === down.id) end(true);
  };
  const onCancel = (e: PointerEvent) => {
    if (down && e.pointerId === down.id) end(false);
  };
  const onBlur = () => end(false);

  canvas.addEventListener('pointerdown', onDown);
  // Przechwycone zdarzenia i tak wypływają do window; bez przechwycenia window łapie puszczenie poza canvasem.
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('lostpointercapture', onCancel);
  window.addEventListener('blur', onBlur);

  return {
    get busy() {
      return held !== null || fall !== null;
    },
    step(dtMs, now) {
      if (held && now - held.movedAt > STILL_MS) held.speed *= 0.7 ** (dtMs / 16);
      if (!fall) return;
      fall = stepFall(fall, dtMs);
      if (fall.done) {
        const emotion = landingEmotion(fall);
        fall = null;
        hooks.onLand(emotion, fallX, now);
      }
    },
    pose(now) {
      if (held) {
        const anim = dragAnimation(now - held.startedAt, held.speed, held.panic);
        held.panic = anim === 'drag_panic';
        return anim;
      }
      return fall ? 'drag_dangle' : null;
    },
    place(meta) {
      if (held) {
        held.feetY = heldFeetY(meta, held.y, FEET_Y);
        return { x: clampRoomX(held.x), feetY: held.feetY };
      }
      return { x: fallX, feetY: FEET_Y - (fall?.lift ?? 0) };
    },
    cancel,
    destroy() {
      cancel();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('lostpointercapture', onCancel);
      window.removeEventListener('blur', onBlur);
    },
  };
}
