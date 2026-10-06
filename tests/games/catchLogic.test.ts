import { describe, expect, it } from 'vitest';
import { CATCH, POINTS, createCatch, pickKind, stepCatch, type CatchState } from '../../src/games/catchLogic';

const quiet = (patch: Partial<CatchState>): CatchState => ({ ...createCatch(), spawnIn: 1e9, ...patch });
const rng = () => 0.99;

describe('stepCatch', () => {
  it('złapane jedzenie daje punkty', () => {
    const s = quiet({ items: [{ x: 58, y: CATCH.catchTop, kind: 'apple', vy: 0 }] });
    const { state, events } = stepCatch(s, 16, rng);
    expect(state.score).toBe(POINTS.apple);
    expect(state.items).toHaveLength(0);
    expect(events).toContainEqual({ type: 'caught', kind: 'apple', points: POINTS.apple });
  });

  it('brokuł zabiera serduszko', () => {
    const s = quiet({ items: [{ x: 58, y: CATCH.catchTop, kind: 'broccoli', vy: 0 }] });
    const { state, events } = stepCatch(s, 16, rng);
    expect(state.lives).toBe(CATCH.lives - 1);
    expect(events).toContainEqual({ type: 'hit' });
  });

  it('nie złapane spada poza ekran', () => {
    const s = quiet({ items: [{ x: 0, y: CATCH.H - 1, kind: 'pizza', vy: 100 }] });
    const { state } = stepCatch(s, 16, rng);
    expect(state.items).toHaveLength(0);
    expect(state.score).toBe(0);
  });

  it('koniec po czasie', () => {
    const { state, events } = stepCatch(quiet({ t: CATCH.duration - 10 }), 20, rng);
    expect(state.over).toBe(true);
    expect(events).toContainEqual({ type: 'over' });
  });

  it('koniec po utracie serduszek', () => {
    const s = quiet({ lives: 1, items: [{ x: 58, y: CATCH.catchTop, kind: 'broccoli', vy: 0 }] });
    expect(stepCatch(s, 16, rng).state.over).toBe(true);
  });

  it('postać idzie do celu z ograniczoną prędkością, w granicach planszy', () => {
    const { state } = stepCatch(quiet({ playerX: 64, targetX: 999 }), 100, rng);
    expect(state.playerX).toBeCloseTo(64 + CATCH.playerSpeed * 0.1);
    expect(state.moving).toBe(1);
    const far = stepCatch(quiet({ playerX: 110, targetX: 999 }), 1000, rng).state;
    expect(far.playerX).toBe(CATCH.maxX);
  });

  it('pojawia się nowe jedzenie', () => {
    const { state } = stepCatch({ ...createCatch(), spawnIn: 0 }, 16, () => 0.3);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].kind).toBe('apple');
  });
});

describe('pickKind', () => {
  it('rozkład rodzajów', () => {
    expect(pickKind(0.01)).toBe('kitkat');
    expect(pickKind(0.1)).toBe('broccoli');
    expect(pickKind(0.99)).toBe('cake');
  });
});
