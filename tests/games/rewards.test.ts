import { describe, expect, it } from 'vitest';
import { candlesReward, catchReward, memoryReward } from '../../src/games/rewards';

describe('nagrody', () => {
  it('Łapanie: 1 moneta za 10 pkt, maks. 50', () => {
    expect(catchReward(0)).toEqual({ coins: 0, moodBoost: 10 });
    expect(catchReward(125).coins).toBe(12);
    expect(catchReward(900).coins).toBe(50);
  });
  it('Świeczki: 5–40 monet', () => {
    expect(candlesReward(0)).toEqual({ coins: 5, moodBoost: 15 });
    expect(candlesReward(60).coins).toBe(17);
    expect(candlesReward(500).coins).toBe(40);
  });
  it('Memory: 15–40 monet', () => {
    expect(memoryReward(100)).toEqual({ coins: 40, moodBoost: 10 });
    expect(memoryReward(52).coins).toBe(21);
    expect(memoryReward(10).coins).toBe(15);
  });
});
