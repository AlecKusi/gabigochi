import { describe, expect, it } from 'vitest';
import {
  CATALOG, GABI_BED, ITEM_CATEGORIES, INTERACTIONS, SHOP_CATEGORIES, findItem, itemById, itemSize,
} from '../../src/home/catalog';
import meta from '../../src/home/items.generated.json';

describe('katalog przedmiotów', () => {
  it('ma ~60+ przedmiotów z unikalnymi id', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(60);
    expect(new Set(CATALOG.map((d) => d.id)).size).toBe(CATALOG.length);
  });

  it('każdy przedmiot ma poprawne dane katalogu i wymiary sprite’a', () => {
    for (const d of CATALOG) {
      expect(d.name.length, d.id).toBeGreaterThan(0);
      expect(ITEM_CATEGORIES, d.id).toContain(d.category);
      expect(['wall', 'floor', 'rug'], d.id).toContain(d.layer);
      expect(INTERACTIONS, d.id).toContain(d.interaction);
      expect(d.price, d.id).toBeGreaterThanOrEqual(30);
      expect(d.price, d.id).toBeLessThanOrEqual(400);
      expect(d.sprite).toBe(d.id);
      expect(d.w).toBeGreaterThan(0);
      expect(d.h).toBeGreaterThan(0);
      expect(d.scale).toBeGreaterThan(0);
    }
  });

  it('dane pochodzą z items.generated.json', () => {
    const m = meta as Record<string, { w: number; h: number; scale?: number; name?: string; price?: number }>;
    const d = itemById('writing_desk');
    expect(d).toMatchObject({ w: m.writing_desk.w, h: m.writing_desk.h, scale: 1.25, name: m.writing_desk.name });
    expect(itemById('pc_desk').scale).toBe(1);
  });

  it('rośliny mają interakcję podlewania, dywany są w warstwie rug', () => {
    for (const d of CATALOG.filter((x) => x.category === 'plant')) expect(d.interaction, d.id).toBe('water');
    expect(itemById('rug_round').layer).toBe('rug');
  });

  it('łóżko Gabi: specjalny przedmiot spoza sklepu, sprite pustego łóżka', () => {
    expect(CATALOG.some((d) => d.id === GABI_BED || d.id === 'gabi_bed_empty')).toBe(false);
    const bed = itemById(GABI_BED);
    expect(bed).toMatchObject({ id: 'gabi_bed', sprite: 'gabi_bed_empty', layer: 'floor', special: true, price: 0 });
    expect(bed.anchorX).toBeTypeOf('number');
    expect(bed.foot).toBeTypeOf('number');
    expect(findItem('gabi_bed_empty')).toBeUndefined();
  });

  it('findItem zwraca undefined dla nieznanych, itemById rzuca', () => {
    expect(findItem('nope')).toBeUndefined();
    expect(() => itemById('nope')).toThrow();
  });

  it('itemSize uwzględnia skalę', () => {
    expect(itemSize(itemById('rug_round'))).toEqual({ w: 57 * 0.6, h: 32 * 0.6 });
    expect(itemSize(itemById('pc_desk'))).toEqual({ w: 49, h: 50 });
  });

  it('kategorie sklepu: Meble, Ozdoby, Rośliny, Gaming, Hobby, Tapety, Podłogi', () => {
    expect(SHOP_CATEGORIES.map((c) => c.name)).toEqual(['Meble', 'Ozdoby', 'Rośliny', 'Gaming', 'Hobby', 'Tapety', 'Podłogi']);
    for (const cat of ITEM_CATEGORIES) expect(CATALOG.some((d) => d.category === cat), cat).toBe(true);
  });
});
