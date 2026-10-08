import { describe, expect, it } from 'vitest';
import { applyElapsed, moodLevel, needStatus } from '../../src/core/needs';
import { createState } from '../../src/core/state';
import { HOUR } from '../../src/core/time';

const T0 = new Date(2026, 9, 6, 12).getTime();

describe('applyElapsed', () => {
  it('na jawie: godzina zmniejsza potrzeby', () => {
    const s = applyElapsed(createState(T0), T0 + HOUR);
    expect(s.needs.hunger).toBeCloseTo(74);
    expect(s.needs.mood).toBeCloseTo(86);
    expect(s.needs.energy).toBeCloseTo(85);
    expect(s.lastUpdate).toBe(T0 + HOUR);
  });

  it('3 dni offline: potrzeby nie schodzą poniżej zera', () => {
    const s = applyElapsed(createState(T0), T0 + 72 * HOUR);
    expect(s.needs).toEqual({ hunger: 0, mood: 0, energy: 0 });
  });

  it('sen: energia rośnie, głód i humor spadają wolniej', () => {
    const start = { ...createState(T0), sleeping: true, needs: { hunger: 80, mood: 90, energy: 50 } };
    // pełna energia w 10 minut: 3 minuty snu = +30
    const s = applyElapsed(start, T0 + 0.05 * HOUR);
    expect(s.needs.energy).toBeCloseTo(80);
    expect(s.needs.hunger).toBeCloseTo(79.85);
    expect(s.needs.mood).toBeCloseTo(89.9);
    expect(s.sleeping).toBe(true);
  });

  it('sen: budzi się przy pełnej energii, resztę czasu liczy na jawie', () => {
    const start = { ...createState(T0), sleeping: true, needs: { hunger: 80, mood: 90, energy: 40 } };
    const s = applyElapsed(start, T0 + 10 * HOUR);
    expect(s.sleeping).toBe(false);
    // 6 minut snu do pełna, potem 9,9 h na jawie
    expect(s.needs.energy).toBeCloseTo(50.5);
    expect(s.needs.hunger).toBeCloseTo(20.3);
    expect(s.needs.mood).toBeCloseTo(50.2);
  });

  it('brak upływu czasu zwraca ten sam obiekt', () => {
    const s = createState(T0);
    expect(applyElapsed(s, T0)).toBe(s);
    expect(applyElapsed(s, T0 - 1000)).toBe(s);
  });
});

describe('moodLevel', () => {
  it('zależy od najniższej potrzeby', () => {
    expect(moodLevel({ hunger: 70, mood: 90, energy: 61 })).toBe('happy');
    expect(moodLevel({ hunger: 30, mood: 90, energy: 90 })).toBe('ok');
    expect(moodLevel({ hunger: 90, mood: 90, energy: 29 })).toBe('sad');
  });
});

describe('needStatus', () => {
  it('flaguje niskie potrzeby', () => {
    expect(needStatus({ hunger: 24, mood: 24, energy: 19 })).toEqual({ hungry: true, bored: true, sleepy: true });
    expect(needStatus({ hunger: 25, mood: 25, energy: 20 })).toEqual({ hungry: false, bored: false, sleepy: false });
  });
});
