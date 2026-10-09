import { describe, expect, it } from 'vitest';
import { SKY, WINDOW_PHASE_TINT, dayPhase } from '../../src/home/daytime';

const at = (h: number) => new Date(2026, 9, 9, h, 30);

describe('pora dnia', () => {
  it('rano, dzień, wieczór, noc z godziny', () => {
    expect(dayPhase(at(5))).toBe('night');
    expect(dayPhase(at(6))).toBe('morning');
    expect(dayPhase(at(9))).toBe('morning');
    expect(dayPhase(at(12))).toBe('day');
    expect(dayPhase(at(18))).toBe('evening');
    expect(dayPhase(at(20))).toBe('evening');
    expect(dayPhase(at(21))).toBe('night');
    expect(dayPhase(at(0))).toBe('night');
  });
  it('okna w dzień bez barwy, w pozostałych porach zabarwione; niebo na każdą porę', () => {
    expect(WINDOW_PHASE_TINT.day).toBeNull();
    for (const p of ['morning', 'evening', 'night'] as const) expect(WINDOW_PHASE_TINT[p]).toMatch(/^rgba/);
    for (const p of ['morning', 'day', 'evening', 'night'] as const) expect(SKY[p]).toHaveLength(2);
  });
});
