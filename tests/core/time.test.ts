import { describe, expect, it } from 'vitest';
import { dayKey, dayNumber } from '../../src/core/time';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('dayKey', () => {
  it('formatuje lokalną datę', () => {
    expect(dayKey(at(2026, 10, 6, 23))).toBe('2026-10-06');
    expect(dayKey(at(2026, 1, 9, 0))).toBe('2026-01-09');
  });
});

describe('dayNumber', () => {
  it('dzień utworzenia to dzień 1', () => {
    expect(dayNumber(at(2026, 10, 6, 8), at(2026, 10, 6, 22))).toBe(1);
  });
  it('liczy dni kalendarzowe, nie pełne doby', () => {
    expect(dayNumber(at(2026, 10, 6, 23), at(2026, 10, 7, 1))).toBe(2);
    expect(dayNumber(at(2026, 10, 6), at(2026, 10, 16))).toBe(11);
  });
});
