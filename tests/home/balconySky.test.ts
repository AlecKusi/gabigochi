import { describe, expect, it } from 'vitest';
import { BIRDS_MS, CLOUDS, METEOR_MS, METEOR_SLOT_MS, birdsAt, cloudX, litShare, meteorAt, starDimmed, windowLit } from '../../src/home/balconySky';

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

  it('chmurki w dzień dryfują w prawo i wracają zza lewej krawędzi; na starcie stoją tam, gdzie dawniej', () => {
    CLOUDS.forEach((c, i) => {
      expect(cloudX(i, 0)).toBeCloseTo(c.x);
      expect(cloudX(i, 10_000)).toBeCloseTo(c.x + c.speed * 10);
      for (let t = 0; t < 600_000; t += 997) {
        const x = cloudX(i, t);
        expect(x).toBeGreaterThanOrEqual(-20 - c.w);
        expect(x).toBeLessThan(128 + 0.001);
      }
    });
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
