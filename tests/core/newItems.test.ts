import { describe, expect, it } from 'vitest';
import { RELEASES } from '../../src/core/changelog';
import { NEW_ITEMS_KEY, addNew, clearNew, readNew, releaseItems } from '../../src/core/newItems';
import { FOODS } from '../../src/core/config';
import { CATALOG } from '../../src/home/catalog';
import { LOOKS } from '../../src/home/looks';
import { CLOTHES } from '../../src/wardrobe/catalog';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('znaczek „NOWE” po aktualizacji', () => {
  it('nowości dochodzą, obejrzane znikają, reszta zostaje', () => {
    const kv = memory();
    expect(readNew(kv).size).toBe(0);
    addNew(kv, ['toaster', 'blender']);
    addNew(kv, ['blender', 'cola']);
    expect([...readNew(kv)].sort()).toEqual(['blender', 'cola', 'toaster']);
    clearNew(kv, ['toaster', 'nieznane']);
    expect([...readNew(kv)].sort()).toEqual(['blender', 'cola']);
  });

  it('uszkodzony wpis w pamięci — pusta lista', () => {
    const kv = memory();
    kv.setItem(NEW_ITEMS_KEY, '{zepsute');
    expect(readNew(kv).size).toBe(0);
    kv.setItem(NEW_ITEMS_KEY, '[1, "ok"]');
    expect([...readNew(kv)]).toEqual(['ok']);
  });

  it('rzeczy z wpisów wersji; każdy wpisany identyfikator istnieje w grze', () => {
    expect(releaseItems([{ version: 2, date: '2026-11-01', changes: ['x'], items: ['a', 'b'] }, { version: 1, date: '2026-10-10', changes: ['y'] }])).toEqual(['a', 'b']);
    const known = new Set([...CATALOG.map((d) => d.id), ...LOOKS.map((l) => l.id), ...CLOTHES.map((c) => c.id), ...FOODS.map((f) => f.id)]);
    for (const id of releaseItems(RELEASES)) expect(known.has(id), id).toBe(true);
  });
});
