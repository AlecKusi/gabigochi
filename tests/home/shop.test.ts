import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import type { GameState, PlacedItem } from '../../src/core/types';
import { CATALOG, SHOP_CATEGORIES } from '../../src/home/catalog';
import { LOOKS } from '../../src/home/looks';
import { DEFAULT_SHOP_CATEGORY, countsLabel, itemCounts, shopItems, shopLooks, thumbScale } from '../../src/home/shop';

const T0 = new Date(2026, 9, 6, 12).getTime();
const placed = (itemId: string, uid: string): PlacedItem => ({ uid, itemId, x: 64, y: 144, flip: false });

function stateWith(items: Record<string, PlacedItem[]>, inventory: Record<string, number> = {}): GameState {
  const s = createState(T0);
  const rooms = { ...s.rooms };
  for (const id of Object.keys(rooms) as (keyof typeof rooms)[]) rooms[id] = { ...rooms[id], items: items[id] ?? [] };
  return { ...s, rooms, inventory };
}

describe('itemCounts', () => {
  it('liczy sztuki w magazynie i postawione we wszystkich pokojach', () => {
    const s = stateWith(
      { salon: [placed('monstera', 'a'), placed('pc_desk', 'b')], studio: [placed('monstera', 'c')] },
      { monstera: 2 },
    );
    expect(itemCounts(s, 'monstera')).toEqual({ stored: 2, placed: 2 });
    expect(itemCounts(s, 'pc_desk')).toEqual({ stored: 0, placed: 1 });
    expect(itemCounts(s, 'palm')).toEqual({ stored: 0, placed: 0 });
  });
});

describe('countsLabel', () => {
  it('pokazuje tylko niezerowe liczniki', () => {
    expect(countsLabel({ stored: 0, placed: 0 })).toBe('Jeszcze nie masz');
    expect(countsLabel({ stored: 2, placed: 0 })).toBe('W magazynie: 2');
    expect(countsLabel({ stored: 0, placed: 3 })).toBe('Postawione: 3');
    expect(countsLabel({ stored: 1, placed: 1 })).toBe('W magazynie: 1 · Postawione: 1');
  });
});

describe('shopItems / shopLooks', () => {
  it('domyślna kategoria to pierwsza z listy', () => {
    expect(DEFAULT_SHOP_CATEGORY).toBe(SHOP_CATEGORIES[0].id);
  });

  it('każda kategoria przedmiotów ma wpisy, a wszystkie przedmioty trafiają do jakiejś kategorii', () => {
    const itemCats = SHOP_CATEGORIES.filter((c) => c.id !== 'wallpaper' && c.id !== 'floor');
    for (const c of itemCats) expect(shopItems(c.id).length).toBeGreaterThan(0);
    const total = itemCats.reduce((n, c) => n + shopItems(c.id).length, 0);
    expect(total).toBe(CATALOG.filter((d) => !d.special).length);
  });

  it('kategorie przedmiotów nie zwracają wyglądów, a tapety i podłogi — tylko swój rodzaj', () => {
    expect(shopLooks('furniture')).toBeNull();
    expect(shopItems('wallpaper')).toEqual([]);
    const walls = shopLooks('wallpaper')!;
    const floors = shopLooks('floor')!;
    expect(walls.every((l) => l.kind === 'wallpaper')).toBe(true);
    expect(floors.every((l) => l.kind === 'floor')).toBe(true);
    expect(walls.length + floors.length).toBe(LOOKS.length);
  });
});

describe('thumbScale', () => {
  it('dobiera największą całkowitą skalę mieszczącą się w polu', () => {
    expect(thumbScale(12, 20, 60)).toBe(3);
    expect(thumbScale(30, 30, 60)).toBe(2);
    expect(thumbScale(60, 10, 60)).toBe(1);
  });

  it('nie schodzi poniżej 1 dla dużych sprite\'ów', () => {
    expect(thumbScale(83, 66, 60)).toBe(1);
  });
});
