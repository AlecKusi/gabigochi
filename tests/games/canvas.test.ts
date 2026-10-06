import { describe, expect, it } from 'vitest';
import { fitScale } from '../../src/games/canvas';

describe('fitScale', () => {
  it('zostawia skalę < 1 bez zmian', () => {
    expect(fitScale(0.7)).toBe(0.7);
  });
  it('używa skali całkowitej, gdy marnuje <= 15% miejsca', () => {
    expect(fitScale(3)).toBe(3);
    expect(fitScale(3.4)).toBe(3);
  });
  it('w innym wypadku schodzi do kroków co pół, nie poniżej 1', () => {
    expect(fitScale(1.2)).toBe(1);
    expect(fitScale(2.7)).toBe(2.5);
    expect(fitScale(1.9)).toBe(1.5);
  });
});
