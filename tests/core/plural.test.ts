import { describe, expect, it } from 'vitest';
import { coinsLabel } from '../../src/core/plural';

describe('coinsLabel', () => {
  it('1 → monetę', () => {
    expect(coinsLabel(1)).toBe('monetę');
  });
  it('2–4, 22–24, 32–34 → monety', () => {
    for (const n of [2, 3, 4, 22, 23, 24, 32, 104]) expect(coinsLabel(n)).toBe('monety');
  });
  it('pozostałe → monet', () => {
    for (const n of [0, 5, 10, 11, 12, 13, 14, 15, 21, 25, 30, 100, 111, 112, 114]) expect(coinsLabel(n)).toBe('monet');
  });
});
