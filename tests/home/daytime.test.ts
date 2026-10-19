import { afterEach, describe, expect, it } from 'vitest';
import { PHASE_STARTS, SKY, WINDOW_PHASE_TINT, dayPhase, eveningProgress } from '../../src/home/daytime';
import { setSeasonOverride } from '../../src/home/season';

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

const on = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min);

describe('pora dnia wg pory roku', () => {
  afterEach(() => setSeasonOverride(null));

  it('zimą krótki dzień: rano 7–9, dzień 9–15:30, wieczór 15:30–17, noc od 17', () => {
    expect(dayPhase(on(1, 10, 6, 50))).toBe('night');
    expect(dayPhase(on(1, 10, 8))).toBe('morning');
    expect(dayPhase(on(1, 10, 15, 20))).toBe('day');
    expect(dayPhase(on(1, 10, 15, 40))).toBe('evening');
    expect(dayPhase(on(1, 10, 17, 10))).toBe('night');
  });

  it('latem długi dzień: rano 5–9, dzień 9–20, wieczór 20–22, noc od 22', () => {
    expect(dayPhase(on(7, 10, 5, 30))).toBe('morning');
    expect(dayPhase(on(7, 10, 19, 30))).toBe('day');
    expect(dayPhase(on(7, 10, 21))).toBe('evening');
    expect(dayPhase(on(7, 10, 22, 30))).toBe('night');
  });

  it('wiosną i jesienią jak dawniej; progi rosną w ciągu doby', () => {
    expect(PHASE_STARTS.spring).toEqual(PHASE_STARTS.autumn);
    for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) {
      const p = PHASE_STARTS[s];
      expect(p.morning < p.day && p.day < p.evening && p.evening < p.night, s).toBe(true);
    }
  });

  it('zmierzch: 0 w dzień i rano, wieczorem rośnie, 1 w nocy', () => {
    expect(eveningProgress(on(10, 9, 12))).toBe(0);
    expect(eveningProgress(on(10, 9, 7))).toBe(0);
    expect(eveningProgress(on(10, 9, 19, 30))).toBeCloseTo(0.5);
    expect(eveningProgress(on(10, 9, 23))).toBe(1);
    expect(eveningProgress(on(10, 9, 3))).toBe(1);
  });

  it('podgląd pory roku zmienia długość dnia', () => {
    setSeasonOverride('zima');
    expect(dayPhase(on(10, 9, 16))).toBe('evening');
  });
});
