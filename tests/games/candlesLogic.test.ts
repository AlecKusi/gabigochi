import { describe, expect, it } from 'vitest';
import { CANDLES, blowCandle, createCandles, stepCandles, type CandlesState } from '../../src/games/candlesLogic';

const rng = () => 0;
const withLit = (lit: (number | null)[], patch: Partial<CandlesState> = {}): CandlesState => ({
  ...createCandles(),
  spawnIn: 1e9,
  lit,
  ...patch,
});

describe('stepCandles', () => {
  it('zapala świeczkę po odliczeniu', () => {
    const s = stepCandles({ ...createCandles(), spawnIn: 10 }, 16, rng);
    expect(s.lit.filter((v) => v !== null)).toHaveLength(1);
  });

  it('świeczka gaśnie sama po czasie', () => {
    const s = withLit([100, null, null, null, null, null, null, null]);
    expect(stepCandles(s, 200, rng).lit[0]).toBeNull();
  });

  it('po 30 s finał z 26 świeczkami', () => {
    const s = stepCandles({ ...createCandles(), phaseT: CANDLES.mainDuration - 1 }, 16, rng);
    expect(s.phase).toBe('finale');
    expect(s.finale).toHaveLength(26);
    expect(s.finale.every(Boolean)).toBe(true);
  });

  it('finał kończy się po zdmuchnięciu wszystkich lub po czasie', () => {
    const allOut = { ...createCandles(), phase: 'finale' as const, finale: Array(26).fill(false) };
    expect(stepCandles(allOut, 16, rng).phase).toBe('done');
    const timeout = { ...createCandles(), phase: 'finale' as const, phaseT: CANDLES.finaleDuration, finale: Array(26).fill(true) };
    expect(stepCandles(timeout, 16, rng).phase).toBe('done');
  });
});

describe('blowCandle', () => {
  it('zdmuchnięcie zapalonej daje punkt', () => {
    const s = blowCandle(withLit([5000, null, null, null, null, null, null, null], { t: 1000 }), 0);
    expect(s.score).toBe(1);
    expect(s.lit[0]).toBeNull();
  });

  it('szybka seria daje combo', () => {
    let s = withLit([5000, 5000, 5000, null, null, null, null, null], { t: 1000 });
    s = blowCandle(s, 0);
    s = blowCandle({ ...s, t: 1300 }, 1);
    expect(s.combo).toBe(1);
    expect(s.score).toBe(1 + 2);
  });

  it('zgaszona świeczka nic nie robi', () => {
    const s = withLit(Array(8).fill(null));
    expect(blowCandle(s, 3)).toBe(s);
  });

  it('w finale każda świeczka to punkt', () => {
    const s = { ...createCandles(), phase: 'finale' as const, finale: Array(26).fill(true) };
    const next = blowCandle(s, 25);
    expect(next.score).toBe(1);
    expect(next.finale[25]).toBe(false);
  });
});
