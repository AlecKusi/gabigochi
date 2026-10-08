import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/core/config';
import { BRICKS, bricksReward } from '../../src/games/bricksLogic';
import { CANDLES } from '../../src/games/candlesLogic';
import { CATCH, POINTS } from '../../src/games/catchLogic';
import { MAX_HINTS, cryptoScore } from '../../src/games/cryptoLogic';
import { GAMES } from '../../src/games';
import { memoryScore } from '../../src/games/memoryLogic';
import { catchReward, candlesReward, memoryReward } from '../../src/games/rewards';
import { COMMON_RULES, GAME_RULES } from '../../src/games/rules';
import { DIFFICULTY_SCORE } from '../../src/games/sudokuLogic';

const text = (id: string) => {
  const r = GAME_RULES[id];
  return [r.goal, ...r.how, ...r.scoring].join(' ');
};

describe('zasady minigier zgadzają się z grą', () => {
  it('każda gra ma zasady', () => {
    for (const g of GAMES) {
      const r = GAME_RULES[g.id];
      expect(r, g.id).toBeDefined();
      expect(r.how.length, g.id).toBeGreaterThan(0);
      expect(r.scoring.length, g.id).toBeGreaterThan(0);
    }
  });

  it('łapanie: czas, serduszka, punkty, nagroda', () => {
    const t = text('catch');
    expect(t).toContain(`${CATCH.duration / 1000} sekund`);
    expect(t).toContain(`${CATCH.lives} serduszek`);
    expect(t).toContain(`KitKat ${POINTS.kitkat} pkt`);
    expect(t).toContain(`tort ${POINTS.cake} pkt`);
    expect(catchReward(1000).coins).toBe(50);
    expect(catchReward(100).coins).toBe(10);
  });

  it('świeczki: czasy, finał, nagroda', () => {
    const t = text('candles');
    expect(t).toContain(`${CANDLES.mainDuration / 1000} sekund`);
    expect(t).toContain(`${CANDLES.finaleCount} świeczek`);
    expect(t).toContain(`${CANDLES.finaleDuration / 1000} sekund`);
    expect(candlesReward(0).coins).toBe(5);
    expect(candlesReward(1000).coins).toBe(40);
  });

  it('klocki: nagroda za rundę', () => {
    expect(bricksReward(3).coins).toBe(6);
    expect(bricksReward(100).coins).toBe(50);
    expect(BRICKS.DOUBLE_CHANCE).toBeGreaterThan(0);
  });

  it('memory: 8 ruchów = 100 pkt, −4 za ruch, min 10', () => {
    expect(memoryScore(8)).toBe(100);
    expect(memoryScore(9)).toBe(96);
    expect(memoryScore(100)).toBe(10);
    expect(memoryReward(100).coins).toBe(40);
  });

  it('sudoku i krzyżówka: nagrody', () => {
    const s = text('sudoku');
    expect(s).toContain(`łatwe ${DIFFICULTY_SCORE.easy}`);
    expect(s).toContain(`średnie ${DIFFICULTY_SCORE.medium}`);
    expect(s).toContain(`trudne ${DIFFICULTY_SCORE.hard}`);
    expect(text('crypto')).toContain(`najwyżej ${MAX_HINTS} podpowiedzi`);
    expect(cryptoScore(0)).toBe(60);
    expect(cryptoScore(1)).toBe(50);
    expect(cryptoScore(9)).toBe(30);
  });

  it('wspólne: koszt energii', () => {
    expect(COMMON_RULES).toContain(`${CONFIG.games.energyCost} energii`);
    expect(COMMON_RULES).toContain(`${CONFIG.games.tiredBelow} energii`);
  });
});
