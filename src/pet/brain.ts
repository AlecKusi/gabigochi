import type { MoodLevel } from '../core/types';

export type PetAction = 'idle' | 'walk' | 'eat' | 'wave' | 'talk' | 'jump';
export type TimedAction = Exclude<PetAction, 'idle' | 'walk'>;

export interface Brain {
  action: PetAction;
  x: number;
  targetX: number;
  facing: 'left' | 'right';
  actionEndsAt: number;
  nextDecisionAt: number;
}

export interface BrainCtx {
  now: number;
  mood: MoodLevel;
  sleeping: boolean;
  rng: () => number;
}

/** Współrzędne w pikselach logicznych pokoju (128 px szerokości). */
export const ROOM_BOUNDS = { minX: 24, maxX: 104, walkSpeed: 14 } as const;
export const ACTION_MS: Record<TimedAction, number> = { eat: 1600, wave: 1200, talk: 2500, jump: 700 };
const WALK_CHANCE: Record<MoodLevel, number> = { happy: 0.7, ok: 0.45, sad: 0.15 };
const PAUSE_MS: Record<MoodLevel, number> = { happy: 2000, ok: 3500, sad: 6000 };

const isTimed = (a: PetAction): a is TimedAction => a !== 'idle' && a !== 'walk';
const pause = (ctx: BrainCtx) => PAUSE_MS[ctx.mood] + ctx.rng() * 2000;

export function createBrain(now: number): Brain {
  return { action: 'idle', x: 64, targetX: 64, facing: 'right', actionEndsAt: 0, nextDecisionAt: now + 2000 };
}

export function stepBrain(b: Brain, dtMs: number, ctx: BrainCtx): Brain {
  if (ctx.sleeping) {
    return b.action === 'idle' && b.targetX === b.x ? b : { ...b, action: 'idle', targetX: b.x };
  }
  if (isTimed(b.action)) {
    if (ctx.now < b.actionEndsAt) return b;
    return { ...b, action: 'idle', nextDecisionAt: ctx.now + 1500 };
  }
  if (b.action === 'walk') {
    const diff = b.targetX - b.x;
    const step = (ROOM_BOUNDS.walkSpeed * dtMs) / 1000;
    if (Math.abs(diff) <= step) {
      return { ...b, x: b.targetX, action: 'idle', nextDecisionAt: ctx.now + pause(ctx) };
    }
    return { ...b, x: b.x + Math.sign(diff) * step, facing: diff < 0 ? 'left' : 'right' };
  }
  if (ctx.now < b.nextDecisionAt) return b;
  if (ctx.rng() < WALK_CHANCE[ctx.mood]) {
    const targetX = ROOM_BOUNDS.minX + ctx.rng() * (ROOM_BOUNDS.maxX - ROOM_BOUNDS.minX);
    return { ...b, action: 'walk', targetX };
  }
  return { ...b, nextDecisionAt: ctx.now + pause(ctx) };
}

export function triggerBrain(b: Brain, action: TimedAction, now: number): Brain {
  return { ...b, action, targetX: b.x, actionEndsAt: now + ACTION_MS[action] };
}

export function animationName(b: Brain, s: { sleeping: boolean; hungry: boolean; mood: MoodLevel }): string {
  if (s.sleeping) return 'sleep';
  if (b.action === 'walk' || b.action === 'eat' || b.action === 'wave' || b.action === 'talk') return b.action;
  if (b.action === 'jump') return 'wave';
  if (s.hungry) return 'hungry';
  if (s.mood === 'sad') return 'sad';
  return 'idle';
}
