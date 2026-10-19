import { describe, expect, it } from 'vitest';
import { BIRDS_MS, METEOR_MS, METEOR_SLOT_MS, birdsAt, meteorAt } from '../../src/home/balconySky';

describe('życie nieba nad balkonem', () => {
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

  it('spadające gwiazdy omijają namalowany księżyc (x 84–96) i korony drzew: głowa w x ≤ 82, y ≤ 56', () => {
    for (let t = 0; t < 10 * 60_000; t += 50) {
      const m = meteorAt(t);
      if (!m) continue;
      expect(m.x, `x @${t}`).toBeLessThanOrEqual(82);
      expect(m.y, `y @${t}`).toBeLessThanOrEqual(56);
    }
  });

  it('ptaki: klucze 1–4 ptaków co kilkanaście sekund, przelot przez cały pokój po niebie, machają skrzydłami', () => {
    let flocks = 0;
    const sizes = new Set<number>();
    for (let t = 0; t < 20 * 60_000; t += 100) {
      const b = birdsAt(t);
      if (b.length === 0) continue;
      if (birdsAt(t - 100).length === 0) {
        flocks++;
        sizes.add(b.length);
      }
      for (const bird of b) {
        expect(bird.y).toBeGreaterThanOrEqual(10);
        expect(bird.y).toBeLessThanOrEqual(56);
      }
    }
    expect(flocks).toBeGreaterThan(40);
    expect(flocks).toBeLessThan(110);
    expect([...sizes].every((n) => n >= 1 && n <= 4)).toBe(true);
    expect(sizes.size).toBeGreaterThan(2);
    // jeden klucz: wlatuje zza krawędzi, wylatuje za drugą, skrzydła zmieniają klatki
    let t0 = 0;
    while (birdsAt(t0).length === 0) t0 += 50;
    const first = birdsAt(t0)[0];
    const last = birdsAt(t0 + BIRDS_MS - 60)[0];
    expect(Math.abs(last.x - first.x)).toBeGreaterThan(150);
    const wings = new Set(Array.from({ length: 20 }, (_, k) => birdsAt(t0 + k * 100)[0]?.wings));
    expect(wings.has(0) && wings.has(1)).toBe(true);
  });
});
