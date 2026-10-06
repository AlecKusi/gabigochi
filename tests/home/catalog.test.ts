import { describe, expect, it } from 'vitest';
import {
  CATALOG, GABI_BED, ITEM_CATEGORIES, INTERACTIONS, SHOP_CATEGORIES, findItem, itemById, itemFrameMeta, itemFrames,
  itemSize,
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

  it('kategorie sklepu: Meble, Ozdoby, Rośliny, Gaming, Hobby, Łazienka, Tapety, Podłogi', () => {
    expect(SHOP_CATEGORIES.map((c) => c.name)).toEqual(
      ['Meble', 'Ozdoby', 'Rośliny', 'Gaming', 'Hobby', 'Łazienka', 'Tapety', 'Podłogi'],
    );
    expect(SHOP_CATEGORIES.find((c) => c.name === 'Łazienka')!.id).toBe('bathroom');
    for (const cat of ITEM_CATEGORIES) expect(CATALOG.some((d) => d.category === cat), cat).toBe(true);
  });

  it('łazienka: wyposażenie z ceną, warstwą i interakcją', () => {
    const want: Record<string, [string, string, number]> = {
      toilet: ['floor', 'toilet', 120],
      sink: ['floor', 'sink', 140],
      shower: ['floor', 'shower', 300],
      bathtub: ['floor', 'bath', 350],
      towel_rail: ['wall', 'none', 50],
      towel_hanging: ['wall', 'none', 30],
      hairdryer_shelf: ['wall', 'hairdryer', 70],
    };
    expect(CATALOG.filter((d) => d.category === 'bathroom').map((d) => d.id).sort()).toEqual(Object.keys(want).sort());
    for (const [id, [layer, interaction, price]] of Object.entries(want)) {
      expect(itemById(id), id).toMatchObject({ category: 'bathroom', layer, interaction, price });
    }
    for (const i of ['toilet', 'shower', 'bath', 'sink', 'hairdryer'] as const) expect(INTERACTIONS).toContain(i);
    // jedna skala arkusza łazienki: Gabi przy toalecie ma wysokość jak w pokoju (56 px)
    const scales = new Set(CATALOG.filter((d) => d.category === 'bathroom').map((d) => d.scale));
    expect(scales.size).toBe(1);
    expect([...scales][0]).toBeCloseTo(56 / 36, 3);
  });

  it('itemFrames: klatki stanów z items.generated.json, poza sklepem', () => {
    expect(itemFrames('toilet')).toEqual({ open: 'toilet_open', flush: 'toilet_flush', gabi: 'toilet_gabi' });
    expect(itemFrames('shower')).toEqual({ drip: 'shower_drip', on: 'shower_on', gabi: 'shower_gabi' });
    expect(itemFrames('bathtub')).toEqual({ fill: 'bathtub_fill', bubbles: 'bathtub_bubbles', gabi: 'bathtub_gabi' });
    expect(itemFrames('sink')).toEqual({ on: 'sink_on', gabi: 'sink_gabi' });
    expect(itemFrames('towel_rail')).toEqual({ gabi: 'towel_rail_gabi' });
    expect(itemFrames('pc_desk')).toEqual({});
    expect(itemFrames('nope')).toEqual({});
    const m = meta as Record<string, { w: number; h: number; scale?: number; anchorX?: number; foot?: number }>;
    for (const base of ['toilet', 'shower', 'bathtub', 'sink', 'towel_rail']) {
      for (const sprite of Object.values(itemFrames(base))) {
        expect(findItem(sprite), sprite).toBeUndefined();
        const fm = itemFrameMeta(sprite)!;
        expect(fm, sprite).toMatchObject({ w: m[sprite].w, h: m[sprite].h, anchorX: m[sprite].anchorX, foot: m[sprite].foot });
        expect(fm.scale, sprite).toBe(itemById(base).scale);
      }
    }
    // klatka bez zmian rysunku (otwarta klapa) leży dokładnie na toalecie: kotwica = środek dolnej krawędzi
    const toilet = itemById('toilet');
    expect(itemFrameMeta('toilet_open')).toMatchObject({ anchorX: toilet.w / 2, foot: toilet.h, overlay: true });
    expect(itemFrameMeta('towel_rail_gabi')!.overlay).toBe(false);
    expect(itemFrameMeta('toilet')).toBeUndefined();
    // zwrócony obiekt to kopia
    itemFrames('toilet').open = 'x';
    expect(itemFrames('toilet').open).toBe('toilet_open');
  });
});
