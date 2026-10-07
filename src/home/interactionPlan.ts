import { CONFIG } from '../core/config';
import type { GameState, RoomId } from '../core/types';
import type { Interaction } from './catalog';
import { findItem } from './catalog';
import type { HomeOutcome } from './layout';
import { canReward, markReward } from './rewards';

/**
 * Plan interakcji z przedmiotem (czyste dane): po dojściu Gabi do przedmiotu kolejne kroki — stan przedmiotu
 * (klatka z `itemFrames` zamiast zwykłego sprite'a), poza Gabi, kwestia i efekt na starcie kroku.
 */

/** Jak narysować Gabi w kroku. */
export type GabiPose =
  /** Gabi jest częścią klatki przedmiotu (np. pod prysznicem) — postaci nie rysujemy. */
  | { kind: 'hidden' }
  /** Klatki postaci (pętla) w miejscu Gabi albo względem przedmiotu (`at`), zwrócone do niego (`face`). */
  | { kind: 'frames'; frames: readonly string[]; fps: number; at?: PoseAt; face?: boolean }
  /** Popiersie z arkusza łazienki złożone z nogami z `idle_front`. */
  | { kind: 'bust'; bust: 'gabi_turban' | 'gabi_hairdryer' };

/**
 * Gdzie stoi poza względem przedmiotu: `seat` — siedzi na meblu, `lie` — leży na kanapie, `behind` — siedzi za
 * stołem (stół zasłania nogi), `front` — przed telewizorem (widok od tyłu), `under` — pod oknem (widok od tyłu).
 */
export type PoseAt = 'seat' | 'lie' | 'behind' | 'front' | 'under';

/** Klucze kwestii (`content.lines`) wypowiadanych w interakcjach; `calendar` i `window` są składane w pokoju. */
export type InteractionLine =
  | 'water' | 'read' | 'play' | 'cute' | 'calendar' | 'window'
  | 'toilet' | 'shower' | 'showerDone' | 'bath' | 'bathRelax' | 'sink' | 'towel' | 'hairdryer' | 'nap' | 'coffee'
  | 'cake' | 'kitkat' | 'tea' | 'relaxPhone' | 'tv' | 'cat';

export type InteractionEffect = 'water' | 'hearts' | 'screen';

export interface InteractionStep {
  ms: number;
  /** Stan przedmiotu (klucz `itemFrames`) albo null — zwykły sprite. */
  item: string | null;
  /** Wieszak z ręcznikiem w pokoju: stan (klatka z Gabi rysowana w jego osi, wieszak ukryty). */
  rail?: string;
  gabi: GabiPose;
  line?: InteractionLine;
  effect?: InteractionEffect;
}

const IDLE: GabiPose = { kind: 'frames', frames: ['idle_front'], fps: 1 };
const HIDDEN: GabiPose = { kind: 'hidden' };
const TURBAN: GabiPose = { kind: 'bust', bust: 'gabi_turban' };
const HAIRDRYER: GabiPose = { kind: 'bust', bust: 'gabi_hairdryer' };

/** Przedmiot z wieszakiem na ręcznik — tam Gabi wyciera ręce po myciu. */
export const TOWEL_RAIL = 'towel_rail';

export interface PlanCtx {
  /** Czy w pokoju wisi wieszak z ręcznikiem. */
  hasRail: boolean;
  /** Noc za oknem (w nocy Gabi nie macha przez okno, tylko patrzy w gwiazdy). */
  night?: boolean;
  /** Losowy wariant 0–1 (co Gabi je przy stole, telefon czy herbata na kanapie). */
  variant?: number;
}

const pickOf = <T>(ctx: PlanCtx, items: readonly T[]): T => items[Math.min(items.length - 1, Math.floor((ctx.variant ?? 0) * items.length))];
const at = (frames: readonly string[], fps: number, where: PoseAt): GabiPose => ({ kind: 'frames', frames, fps, at: where });

/**
 * Kroki interakcji; null dla przedmiotów bez interakcji i dla tych, które zaczynają zajęcie
 * (`study`, `crochet`, `music`).
 */
export function interactionSteps(kind: Interaction, ctx: PlanCtx): InteractionStep[] | null {
  switch (kind) {
    case 'water': {
      // konewka: Gabi zwrócona do rośliny, potem kciuk w górę
      const face = (frames: string[], fps = 1): GabiPose => ({ kind: 'frames', frames, fps, face: true });
      return [
        { ms: 400, item: null, gabi: face(['water_1']) },
        { ms: 1500, item: null, gabi: face(['water_2', 'water_3'], 2), line: 'water', effect: 'water' },
        { ms: 500, item: null, gabi: face(['water_4']) },
        { ms: 900, item: null, gabi: face(['care_thumbs']) },
      ];
    }
    case 'read':
      return [{ ms: 6000, item: null, gabi: { kind: 'frames', frames: ['study_3'], fps: 1 }, line: 'read' }];
    case 'play':
      return [{ ms: 8000, item: null, gabi: { kind: 'frames', frames: ['phone_2', 'phone_3'], fps: 1.5 }, line: 'play' }];
    case 'cute':
      return [{ ms: 1800, item: null, gabi: { kind: 'frames', frames: ['expr_love'], fps: 1 }, line: 'cute', effect: 'hearts' }];
    case 'cat':
      // legowisko: kotek przychodzi — głaskanie, smaczek, przytulanie
      return [
        { ms: 2400, item: null, gabi: { kind: 'frames', frames: ['cat_pet_1', 'cat_pet_2', 'cat_pet_3'], fps: 1.2, face: true }, line: 'cat' },
        { ms: 1200, item: null, gabi: { kind: 'frames', frames: ['cat_pet_4'], fps: 1, face: true } },
        { ms: 2200, item: null, gabi: { kind: 'frames', frames: ['cat_hug_1', 'cat_hug_2'], fps: 1 }, effect: 'hearts' },
      ];
    case 'tv':
      // przed telewizorem (od tyłu): oglądanie, śmiech, granie na konsoli, wygrana
      return [
        { ms: 4500, item: null, gabi: at(['tv_1', 'tv_2'], 0.7, 'front'), line: 'tv', effect: 'screen' },
        { ms: 1200, item: null, gabi: at(['tv_3'], 1, 'front'), effect: 'screen' },
        { ms: 4500, item: null, gabi: at(['console_1', 'console_2', 'console_3'], 1.6, 'front'), line: 'play', effect: 'screen' },
        { ms: 1300, item: null, gabi: at(['console_4'], 1, 'front'), effect: 'screen' },
      ];
    case 'relax':
      // na siedzisku: odpoczynek, potem telefon albo herbatka, na koniec przeciągnięcie
      return [
        { ms: 2600, item: null, gabi: at(['sit_idle_1', 'sit_idle_2'], 0.8, 'seat') },
        pickOf(ctx, [
          { ms: 5000, item: null, gabi: at(['sit_phone_1', 'sit_phone_2', 'sit_phone_3'], 1.4, 'seat'), line: 'relaxPhone' },
          { ms: 5000, item: null, gabi: at(['sit_tea_1', 'sit_tea_2', 'sit_tea_3', 'sit_tea_4'], 1, 'seat'), line: 'tea' },
        ] as InteractionStep[]),
        { ms: 1300, item: null, gabi: at(['sit_idle_3'], 1, 'seat') },
      ];
    case 'lounge':
      // na kanapie na leżąco: manga, potem telefon
      return [
        { ms: 5000, item: null, gabi: at(['lie_read_1', 'lie_read_2'], 0.8, 'lie'), line: 'read' },
        { ms: 4000, item: null, gabi: at(['lie_phone_1', 'lie_phone_2'], 0.8, 'lie'), line: 'relaxPhone' },
      ];
    case 'lamp':
      return [{ ms: 600, item: null, gabi: IDLE }];
    case 'calendar':
      return [{ ms: 2200, item: null, gabi: { kind: 'frames', frames: ['fun_talk'], fps: 1 }, line: 'calendar' }];
    case 'window':
      // przy oknie (od tyłu): dotyka szyby, w dzień macha sąsiadom, w nocy patrzy w gwiazdy
      return [
        { ms: 700, item: null, gabi: at(['back_idle'], 1, 'under') },
        { ms: 1500, item: null, gabi: at(['back_touch'], 1, 'under'), line: 'window' },
        { ms: 1600, item: null, gabi: ctx.night ? at(['back_idle'], 1, 'under') : at(['back_wave', 'back_idle'], 2.5, 'under') },
        { ms: 800, item: null, gabi: at(['back_hips'], 1, 'under') },
      ];
    case 'nap':
      // drzemka na kanapie na leżąco
      return [{ ms: 9000, item: null, gabi: at(['nap_1', 'nap_2'], 0.8, 'lie'), line: 'nap' }];
    case 'coffee': {
      // przy stole (stół zasłania nogi): kawa, ciasto albo KitKat
      const what = pickOf(ctx, ['coffee', 'cake', 'kitkat'] as const);
      return [{ ms: 5000, item: null, gabi: at([1, 2, 3, 4].map((i) => `table_${what}_${i}`), 1, 'behind'), line: what, effect: 'hearts' }];
    }
    case 'wardrobe':
      // chwila przy wieszaku, potem ekran Szafy (w pokoju)
      return [{ ms: 500, item: null, gabi: IDLE }];
    case 'toilet':
      return [
        { ms: 700, item: 'open', gabi: IDLE },
        { ms: 2500, item: 'gabi', gabi: HIDDEN },
        { ms: 1400, item: 'flush', gabi: IDLE, line: 'toilet' },
        { ms: 400, item: null, gabi: IDLE },
      ];
    case 'shower':
      return [
        { ms: 900, item: 'drip', gabi: IDLE, line: 'shower' },
        { ms: 700, item: 'on', gabi: IDLE },
        { ms: 6000, item: 'gabi', gabi: HIDDEN },
        { ms: 2500, item: null, gabi: TURBAN, line: 'showerDone' },
      ];
    case 'bath':
      return [
        { ms: 1500, item: 'fill', gabi: IDLE, line: 'bath' },
        { ms: 1200, item: 'bubbles', gabi: IDLE },
        { ms: 8000, item: 'gabi', gabi: HIDDEN, line: 'bathRelax' },
        { ms: 2500, item: null, gabi: TURBAN },
        { ms: 3000, item: null, gabi: HAIRDRYER, line: 'hairdryer' },
      ];
    case 'sink': {
      const steps: InteractionStep[] = [
        { ms: 800, item: 'on', gabi: IDLE, line: 'sink' },
        { ms: 3000, item: 'gabi', gabi: HIDDEN },
      ];
      if (ctx.hasRail) steps.push({ ms: 2500, item: null, rail: 'gabi', gabi: HIDDEN, line: 'towel' });
      return steps;
    }
    case 'hairdryer':
      return [{ ms: 3500, item: null, gabi: HAIRDRYER, line: 'hairdryer' }];
    default:
      return null;
  }
}

export function totalMs(steps: readonly InteractionStep[]): number {
  return steps.reduce((a, s) => a + s.ms, 0);
}

/** Krok w chwili `elapsed` od startu (z jego początkiem) albo null, gdy interakcja się skończyła. */
export function stepAt(steps: readonly InteractionStep[], elapsed: number): { index: number; step: InteractionStep; startMs: number } | null {
  let start = 0;
  const t = Math.max(0, elapsed);
  for (let i = 0; i < steps.length; i++) {
    if (t < start + steps[i].ms) return { index: i, step: steps[i], startMs: start };
    start += steps[i].ms;
  }
  return null;
}

/** Bonus za interakcję (raz na godzinę na przedmiot): humor i energia; null — bez bonusu. */
export function interactionReward(kind: Interaction): { mood: number; energy: number } | null {
  switch (kind) {
    case 'water':
    case 'read':
    case 'toilet':
    case 'shower':
    case 'bath':
    case 'sink':
    case 'hairdryer':
      return { mood: 2, energy: 0 };
    case 'play':
      return { mood: 2, energy: -2 };
    case 'cute':
      return { mood: 1, energy: 0 };
    case 'coffee':
      return { mood: 2, energy: 2 };
    case 'relax':
    case 'lounge':
      return { mood: 2, energy: 1 };
    case 'tv':
      return { mood: 3, energy: -1 };
    case 'cat':
      return { mood: 3, energy: 0 };
    case 'nap':
      return { mood: 1, energy: 6 };
    default:
      return null;
  }
}

const clamp = (v: number) => Math.max(0, Math.min(CONFIG.needs.max, v));

/** Daje bonus, jeśli interakcja go ma i przedmiot jest po cooldownie (wtedy zapamiętuje cooldown). */
export function rewardInteraction(state: GameState, uid: string, kind: Interaction, now: number): { state: GameState; rewarded: boolean } {
  const r = interactionReward(kind);
  if (!r || !canReward(state, uid, now)) return { state, rewarded: false };
  const next: GameState = {
    ...state,
    needs: { ...state.needs, mood: clamp(state.needs.mood + r.mood), energy: clamp(state.needs.energy + r.energy) },
  };
  return { state: markReward(next, uid, now), rewarded: true };
}

/** Zapala/gasi lampkę (stan zapamiętany w układzie pokoju). */
export function toggleLamp(state: GameState, room: RoomId, uid: string): HomeOutcome {
  const r = state.rooms[room];
  const it = r.items.find((i) => i.uid === uid);
  if (!it) return { ok: false, reason: 'not-found' };
  if (findItem(it.itemId)?.interaction !== 'lamp') return { ok: false, reason: 'unknown-item' };
  return {
    ok: true,
    state: { ...state, rooms: { ...state.rooms, [room]: { ...r, items: r.items.map((i) => (i.uid === uid ? { ...i, lampOn: !i.lampOn } : i)) } } },
  };
}
