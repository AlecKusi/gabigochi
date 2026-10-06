import { describe, expect, it } from 'vitest';
import { ACTION_MS, ROOM_BOUNDS, animationName, createBrain, stepBrain, triggerBrain, type BrainCtx } from '../../src/pet/brain';

const ctx = (patch: Partial<BrainCtx> = {}): BrainCtx => ({ now: 10_000, mood: 'happy', sleeping: false, rng: () => 0, ...patch });

describe('stepBrain', () => {
  it('po pauzie decyduje się iść', () => {
    const b = stepBrain(createBrain(0), 16, ctx());
    expect(b.action).toBe('walk');
    expect(b.targetX).toBe(ROOM_BOUNDS.minX);
  });

  it('nie decyduje przed końcem pauzy', () => {
    const b0 = createBrain(0);
    expect(stepBrain(b0, 16, ctx({ now: 100 }))).toBe(b0);
  });

  it('idzie z prędkością walkSpeed i patrzy w stronę celu', () => {
    const b = { ...createBrain(0), action: 'walk' as const, x: 64, targetX: 24 };
    const next = stepBrain(b, 1000, ctx());
    expect(next.x).toBeCloseTo(64 - ROOM_BOUNDS.walkSpeed);
    expect(next.facing).toBe('left');
  });

  it('po dojściu staje', () => {
    const b = { ...createBrain(0), action: 'walk' as const, x: 25, targetX: 24 };
    const next = stepBrain(b, 1000, ctx());
    expect(next.x).toBe(24);
    expect(next.action).toBe('idle');
    expect(next.nextDecisionAt).toBeGreaterThan(10_000);
  });

  it('śpiąca stoi w miejscu', () => {
    const b = { ...createBrain(0), action: 'walk' as const, x: 50, targetX: 90 };
    const next = stepBrain(b, 1000, ctx({ sleeping: true }));
    expect(next.action).toBe('idle');
    expect(next.x).toBe(50);
  });

  it('po przebudzeniu nie rusza od razu w drogę', () => {
    const walking = { ...createBrain(0), action: 'walk' as const, x: 50, targetX: 90 };
    const asleep = stepBrain(walking, 16, ctx({ sleeping: true }));
    expect(asleep.nextDecisionAt).toBeGreaterThan(10_000);
    const awake = stepBrain(asleep, 16, ctx());
    expect(awake.action).toBe('idle');
  });

  it('akcja czasowa trwa ACTION_MS, potem idle', () => {
    const b = triggerBrain(createBrain(0), 'eat', 1000);
    expect(stepBrain(b, 16, ctx({ now: 1000 + ACTION_MS.eat - 1 }))).toBe(b);
    expect(stepBrain(b, 16, ctx({ now: 1000 + ACTION_MS.eat })).action).toBe('idle');
  });

  it('smutna rzadko chodzi', () => {
    const b = stepBrain(createBrain(0), 16, ctx({ mood: 'sad', rng: () => 0.5 }));
    expect(b.action).toBe('idle');
  });
});

describe('animationName', () => {
  const b = createBrain(0);
  const st = { sleeping: false, hungry: false, mood: 'happy' as const };
  it('mapuje stany na animacje', () => {
    expect(animationName(b, { ...st, sleeping: true })).toBe('sleep');
    expect(animationName({ ...b, action: 'walk' }, st)).toBe('walk');
    expect(animationName({ ...b, action: 'jump' }, st)).toBe('wave');
    expect(animationName(b, { ...st, hungry: true })).toBe('hungry');
    expect(animationName(b, { ...st, mood: 'sad' })).toBe('sad');
    expect(animationName(b, st)).toBe('idle');
  });
});
