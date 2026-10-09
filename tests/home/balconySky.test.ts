import { describe, expect, it } from 'vitest';
import { METEOR_MS, METEOR_SLOT_MS, litShare, meteorAt, starDimmed, windowLit } from '../../src/home/balconySky';

const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m).getTime();

describe('życie nieba nad balkonem', () => {
  it('im później w nocy, tym mniej okien świeci; wieczorem prawie wszystkie, w dzień żadne', () => {
    expect(litShare('evening', 19)).toBeGreaterThan(litShare('night', 22));
    expect(litShare('night', 22)).toBeGreaterThan(litShare('night', 1));
    expect(litShare('night', 1)).toBeGreaterThan(litShare('night', 5));
    expect(litShare('night', 5)).toBeGreaterThan(0.1);
    expect(litShare('day', 12)).toBe(0);
    expect(litShare('morning', 8)).toBe(0);
  });

  it('okna gasną i zapalają się w czasie, a odsetek świecących zgadza się z porą', () => {
    const lit = (clock: number, share: number) => Array.from({ length: 200 }, (_, i) => windowLit(i, clock, share)).filter(Boolean).length;
    expect(lit(at(22), 0.8)).toBeGreaterThan(130);
    expect(lit(at(4), 0.3)).toBeLessThan(90);
    expect(lit(at(4), 0)).toBe(0);
    // po kilku minutach część okien zmieniła stan
    const before = Array.from({ length: 200 }, (_, i) => windowLit(i, at(23), 0.6));
    const after = Array.from({ length: 200 }, (_, i) => windowLit(i, at(23, 5), 0.6));
    const changed = before.filter((v, i) => v !== after[i]).length;
    expect(changed).toBeGreaterThan(10);
    expect(changed).toBeLessThan(150);
  });

  it('spadające gwiazdy: co kilkanaście sekund, krótki lot, cała smuga na niebie nad miastem', () => {
    let count = 0;
    let frames = 0;
    for (let t = 0; t < 10 * 60_000; t += 50) {
      const m = meteorAt(t);
      if (!m) continue;
      frames++;
      if (!meteorAt(t - 50)) count++;
      expect(m.p).toBeGreaterThanOrEqual(0);
      expect(m.p).toBeLessThanOrEqual(1);
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThan(128);
      expect(m.y).toBeGreaterThanOrEqual(10);
      expect(m.y).toBeLessThan(64);
    }
    // ~55% okien czasu po 7 s → w 10 min około 47 gwiazd
    expect(count).toBeGreaterThan(25);
    expect(count).toBeLessThan(70);
    expect(frames / count).toBeCloseTo(METEOR_MS / 50, -1);
    expect(METEOR_SLOT_MS).toBeGreaterThan(METEOR_MS);
  });

  it('migocząca gwiazda przygasa tylko na chwilę', () => {
    const dim = Array.from({ length: 1000 }, (_, k) => starDimmed(5, k * 20)).filter(Boolean).length;
    expect(dim).toBeGreaterThan(50);
    expect(dim).toBeLessThan(250);
  });
});
