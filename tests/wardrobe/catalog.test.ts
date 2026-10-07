import { describe, expect, it } from 'vitest';
import { ICONS } from '../../src/art/icons';
import {
  CLOTHES,
  CLOTH_SLOTS,
  CLOTH_SLOT_NAMES,
  clothesBySlot,
  findCloth,
} from '../../src/wardrobe/catalog';

const HEX = /^#[0-9a-f]{6}$/i;
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
};

describe('katalog ubrań', () => {
  it('identyfikatory są unikalne, a nazwy niepuste', () => {
    const ids = CLOTHES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CLOTHES) expect(c.name.trim()).not.toBe('');
    expect(new Set(CLOTHES.map((c) => c.name)).size).toBe(CLOTHES.length);
  });

  it('liczba pozycji w slotach zgodna z ustaleniami', () => {
    expect(clothesBySlot('dress')).toHaveLength(6);
    expect(clothesBySlot('top')).toHaveLength(5);
    expect(clothesBySlot('bottom')).toHaveLength(5);
    expect(clothesBySlot('head')).toHaveLength(6);
    expect(CLOTHES).toHaveLength(22);
  });

  it('sloty mają polskie nazwy zakładek w kolejności Sukienki / Góra / Dół / Głowa', () => {
    expect(CLOTH_SLOTS).toEqual(['dress', 'top', 'bottom', 'head']);
    expect(CLOTH_SLOTS.map((s) => CLOTH_SLOT_NAMES[s])).toEqual(['Sukienki', 'Góra', 'Dół', 'Głowa']);
  });

  it('ceny mieszczą się w zakresach z ustaleń', () => {
    const range = { dress: [150, 300], top: [60, 120], bottom: [60, 120], head: [80, 200] } as const;
    for (const c of CLOTHES) {
      const [lo, hi] = range[c.slot];
      expect(c.price, c.id).toBeGreaterThanOrEqual(lo);
      expect(c.price, c.id).toBeLessThanOrEqual(hi);
      expect(Number.isInteger(c.price), c.id).toBe(true);
    }
  });

  it('kolory: trzy tony hex, od jasnego do ciemnego', () => {
    for (const c of CLOTHES) {
      expect(c.colors, c.id).toHaveLength(3);
      for (const h of c.colors) expect(h, c.id).toMatch(HEX);
      const [l, m, d] = c.colors.map(lum);
      expect(l, `${c.id}: jasny > średni`).toBeGreaterThan(m);
      expect(m, `${c.id}: średni > ciemny`).toBeGreaterThan(d);
      if (c.patternColor) expect(c.patternColor, c.id).toMatch(HEX);
    }
  });

  it('wzór ma kolor wzoru, a cięcie mają tylko doły', () => {
    for (const c of CLOTHES) {
      if (c.pattern) expect(c.patternColor, c.id).toBeDefined();
      else expect(c.patternColor, c.id).toBeUndefined();
      if (c.slot === 'bottom') expect(['pants', 'skirt', 'leggings'], c.id).toContain(c.cut);
      else expect(c.cut, c.id).toBeUndefined();
    }
  });

  it('doły: spodnie, spódnice i legginsy', () => {
    const cuts = clothesBySlot('bottom').map((c) => c.cut);
    expect(cuts.filter((c) => c === 'pants')).toHaveLength(2);
    expect(cuts.filter((c) => c === 'skirt')).toHaveLength(2);
    expect(cuts.filter((c) => c === 'leggings')).toHaveLength(1);
  });

  it('ozdoby głowy wskazują istniejące ikony, reszta bez ikony', () => {
    for (const c of CLOTHES) {
      if (c.slot === 'head') {
        expect(c.headArt, c.id).toBeDefined();
        expect(ICONS[c.headArt as keyof typeof ICONS], c.id).toBeDefined();
      } else expect(c.headArt, c.id).toBeUndefined();
    }
    expect(clothesBySlot('head').map((c) => c.headArt).sort()).toEqual(
      ['beret', 'bow', 'cat_ears', 'crown', 'flower', 'hat_party'],
    );
  });

  it('findCloth i clothesBySlot', () => {
    const c = CLOTHES[0];
    expect(findCloth(c.id)).toBe(c);
    expect(findCloth('nie_ma')).toBeUndefined();
    expect(findCloth('toString')).toBeUndefined();
    for (const slot of CLOTH_SLOTS) for (const x of clothesBySlot(slot)) expect(x.slot).toBe(slot);
  });
});
