import { describe, expect, it } from 'vitest';
import type { Outfit } from '../../src/core/types';
import type { FrameMeta } from '../../src/sprites/loader';
import { MIN_ISLAND, colourParts, dressPixels, hex, isSkinOrHair, lookOf, type Pixels } from '../../src/wardrobe/dresser';
import { checkDress, clothesColour } from '../../src/wardrobe/review';

/**
 * Znaki: S koszulka w masce, x koszulka POZA maską (ten sam kolor), K skóra błędnie w masce koszulki,
 * k skóra, c kot (kolor koszulki, w masce biały), J dżinsy, B ciemnobrązowy rekwizyt (pudełko), o kontur, . pusto.
 */
const COLORS: Record<string, string> = {
  S: '#1f1e28', x: '#1f1e28', K: '#facab1', k: '#facab1', c: '#1f1e28', J: '#252b42', B: '#5c3a26', o: '#030205',
};
const MASK: Record<string, [number, number, number]> = {
  S: [255, 0, 0], K: [255, 0, 0], c: [255, 255, 255], J: [0, 0, 255],
};

function sprite(rows: string[]): { src: Pixels; mask: Pixels; meta: FrameMeta } {
  const w = rows[0].length;
  const h = rows.length;
  const src = new Uint8ClampedArray(w * h * 4);
  const mask = new Uint8ClampedArray(w * h * 4);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const i = (y * w + x) * 4;
      src.set([...hex(COLORS[ch]), 255], i);
      mask.set([...(MASK[ch] ?? [0, 0, 0]), 255], i);
    }),
  );
  return { src: { w, h, data: src }, mask: { w, h, data: mask }, meta: { w, h, anchorX: w / 2, scale: 1, foot: h, mask: true } };
}

const none: Outfit = { head: null, top: null, bottom: null, dress: null };
const dress = (rows: string[], outfit: Outfit) => {
  const s = sprite(rows);
  const r = dressPixels(s.src, s.mask, s.meta, lookOf(outfit), { hat: false, seated: false });
  return { ...s, out: r!.px };
};
const same = (a: Pixels, b: Pixels, x: number, y: number) => {
  const i = (y * a.w + x) * 4;
  return a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2];
};

describe('naprawa masek przy przebieraniu', () => {
  it('wyspa koszulki odcięta dłonią dostaje kolor stroju; skóra między nimi zostaje', () => {
    const { src, out } = dress(
      [
        '.oooooooooo.',
        '.oSSSSkxxxo.',
        '.oSSSSkxxxo.',
        '.oSSSSkxxxo.',
        '.oJJJJoJJJo.',
        '.oJJJJoJJJo.',
        '.oooooooooo.',
      ],
      { ...none, top: 'top_pink' },
    );
    expect(same(src, out, 3, 2)).toBe(false);
    expect(same(src, out, 8, 2)).toBe(false); // wyspa
    expect(same(src, out, 6, 2)).toBe(true); // dłoń
  });

  it('drobne ciemne punkty obok koszulki (oczko pluszaka) zostają', () => {
    expect(MIN_ISLAND).toBeGreaterThan(2);
    const { src, out } = dress(
      [
        '.oooooooooo.',
        '.oSSSSkkxko.',
        '.oSSSSkkxko.',
        '.oSSSSkkkko.',
        '.oJJJJoJJJo.',
        '.oJJJJoJJJo.',
        '.oooooooooo.',
      ],
      { ...none, top: 'top_pink' },
    );
    expect(same(src, out, 8, 1)).toBe(true);
  });

  it('skóra błędnie w masce koszulki i kot (biały w masce) nie są przemalowane', () => {
    const { src, out } = dress(
      [
        '.oooooooooo.',
        '.oSSSKKcccc.',
        '.oSSSKKcccc.',
        '.oSSSSSccco.',
        '.oJJJJoJJJo.',
        '.oJJJJoJJJo.',
        '.oooooooooo.',
      ],
      { ...none, top: 'top_white' },
    );
    expect(same(src, out, 2, 1)).toBe(false);
    expect(same(src, out, 5, 1)).toBe(true); // skóra
    for (let x = 7; x <= 10; x++) expect(same(src, out, x, 1)).toBe(true); // kot
  });

  it('spódnica nie zamalowuje ciemnego rekwizytu w ciepłym kolorze (pudełko z prezentem)', () => {
    const { src, out } = dress(
      [
        '..oooooo..',
        '.oSSSSSSo.',
        '.oSSSSSSo.',
        '.oJJBBJJo.',
        '.oJJBBJJo.',
        '.oJJoJJJo.',
        '.oJJoJJJo.',
        '.oJJoJJJo.',
        '.oJJoJJJo.',
        '.oJJoJJJo.',
        '.oooooooo.',
      ],
      { ...none, dress: 'dress_summer_pink' },
    );
    expect(same(src, out, 4, 3)).toBe(true);
    expect(same(src, out, 2, 3)).toBe(false);
  });

  it('kolory: skóra i włosy rozpoznane, koszulka i dżinsy — nie', () => {
    expect(isSkinOrHair(...hex('#facab1'))).toBe(true);
    expect(isSkinOrHair(...hex('#d9c8e8'))).toBe(true); // jasnolawendowe włosy
    expect(isSkinOrHair(...hex('#1f1e28'))).toBe(false);
    expect(isSkinOrHair(...hex('#3b4550'))).toBe(false);
    expect(clothesColour(...hex('#1f1e28'))).toBe('shirt');
    expect(clothesColour(...hex('#3b4550'))).toBe('jeans');
    expect(clothesColour(...hex('#facab1'))).toBeNull();
  });

  it('wyspy: tylko w kolorach regionu, dość duże i w zasięgu', () => {
    const { src } = sprite(['SSkxxx', 'SSkxxx', 'SSkkkk', 'kkkkkk', 'kkkkxx']);
    const region = [0, 1, 6, 7, 12, 13];
    const parts = colourParts(src, new Set(region), region, () => true, 3);
    expect(parts.sort((a, b) => a - b)).toEqual([3, 4, 5, 9, 10, 11]);
    expect(colourParts(src, new Set(region), region, () => true, 0)).toEqual([]);
  });
});

describe('liczniki przeglądu strojów', () => {
  it('przeciek — przemalowany jasny piksel; brak — nieprzemalowana koszulka; kot i buty się nie liczą', () => {
    const { src, mask } = sprite(['SxkcS', 'JJJJJ']);
    const out: Pixels = { ...src, data: new Uint8ClampedArray(src.data) };
    const paint = (x: number, y: number) => out.data.set([255, 0, 128], (y * src.w + x) * 4);
    paint(0, 0); // koszulka — dobrze
    paint(2, 0); // skóra — przeciek
    paint(4, 0);
    const c = checkDress(src, mask, out, 1); // dżinsy w wierszu 1 to „buty” — nie liczą się
    expect(c.leak).toBe(1);
    expect(c.miss).toBe(1); // x
    expect(c.shirt).toBe(2);
  });
});
