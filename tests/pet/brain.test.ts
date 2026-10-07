import { describe, expect, it } from 'vitest';
import { ACTION_MS, ROOM_BOUNDS, animationName, createBrain, stepBrain, triggerBrain, wakeBrain, WAKE_PAUSE_MS, type BrainCtx } from '../../src/pet/brain';
import { pickEmote as pickEmoteFn } from '../../src/pet/brain';

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
  it('sen > akcja > chód > stan > spoczynek', () => {
    expect(animationName(b, { sleeping: true, status: 'hungry' })).toBe('sleep');
    expect(animationName({ ...b, action: 'angry' }, { sleeping: false, status: 'starving' })).toBe('angry');
    expect(animationName({ ...b, action: 'happy' }, { sleeping: false, status: null })).toBe('happy');
    expect(animationName({ ...b, action: 'walk' }, { sleeping: false, status: null })).toBe('walk');
    expect(animationName(b, { sleeping: false, status: 'tired' })).toBe('tired');
    expect(animationName(b, { sleeping: false, status: null })).toBe('idle');
  });
});

it('bez pozwolenia na chód (canWalk=false) nie rusza w drogę', () => {
  const next = stepBrain(createBrain(0), 16, { now: 10_000, mood: 'happy', sleeping: false, rng: () => 0, canWalk: false });
  expect(next.action).toBe('idle');
});

describe('wakeBrain', () => {
  it('macha ręką i nie rusza w drogę przez WAKE_PAUSE_MS', () => {
    const b = wakeBrain(createBrain(0), 5000);
    expect(b.action).toBe('wave');
    expect(b.targetX).toBe(b.x);
    expect(b.nextDecisionAt).toBe(5000 + WAKE_PAUSE_MS);
    const after = stepBrain(b, 16, ctx({ now: 5000 + ACTION_MS.wave }));
    expect(after.nextDecisionAt).toBeGreaterThanOrEqual(5000 + WAKE_PAUSE_MS);
  });

  it('spontaniczne miny: zmęczona ziewa, smutna się nudzi, wesoła myśli/ma pomysł/przeciąga się/śmieje', () => {
    expect(pickEmoteFn({ mood: 80, energy: 20 }, () => 0)).toBe('yawn');
    expect(pickEmoteFn({ mood: 20, energy: 80 }, () => 0)).toBe('bored');
    const happy = new Set([0, 0.3, 0.6, 0.9].map((v) => pickEmoteFn({ mood: 80, energy: 80 }, () => v)));
    expect(happy).toEqual(new Set(['think', 'idea', 'stretch', 'laugh']));
  });
});
