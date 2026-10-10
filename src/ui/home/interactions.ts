import type { PlacedItem, RoomId } from '../../core/types';
import { itemFrames, type Interaction } from '../../home/catalog';
import { TOWEL_RAIL, stepAt, totalMs, type GabiPose, type InteractionStep } from '../../home/interactionPlan';
import { nearestItem } from '../../home/activitySpots';

/** Trwająca interakcja z przedmiotem (Gabi już przy nim stoi). */
export interface InteractionRun {
  uid: string;
  room: RoomId;
  itemId: string;
  kind: Interaction;
  steps: readonly InteractionStep[];
  startedAt: number;
}

export interface InteractionView {
  run: InteractionRun;
  step: InteractionStep;
  /** Czas od początku bieżącego kroku (animacje póz i efektów). */
  inStepMs: number;
}

export interface InteractionTick {
  /** Krok, który właśnie się zaczął (kwestia i efekt na jego starcie) albo null. */
  entered: InteractionStep | null;
  /** Interakcja dobiegła końca (nieprzerwana) — wtedy `current` jest już null. */
  finished: InteractionRun | null;
}

export interface InteractionPlayer {
  readonly current: InteractionRun | null;
  start(item: PlacedItem, room: RoomId, kind: Interaction, steps: readonly InteractionStep[], now: number): void;
  step(now: number): InteractionTick;
  view(now: number): InteractionView | null;
  /** Przerywa bez bonusu; false, gdy nic nie trwało. */
  cancel(): boolean;
}

/** Odtwarzacz kroków interakcji (czas z `performance.now()`); kwestie i bonusy zostawia pokojowi. */
export function createInteractionPlayer(): InteractionPlayer {
  let run: InteractionRun | null = null;
  let lastIndex = -1;
  return {
    get current() {
      return run;
    },
    start(item, room, kind, steps, now) {
      run = { uid: item.uid, room, itemId: item.itemId, kind, steps, startedAt: now };
      lastIndex = -1;
    },
    step(now) {
      if (!run) return { entered: null, finished: null };
      const at = stepAt(run.steps, now - run.startedAt);
      if (!at) {
        const done = run;
        run = null;
        return { entered: null, finished: done };
      }
      if (at.index === lastIndex) return { entered: null, finished: null };
      lastIndex = at.index;
      return { entered: at.step, finished: null };
    },
    view(now) {
      if (!run) return null;
      const elapsed = Math.min(now - run.startedAt, totalMs(run.steps) - 1);
      const at = stepAt(run.steps, elapsed);
      if (!at) return null;
      return { run, step: at.step, inStepMs: elapsed - at.startMs };
    },
    cancel() {
      const was = run !== null;
      run = null;
      lastIndex = -1;
      return was;
    },
  };
}

/** Element pętli `fps` klatek na sekundę w chwili `ms` od początku kroku. */
export function loopFrame<T>(frames: readonly T[], fps: number, ms: number): T {
  return frames[Math.floor((Math.max(0, ms) / 1000) * fps) % frames.length];
}

/** Klatka pozy z listy klatek w chwili `ms` od początku kroku. */
export function poseFrame(pose: Extract<GabiPose, { kind: 'frames' }>, ms: number): string {
  return loopFrame(pose.frames, pose.fps, ms);
}

/** Co narysować inaczej w pokoju w tym kroku. */
export interface StageChanges {
  /** uid → sprite klatki stanu rysowanej zamiast przedmiotu. */
  states: Map<string, string>;
  /** Ukryte przedmioty (wieszak, przy którym Gabi wyciera ręce — rysujemy go klatką z Gabi). */
  hidden: Set<string>;
  /** Klatka z Gabi przy innym przedmiocie (`overlay: false`, kotwica postaci) albo null. */
  other: { item: PlacedItem; sprite: string } | null;
}

/** Zmiany w pokoju dla widoku interakcji: stan przedmiotu i (umywalka) wieszak z ręcznikiem najbliższy umywalce. */
export function stageChanges(v: InteractionView | null, items: readonly PlacedItem[]): StageChanges {
  const out: StageChanges = { states: new Map(), hidden: new Set(), other: null };
  if (!v) return out;
  const self = items.find((i) => i.uid === v.run.uid);
  if (!self) return out;
  if (v.step.item) {
    const sprite = itemFrames(self.itemId)[v.step.item];
    if (sprite) out.states.set(self.uid, sprite);
  }
  if (v.step.rail) {
    const rail = nearestItem(items, [TOWEL_RAIL], self.x);
    const sprite = rail ? itemFrames(rail.itemId)[v.step.rail] : undefined;
    if (rail && sprite) {
      out.hidden.add(rail.uid);
      out.other = { item: rail, sprite };
    }
  }
  return out;
}

const DROP_COLOR = '#5aa8f0';
/** Wysokość opadania kropli nad rośliną (px logiczne). */
const DROP_FALL = 14;

/** Krople wody spadające na roślinę (warstwa `fx`, px logiczne); `box` — prostokąt rośliny, `ms` — czas podlewania. */
export function drawWaterDrops(fx: CanvasRenderingContext2D, box: { x: number; y: number; w: number }, ms: number): void {
  const n = Math.max(3, Math.min(6, Math.round(box.w / 5)));
  fx.fillStyle = DROP_COLOR;
  for (let i = 0; i < n; i++) {
    const x = Math.round(box.x + ((i + 0.5) * box.w) / n);
    const phase = (ms / 600 + i * 0.37) % 1;
    const y = Math.round(box.y - DROP_FALL + phase * DROP_FALL);
    fx.fillRect(x, Math.max(0, y), 1, 2);
  }
}

/** Czy w pokoju wisi wieszak z ręcznikiem (umywalka: wycieranie rąk). */
export function hasTowelRail(items: readonly PlacedItem[]): boolean {
  return items.some((i) => i.itemId === TOWEL_RAIL);
}
