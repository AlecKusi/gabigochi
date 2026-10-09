import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, NewerSaveError, SAVE_KEY, loadState, saveState, type KV } from '../../src/core/save';
import { createState } from '../../src/core/state';
import type { GameState } from '../../src/core/types';
import { CLOTHES, clothesBySlot } from '../../src/wardrobe/catalog';
import { DEFAULT_OUTFIT } from '../../src/wardrobe/outfit';

const T0 = new Date(2026, 9, 7, 12).getTime();

/** Zapis z wersji 1 (przed mieszkaniem i szafą). */
const V1 = {
  version: 1,
  createdAt: T0 - 5000,
  lastUpdate: T0 - 1000,
  needs: { hunger: 40, mood: 55, energy: 70 },
  coins: 321,
  fridge: { apple: 2 },
  sleeping: false,
  lastDailyBonus: '2026-10-05',
  lastFreeKitkat: null,
  lastPetAt: T0 - 2000,
  seenBirthday: true,
  records: { catch: 12 },
};

function memoryKV(init: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const load = (obj: unknown, now = T0) => {
  const kv = memoryKV({ [SAVE_KEY]: JSON.stringify(obj) });
  return { kv, r: loadState(kv, now) };
};
const cid = (slot: 'head' | 'top' | 'bottom' | 'dress', i = 0) => clothesBySlot(slot)[i].id;
const allIds = () => CLOTHES.map((c) => c.id);

describe('szafa w zapisie', () => {
  it('zapis i odczyt zachowują strój i kupione ubrania', () => {
    const kv = memoryKV();
    const s: GameState = {
      ...createState(T0),
      ownedClothes: allIds(),
      outfit: { head: cid('head'), top: cid('top'), bottom: cid('bottom'), dress: null },
    };
    expect(saveState(kv, s)).toBe(true);
    const r = loadState(kv, T0 + 5);
    expect(r.repaired).toBe(false);
    expect(r.state).toEqual(s);
  });

  it('zapis v2 bez pól szafy → domyślne po cichu (bez naprawy i kopii)', () => {
    const { outfit: _o, ownedClothes: _c, ...raw } = createState(T0);
    const { r, kv } = load(raw);
    expect(r).toMatchObject({ fresh: false, recovered: false, repaired: false });
    expect(kv.data.has(BACKUP_KEY)).toBe(false);
    expect(r.state.outfit).toEqual(DEFAULT_OUTFIT);
    expect(r.state.ownedClothes).toEqual([]);
  });

  it('brak tylko jednego z pól → drugie zostaje', () => {
    const { outfit: _o, ...raw } = { ...createState(T0), ownedClothes: [cid('top')] };
    const { r } = load(raw);
    expect(r.repaired).toBe(false);
    expect(r.state.ownedClothes).toEqual([cid('top')]);
    expect(r.state.outfit).toEqual(DEFAULT_OUTFIT);
  });

  it('v1 → v2 dostaje domyślną szafę', () => {
    const { r } = load(V1);
    expect(r.repaired).toBe(false);
    expect(r.state.outfit).toEqual(DEFAULT_OUTFIT);
    expect(r.state.ownedClothes).toEqual([]);
  });

  it('nieznane, powtórzone i nie-tekstowe identyfikatory w ownedClothes wypadają po cichu', () => {
    const raw = { ...createState(T0), ownedClothes: [cid('top'), 'nie_ma', 7, cid('top'), null, cid('head')] };
    const { r, kv } = load(raw);
    expect(r.repaired).toBe(false);
    expect(kv.data.has(BACKUP_KEY)).toBe(false);
    expect(r.state.ownedClothes).toEqual([cid('top'), cid('head')]);
  });

  it('ownedClothes nie będące tablicą → pusta lista po cichu', () => {
    for (const bad of ['sukienka', 5, { a: 1 }, null]) {
      const { r } = load({ ...createState(T0), ownedClothes: bad });
      expect(r.repaired).toBe(false);
      expect(r.state.ownedClothes).toEqual([]);
    }
  });

  it('outfit nie będący obiektem → domyślny po cichu', () => {
    for (const bad of ['x', 5, [], null]) {
      const { r } = load({ ...createState(T0), ownedClothes: allIds(), outfit: bad });
      expect(r.repaired).toBe(false);
      expect(r.state.outfit).toEqual(DEFAULT_OUTFIT);
      expect(r.state.ownedClothes).toEqual(allIds());
    }
  });

  it('nieznane id w stroju → null w tym slocie, reszta zostaje', () => {
    const raw = {
      ...createState(T0),
      ownedClothes: allIds(),
      outfit: { head: 'nie_ma', top: cid('top'), bottom: 12, dress: null },
    };
    const { r } = load(raw);
    expect(r.repaired).toBe(false);
    expect(r.state.outfit).toEqual({ head: null, top: cid('top'), bottom: null, dress: null });
  });

  it('id z niewłaściwego slotu w stroju → null', () => {
    const raw = {
      ...createState(T0),
      ownedClothes: allIds(),
      outfit: { head: cid('top'), top: cid('head'), bottom: cid('dress'), dress: cid('bottom') },
    };
    expect(load(raw).r.state.outfit).toEqual(DEFAULT_OUTFIT);
  });

  it('strój z nieposiadanym ubraniem → ten slot null', () => {
    const raw = {
      ...createState(T0),
      ownedClothes: [cid('top')],
      outfit: { head: cid('head'), top: cid('top'), bottom: null, dress: null },
    };
    expect(load(raw).r.state.outfit).toEqual({ head: null, top: cid('top'), bottom: null, dress: null });
  });

  it('sukienka razem z koszulką/dołem → wygrywa sukienka', () => {
    const raw = {
      ...createState(T0),
      ownedClothes: allIds(),
      outfit: { head: null, top: cid('top'), bottom: cid('bottom'), dress: cid('dress') },
    };
    const { r } = load(raw);
    expect(r.repaired).toBe(false);
    expect(r.state.outfit).toEqual({ head: null, top: null, bottom: null, dress: cid('dress') });
  });

  it('brakujące sloty w stroju → null', () => {
    const raw = { ...createState(T0), ownedClothes: allIds(), outfit: { top: cid('top') } };
    expect(load(raw).r.state.outfit).toEqual({ head: null, top: cid('top'), bottom: null, dress: null });
  });

  it('naprawa mieszkania nie rusza szafy', () => {
    const raw = { ...createState(T0), rooms: 'zepsute', ownedClothes: allIds(), outfit: { ...DEFAULT_OUTFIT, top: cid('top') } };
    const { r } = load(raw);
    expect(r.repaired).toBe(true);
    expect(r.state.outfit.top).toBe(cid('top'));
    expect(r.state.ownedClothes).toEqual(allIds());
  });

  it('wynik odczytu nie dzieli tablic z surowym obiektem', () => {
    const { r } = load({ ...createState(T0), ownedClothes: allIds() });
    expect(r.state.ownedClothes).not.toBe(allIds());
    expect(Object.keys(r.state.outfit).sort()).toEqual(['bottom', 'dress', 'head', 'top']);
  });

  it('zapis z nowszą wersją nadal rzuca NewerSaveError (także z polami szafy)', () => {
    const kv = memoryKV({ [SAVE_KEY]: JSON.stringify({ ...createState(T0), version: 3, outfit: 'z przyszłości' }) });
    expect(() => loadState(kv, T0)).toThrow(NewerSaveError);
    expect(kv.data.has(BACKUP_KEY)).toBe(false);
  });

  it('po wczytaniu zapis → odczyt jest idempotentny', () => {
    const raw = { ...createState(T0), ownedClothes: [cid('top'), 'nie_ma'], outfit: { ...DEFAULT_OUTFIT, top: cid('top') } };
    const { r, kv } = load(raw);
    expect(saveState(kv, r.state)).toBe(true);
    const again = loadState(kv, T0 + 1);
    expect(again.state).toEqual(r.state);
    expect(again.repaired).toBe(false);
  });

  it('wieszak na ubrania: nowy dom ma go w sypialni, stary zapis bez niego — po cichu w magazynie', () => {
    const fresh = createState(T0);
    expect(fresh.rooms.bedroom.items.some((i) => i.itemId === 'clothes_rack')).toBe(true);
    const old: GameState = {
      ...fresh,
      rooms: { ...fresh.rooms, bedroom: { ...fresh.rooms.bedroom, items: fresh.rooms.bedroom.items.filter((i) => i.itemId !== 'clothes_rack') } },
    };
    const { r } = load(old);
    expect(r.state.inventory.clothes_rack).toBe(1);
    expect(r.repaired).toBe(false);
    // już w magazynie albo w innym pokoju — bez dokładania
    const stored = load({ ...old, inventory: { clothes_rack: 2 } }).r.state;
    expect(stored.inventory.clothes_rack).toBe(2);
    const moved = load(fresh).r.state;
    expect(moved.inventory.clothes_rack).toBeUndefined();
  });

  it('kotek w zapisie: brak pola → domyślny, imię przycięte, liczby w zakresie', () => {
    const fresh = createState(T0);
    expect(fresh.cat).toEqual({ name: 'Kotek', hunger: 80, love: 60 });
    const { cat: _omit, ...noCat } = fresh;
    expect(load(noCat).r.state.cat).toEqual({ name: 'Kotek', hunger: 80, love: 60 });
    const odd = load({ ...fresh, cat: { name: '  Hachi Hachi Hachi Hachi  ', hunger: 250, love: 'x' } }).r.state.cat;
    expect(odd.name).toBe('Hachi Hachi Ha');
    expect(odd.hunger).toBe(100);
    expect(odd.love).toBe(60);
    expect(load({ ...fresh, cat: { name: 'Floppa', hunger: 12, love: 99 } }).r.state.cat).toEqual({ name: 'Floppa', hunger: 12, love: 99 });
  });

  it('kuchnia i balkon: stare zapisy dostają je po cichu z meblami startowymi', () => {
    const fresh = createState(T0);
    const { kitchen: _k, balcony: _b, ...oldRooms } = fresh.rooms;
    const { r } = load({ ...fresh, rooms: oldRooms });
    expect(r.repaired).toBe(false);
    expect(r.state.rooms.kitchen.items.map((i) => i.itemId)).toContain('fridge_retro');
    expect(r.state.rooms.balcony.items.map((i) => i.itemId)).toContain('flower_box');
    expect(r.state.ownedLooks).toContain('floor_deck');
  });
});
