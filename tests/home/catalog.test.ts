import { describe, expect, it } from 'vitest';
import {
  CATALOG, GABI_BED, ITEM_CATEGORIES, INTERACTIONS, SHOP_CATEGORIES, findItem, itemById, itemFrameMeta, itemFrames,
  itemSize,
} from '../../src/home/catalog';
import meta from '../../src/home/items.generated.json';
import { SEASONS } from '../../src/home/season';

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

  it('kategorie sklepu: Meble, Okna, Ozdoby, Rośliny, Gaming, Hobby, Łazienka, Tapety, Podłogi', () => {
    expect(SHOP_CATEGORIES.map((c) => c.name)).toEqual(
      ['Meble', 'Okna', 'Ozdoby', 'Rośliny', 'Gaming', 'Hobby', 'Łazienka', 'Kuchnia', 'Balkon', 'Tapety', 'Podłogi'],
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
      // z arkuszy łazienkowych (2026-10-09): wanny, prysznice, toaleta, umywalki, lustra, pralka, waga…
      clawfoot_tub: ['floor', 'bath', 380],
      glass_shower: ['floor', 'shower', 320],
      builtin_tub: ['floor', 'bath', 360],
      bath_tall_cabinet: ['floor', 'none', 180],
      bath_wall_cabinet: ['wall', 'none', 110],
      sink_cabinet: ['floor', 'sink', 200],
      wall_sink: ['wall', 'sink', 120],
      toilet_white: ['floor', 'toilet', 140],
      bidet: ['floor', 'none', 110],
      bamboo_shelf: ['floor', 'none', 120],
      washing_machine: ['floor', 'laundry', 260],
      laundry_basket: ['floor', 'none', 50],
      towel_warmer: ['wall', 'none', 130],
      round_mirror: ['wall', 'mirror', 90],
      shower_cabin: ['floor', 'shower', 340],
      corner_tub: ['floor', 'bath', 400],
      mirror_cabinet: ['wall', 'mirror', 150],
      shower_caddy: ['wall', 'none', 40],
      towel_rack: ['wall', 'none', 60],
      water_heater: ['wall', 'none', 90],
      clothes_dryer: ['floor', 'none', 80],
      bath_scale: ['floor', 'scale', 60],
      trash_can: ['floor', 'none', 30],
      bath_rug: ['rug', 'none', 60],
      toilet_set: ['floor', 'none', 35],
      bath_accessories: ['floor', 'none', 30],
    };
    expect(CATALOG.filter((d) => d.category === 'bathroom').map((d) => d.id).sort()).toEqual(Object.keys(want).sort());
    for (const [id, [layer, interaction, price]] of Object.entries(want)) {
      expect(itemById(id), id).toMatchObject({ category: 'bathroom', layer, interaction, price });
    }
    for (const i of ['toilet', 'shower', 'bath', 'sink', 'hairdryer'] as const) expect(INTERACTIONS).toContain(i);
    // jedna skala pierwszego arkusza łazienki: Gabi przy toalecie ma wysokość jak w pokoju (56 px)
    const first = ['toilet', 'sink', 'shower', 'bathtub', 'towel_rail', 'towel_hanging', 'hairdryer_shelf'];
    const scales = new Set(CATALOG.filter((d) => first.includes(d.id)).map((d) => d.scale));
    expect(scales.size).toBe(1);
    expect([...scales][0]).toBeCloseTo(56 / 36, 3);
  });

  it('kuchnia z dwóch arkuszy (2026-10-10): AGD, szafki, stoły i drobiazgi na blat (warstwa ścienna)', () => {
    const want: Record<string, [string, string]> = {
      gas_stove: ['floor', 'cook'], induction_hob: ['floor', 'cook'], fridge_silver: ['floor', 'fridge'],
      microwave: ['wall', 'cook'], dishwasher: ['floor', 'dishes'], corner_cabinet: ['floor', 'none'],
      kitchen_sink: ['floor', 'dishes'], kitchen_drawers: ['floor', 'none'], glass_wall_cabinet: ['wall', 'none'],
      tall_pantry: ['floor', 'none'], kitchen_table: ['floor', 'coffee'], kitchen_stool: ['floor', 'none'],
      range_hood: ['wall', 'none'], spice_rack: ['wall', 'none'], kitchen_cart: ['floor', 'none'],
      coffee_maker: ['wall', 'brew'], toaster: ['wall', 'cook'], electric_kettle: ['wall', 'brew'],
      blender: ['wall', 'cook'], stand_mixer: ['wall', 'cook'], kitchen_sideboard: ['floor', 'none'],
      kitchen_island: ['floor', 'none'], wine_rack: ['floor', 'none'], kitchen_shelves: ['wall', 'none'],
      breadbox: ['wall', 'none'], kitchen_trash: ['floor', 'none'], knife_block: ['wall', 'none'],
      dish_drainer: ['wall', 'none'], paper_towel: ['wall', 'none'], potted_herbs: ['wall', 'water'],
    };
    for (const [id, [layer, interaction]] of Object.entries(want)) {
      expect(itemById(id), id).toMatchObject({ category: 'kitchen', layer, interaction });
    }
    // drobne AGD mniejsze od głowy Gabi razy dwa, lodówka prawie jak Gabi, blaty ok. połowy jej wzrostu
    for (const id of ['toaster', 'electric_kettle', 'coffee_maker', 'knife_block']) expect(itemSize(itemById(id)).h, id).toBeLessThan(20);
    expect(itemSize(itemById('fridge_silver')).h).toBeGreaterThan(50);
    for (const id of ['gas_stove', 'kitchen_drawers', 'dishwasher']) {
      const h = itemSize(itemById(id)).h;
      expect(h, id).toBeGreaterThan(28);
      expect(h, id).toBeLessThan(38);
    }
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

  it('nazwy przedmiotów sklepu są unikalne', () => {
    const names = CATALOG.map((d) => d.name);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });
});

describe('ozdoby sezonowe', () => {
  const seasonal = CATALOG.filter((d) => d.season !== undefined);

  it('39 rzeczy sezonowych: 28 jesiennych, 4 zimowe, 3 wiosenne, 4 letnie; pora roku znana', () => {
    expect(seasonal).toHaveLength(39);
    for (const d of seasonal) expect(SEASONS, d.id).toContain(d.season);
    const count = (s: string) => seasonal.filter((d) => d.season === s).length;
    expect([count('autumn'), count('winter'), count('spring'), count('summer')]).toEqual([28, 4, 3, 4]);
  });

  it('świecące są lampkami, wiatrak przełącznikiem z 3 klatkami śmigła, dynia i choinka mają klatkę zapaloną', () => {
    for (const id of ['pumpkin', 'xmas_tree', 'xmas_tree_blue', 'jar_candle', 'autumn_lantern', 'fireplace', 'fire_pit']) {
      expect(itemById(id).interaction, id).toBe('lamp');
    }
    expect(itemById('fan').interaction).toBe('switch');
    expect(Object.keys(itemFrames('fan')).sort()).toEqual(['spin_2', 'spin_3']);
    expect(itemFrames('pumpkin').lit).toBeDefined();
    expect(itemFrames('xmas_tree').lit).toBeDefined();
  });

  it('rośliny sezonowe się podlewa', () => {
    for (const id of ['poinsettia', 'heather', 'mum_pot']) expect(itemById(id).interaction, id).toBe('water');
  });
});
