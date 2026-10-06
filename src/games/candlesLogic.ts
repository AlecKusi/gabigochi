export const CANDLES = {
  slots: 8,
  mainDuration: 30_000,
  finaleDuration: 10_000,
  finaleCount: 26,
  comboWindow: 600,
  maxComboBonus: 3,
} as const;

export type CandlesPhase = 'main' | 'finale' | 'done';

export interface CandlesState {
  phase: CandlesPhase;
  t: number;
  phaseT: number;
  /** Czas zgaśnięcia (w phaseT) zapalonej świeczki albo null. */
  lit: (number | null)[];
  finale: boolean[];
  score: number;
  combo: number;
  lastBlowAt: number;
  spawnIn: number;
}

export function createCandles(): CandlesState {
  return {
    phase: 'main',
    t: 0,
    phaseT: 0,
    lit: Array(CANDLES.slots).fill(null),
    finale: [],
    score: 0,
    combo: 0,
    lastBlowAt: -1e9,
    spawnIn: 400,
  };
}

export function stepCandles(s: CandlesState, dtMs: number, rng: () => number): CandlesState {
  if (s.phase === 'done') return s;
  const t = s.t + dtMs;
  const phaseT = s.phaseT + dtMs;

  if (s.phase === 'main') {
    if (phaseT >= CANDLES.mainDuration) {
      return { ...s, t, phaseT: 0, phase: 'finale', lit: Array(CANDLES.slots).fill(null), finale: Array(CANDLES.finaleCount).fill(true) };
    }
    const p = phaseT / CANDLES.mainDuration;
    const lit = s.lit.map((expires) => (expires !== null && expires <= phaseT ? null : expires));
    let spawnIn = s.spawnIn - dtMs;
    if (spawnIn <= 0) {
      const free = lit.flatMap((v, i) => (v === null ? [i] : []));
      if (free.length > 0) lit[free[Math.floor(rng() * free.length)]] = phaseT + 1800 - 800 * p;
      spawnIn += 700 - 350 * p;
    }
    return { ...s, t, phaseT, lit, spawnIn };
  }

  const done = phaseT >= CANDLES.finaleDuration || s.finale.every((f) => !f);
  return { ...s, t, phaseT, phase: done ? 'done' : 'finale' };
}

export function blowCandle(s: CandlesState, index: number): CandlesState {
  if (s.phase === 'main') {
    if (s.lit[index] == null) return s;
    const lit = [...s.lit];
    lit[index] = null;
    const combo = s.t - s.lastBlowAt <= CANDLES.comboWindow ? s.combo + 1 : 0;
    return { ...s, lit, combo, lastBlowAt: s.t, score: s.score + 1 + Math.min(combo, CANDLES.maxComboBonus) };
  }
  if (s.phase === 'finale') {
    if (!s.finale[index]) return s;
    const finale = [...s.finale];
    finale[index] = false;
    return { ...s, finale, score: s.score + 1 };
  }
  return s;
}
