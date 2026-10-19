import { describe, expect, it } from 'vitest';
import { GLASS_MIN_SHARE, NO_GLASS, glassMask, isGlassColour } from '../../src/home/glass';

type Px = readonly [number, number, number, number];
const OUTLINE: Px = [42, 31, 61, 255];
const WOOD: Px = [120, 80, 50, 255];
const SKY: Px = [150, 200, 240, 255];

function image(w: number, h: number, paint: (x: number, y: number) => Px): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(paint(x, y), (y * w + x) * 4);
  return data;
}

describe('szyba okna', () => {
  it('kolory szyby: jasne niebo i ciemna nocna szyba tak; drewno, biel, czerwień nie', () => {
    expect(isGlassColour(150, 200, 240)).toBe(true);
    expect(isGlassColour(40, 50, 90)).toBe(true);
    expect(isGlassColour(120, 80, 50)).toBe(false);
    expect(isGlassColour(255, 255, 255)).toBe(false);
    expect(isGlassColour(200, 40, 50)).toBe(false);
  });

  it('okno 10×10: obrys, rama i szyba 6×6 — maska to szyba bez narożników, obrys odpada', () => {
    const w = 10;
    const data = image(w, w, (x, y) => {
      if (x === 0 || y === 0 || x === 9 || y === 9) return OUTLINE;
      if (x === 1 || y === 1 || x === 8 || y === 8) return WOOD;
      return SKY;
    });
    const m = glassMask(data, w, w)!;
    expect(m).not.toBeNull();
    const at = (x: number, y: number) => m[y * w + x];
    expect(m.reduce((a, v) => a + v, 0)).toBe(32);
    expect(at(0, 0)).toBe(0);
    expect(at(5, 0)).toBe(0);
    expect(at(1, 5)).toBe(0);
    expect(at(2, 2)).toBe(0);
    expect(at(2, 4)).toBe(1);
    expect(at(5, 5)).toBe(1);
  });

  it('bez szyby albo z maleńką szybą — null; samotna linia w kolorze szyby to nie szyba', () => {
    expect(glassMask(image(10, 10, () => WOOD), 10, 10)).toBeNull();
    expect(glassMask(image(20, 20, (x, y) => (x >= 9 && x <= 10 && y >= 9 && y <= 10 ? SKY : WOOD)), 20, 20)).toBeNull();
    expect(glassMask(image(20, 20, (x) => (x === 10 ? OUTLINE : WOOD)), 20, 20)).toBeNull();
  });

  it('próg udziału i wyjątki', () => {
    expect(GLASS_MIN_SHARE).toBeGreaterThan(0);
    for (const id of ['window_shutter', 'window_rose_2', 'window_rose_3', 'window_gothic_stained', 'telescope']) {
      expect(NO_GLASS.has(id), id).toBe(true);
    }
  });
});
