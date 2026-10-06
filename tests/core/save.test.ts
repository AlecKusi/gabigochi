import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, NewerSaveError, SAVE_KEY, loadState, saveState, type KV } from '../../src/core/save';
import { createState } from '../../src/core/state';
import type { GameState } from '../../src/core/types';
import { GABI_BED } from '../../src/home/catalog';
import { DEFAULT_LOOKS, LATER_DEFAULT_LOOKS, LOOKS } from '../../src/home/looks';
import { createHome } from '../../src/home/starter';

const T0 = new Date(2026, 9, 6, 12).getTime();

/** Zapis z wersji 1 (przed mieszkaniem). */
const V1 = {
  version: 1,
  createdAt: T0 - 5000,
  lastUpdate: T0 - 1000,
  needs: { hunger: 40, mood: 55, energy: 70 },
  coins: 321,
  fridge: { apple: 2, cake: 1 },
  sleeping: true,
  lastDailyBonus: '2026-10-05',
  lastFreeKitkat: '2026-10-05',
  lastPetAt: T0 - 2000,
  seenBirthday: true,
  records: { catch: 12, memory: 7 },
};

function memoryKV(init: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('save', () => {
  it('brak zapisu → nowy stan', () => {
    const r = loadState(memoryKV(), T0);
    expect(r.fresh).toBe(true);
    expect(r.recovered).toBe(false);
    expect(r.state.coins).toBe(150);
  });

  it('zapis i odczyt dają ten sam stan', () => {
    const kv = memoryKV();
    const s = { ...createState(T0), coins: 777, records: { catch: 5 } };
    expect(saveState(kv, s)).toBe(true);
    const r = loadState(kv, T0 + 5);
    expect(r.fresh).toBe(false);
    expect(r.state).toEqual(s);
  });

  it('uszkodzony JSON → kopia zapasowa i nowy stan', () => {
    const kv = memoryKV({ [SAVE_KEY]: '{oops' });
    const r = loadState(kv, T0);
    expect(r.recovered).toBe(true);
    expect(r.fresh).toBe(true);
    expect(kv.data.get(BACKUP_KEY)).toBe('{oops');
  });

  it('nieznana (niższa) wersja lub zły kształt → kopia i nowy stan', () => {
    const kv = memoryKV({ [SAVE_KEY]: JSON.stringify({ version: 0 }) });
    expect(loadState(kv, T0).recovered).toBe(true);
    const kv2 = memoryKV({ [SAVE_KEY]: JSON.stringify({ ...createState(T0), coins: 'dużo' }) });
    expect(loadState(kv2, T0).recovered).toBe(true);
  });

  it('zapis z nowszej wersji → NewerSaveError, pamięć nietknięta (bez kopii i resetu)', () => {
    const raw = JSON.stringify({ ...createState(T0), version: 3, extra: 'z przyszłości' });
    const kv = memoryKV({ [SAVE_KEY]: raw });
    expect(() => loadState(kv, T0)).toThrow(NewerSaveError);
    expect(kv.data.get(SAVE_KEY)).toBe(raw);
    expect(kv.data.has(BACKUP_KEY)).toBe(false);
    expect(kv.data.size).toBe(1);
  });

  it('zapis stanu z NaN jest odrzucany i nie nadpisuje dobrego zapisu', () => {
    const kv = memoryKV();
    const good = { ...createState(T0), coins: 42 };
    expect(saveState(kv, good)).toBe(true);
    const before = kv.data.get(SAVE_KEY);
    expect(saveState(kv, { ...good, coins: NaN })).toBe(false);
    expect(kv.data.get(SAVE_KEY)).toBe(before);
  });

  it('wartości w fridge/records muszą być skończonymi liczbami', () => {
    const bad = { ...createState(T0), fridge: { apple: '2' } };
    const kv = memoryKV({ [SAVE_KEY]: JSON.stringify(bad) });
    expect(loadState(kv, T0).recovered).toBe(true);
    const bad2 = { ...createState(T0), records: { catch: null } };
    expect(loadState(memoryKV({ [SAVE_KEY]: JSON.stringify(bad2) }), T0).recovered).toBe(true);
  });

  it('błąd zapisu (np. pełna pamięć) nie wywraca aplikacji', () => {
    const kv: KV = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(saveState(kv, createState(T0))).toBe(false);
  });
});

describe('zapis v2 i migracja v1 → v2', () => {
  const load = (obj: unknown, now = T0) => {
    const kv = memoryKV({ [SAVE_KEY]: JSON.stringify(obj) });
    return { kv, r: loadState(kv, now) };
  };
  const defaults = () => Object.values(DEFAULT_LOOKS).flatMap((d) => [d.wallpaper, d.floor]).sort();

  it('v1 → v2: zachowuje wszystko i dodaje domyślne pokoje z meblami startowymi', () => {
    const { r, kv } = load(V1, T0 + 10);
    expect(r).toMatchObject({ fresh: false, recovered: false, repaired: false });
    const s = r.state;
    expect(s.version).toBe(2);
    const { version: _v, ...rest } = V1;
    expect(s).toMatchObject(rest);
    const home = createHome(T0 + 10);
    expect(s.rooms).toEqual(home.rooms);
    expect(s.inventory).toEqual({});
    expect([...s.ownedLooks].sort()).toEqual(defaults());
    expect(s.currentRoom).toBe('salon');
    expect(s.itemCooldowns).toEqual({});
    expect(s.nextUid).toBe(home.nextUid);
    expect(kv.data.has(BACKUP_KEY)).toBe(false);
    expect(saveState(kv, s)).toBe(true);
    expect(loadState(kv, T0 + 20).state).toEqual(s);
  });

  it('v1 z uszkodzonymi polami nadal → kopia i nowy stan', () => {
    const { r, kv } = load({ ...V1, coins: 'dużo' });
    expect(r.recovered).toBe(true);
    expect(kv.data.has(BACKUP_KEY)).toBe(true);
  });

  it('v2 z urządzonym mieszkaniem: zapis i odczyt bez zmian', () => {
    const kv = memoryKV();
    const paid = LOOKS.find((l) => l.price > 0)!;
    const s0 = createState(T0);
    const s: GameState = {
      ...s0,
      currentRoom: 'studio',
      inventory: { pouf: 2 },
      ownedLooks: [...s0.ownedLooks, paid.id],
      itemCooldowns: { u1: T0 },
      rooms: { ...s0.rooms, salon: { ...s0.rooms.salon, wallpaper: paid.kind === 'wallpaper' ? paid.id : s0.rooms.salon.wallpaper } },
    };
    s.rooms.salon.items = [...s.rooms.salon.items.map((i) => ({ ...i, flip: true })), { uid: 'u99', itemId: 'fairy_lights_warm', x: 64, y: 20, flip: false, lampOn: true }];
    s.nextUid = 100;
    expect(saveState(kv, s)).toBe(true);
    const r = loadState(kv, T0);
    expect(r).toMatchObject({ fresh: false, recovered: false, repaired: false });
    expect(r.state).toEqual(s);
  });

  it('v3 → NewerSaveError', () => {
    const kv = memoryKV({ [SAVE_KEY]: JSON.stringify({ ...createState(T0), version: 3 }) });
    expect(() => loadState(kv, T0)).toThrow(NewerSaveError);
  });

  it('v2 z uszkodzonym rdzeniem → kopia i nowy stan', () => {
    const { r } = load({ ...createState(T0), needs: null });
    expect(r).toMatchObject({ fresh: true, recovered: true });
  });

  it('uszkodzone pokoje → naprawa: reszta zostaje, pokoje domyślne, kopia zapasowa', () => {
    const raw = { ...createState(T0), coins: 999, records: { catch: 3 }, rooms: 'zepsute' };
    const { r, kv } = load(raw, T0 + 7);
    expect(r).toMatchObject({ fresh: false, recovered: false, repaired: true });
    expect(r.state.coins).toBe(999);
    expect(r.state.records).toEqual({ catch: 3 });
    expect(r.state.rooms).toEqual(createHome(T0 + 7).rooms);
    expect(kv.data.get(BACKUP_KEY)).toBe(JSON.stringify(raw));
    expect(saveState(kv, r.state)).toBe(true);
  });

  it('naprawa po kawałku: złe przedmioty wypadają, brakujący pokój wraca do domyślnego', () => {
    const s0 = createState(T0);
    const good = s0.rooms.salon.items[0];
    const raw = {
      ...s0,
      rooms: {
        salon: {
          wallpaper: 'nieznana',
          floor: s0.rooms.salon.floor,
          items: [good, { ...good, uid: 'u50', x: 'a' }, { ...good, uid: 'u51', itemId: 'nope' }, null],
        },
        studio: { ...s0.rooms.studio, floor: DEFAULT_LOOKS.salon.wallpaper },
      },
    };
    const { r } = load(raw);
    expect(r.repaired).toBe(true);
    expect(r.state.rooms.salon.items).toEqual([good]);
    expect(r.state.rooms.salon.wallpaper).toBe(DEFAULT_LOOKS.salon.wallpaper);
    expect(r.state.rooms.bedroom).toEqual(s0.rooms.bedroom);
    expect(r.state.rooms.studio.floor).toBe(DEFAULT_LOOKS.studio.floor);
    expect(r.state.rooms.studio.items).toEqual(s0.rooms.studio.items);
  });

  it('zapis v2 sprzed łazienki: łazienka i jej wyglądy dochodzą po cichu, z nowymi uid', () => {
    const s0 = createState(T0);
    const { bathroom: _b, ...rooms } = s0.rooms;
    const ownedLooks = s0.ownedLooks.filter((id) => !LATER_DEFAULT_LOOKS.includes(id));
    const raw = { ...s0, rooms, ownedLooks, nextUid: 40 };
    const { r, kv } = load(raw, T0 + 5);
    expect(r).toMatchObject({ fresh: false, recovered: false, repaired: false });
    expect(kv.data.has(BACKUP_KEY)).toBe(false);
    const bath = r.state.rooms.bathroom;
    expect(bath.wallpaper).toBe(DEFAULT_LOOKS.bathroom.wallpaper);
    expect(bath.floor).toBe(DEFAULT_LOOKS.bathroom.floor);
    expect(bath.items.map((i) => i.itemId)).toEqual(createHome(T0).rooms.bathroom.items.map((i) => i.itemId));
    expect(bath.items.map((i) => i.uid)).toEqual(bath.items.map((_, i) => `u${40 + i}`));
    expect(r.state.nextUid).toBe(40 + bath.items.length);
    for (const id of LATER_DEFAULT_LOOKS) expect(r.state.ownedLooks).toContain(id);
    expect(r.state.rooms.salon).toEqual(s0.rooms.salon);
    const all = Object.values(r.state.rooms).flatMap((room) => room.items.map((i) => i.uid));
    expect(new Set(all).size).toBe(all.length);
    expect(saveState(kv, r.state)).toBe(true);
    expect(loadState(kv, T0 + 6)).toMatchObject({ repaired: false, state: r.state });
  });

  it('uszkodzona łazienka (nie brakująca) nadal jest naprawą', () => {
    const s0 = createState(T0);
    const { r } = load({ ...s0, rooms: { ...s0.rooms, bathroom: 'zepsuta' } });
    expect(r.repaired).toBe(true);
    expect(r.state.rooms.bathroom.items).toHaveLength(createHome(T0).rooms.bathroom.items.length);
  });

  it('naprawa pól magazynu, wyglądów, pokoju, cooldownów i licznika uid', () => {
    const s0 = createState(T0);
    const raw = {
      ...s0,
      inventory: { pouf: 2, nope: 1, sofa: 'x', cactus_blue: 0, fern_small: 1.5, [GABI_BED]: 1 },
      ownedLooks: ['nope', LOOKS.find((l) => l.price > 0)!.id, 7],
      currentRoom: 'kuchnia',
      itemCooldowns: { u1: T0, u2: 'wczoraj' },
      nextUid: 'x',
    };
    const { r } = load(raw);
    expect(r.repaired).toBe(true);
    expect(r.state.inventory).toEqual({ pouf: 2 });
    expect([...r.state.ownedLooks].sort()).toEqual([...defaults(), LOOKS.find((l) => l.price > 0)!.id].sort());
    expect(r.state.currentRoom).toBe('salon');
    expect(r.state.itemCooldowns).toEqual({ u1: T0 });
    expect(r.state.nextUid).toBe(s0.nextUid);
  });

  it('brak pól domu w zapisie v2 → domyślne', () => {
    const { rooms: _r, inventory: _i, ownedLooks: _o, currentRoom: _c, itemCooldowns: _ic, nextUid: _n, ...core } = createState(T0);
    const { r } = load(core, T0 + 3);
    expect(r.repaired).toBe(true);
    expect(r.state.rooms).toEqual(createHome(T0 + 3).rooms);
    expect(r.state.nextUid).toBe(createHome(T0).nextUid);
  });

  it('powtórzone uid dostają nowe, licznik za największym', () => {
    const s0 = createState(T0);
    const raw = {
      ...s0,
      nextUid: 2,
      rooms: { ...s0.rooms, studio: { ...s0.rooms.studio, items: [...s0.rooms.studio.items, { ...s0.rooms.studio.items[0], uid: 'u1' }] } },
    };
    const { r } = load(raw);
    expect(r.repaired).toBe(true);
    const all = Object.values(r.state.rooms).flatMap((room) => room.items.map((i) => i.uid));
    expect(new Set(all).size).toBe(all.length);
    const max = Math.max(...all.map((u) => Number(u.slice(1))));
    expect(r.state.nextUid).toBe(max + 1);
  });

  it('łóżko Gabi zawsze jest dokładnie jedno (brak → wraca do sypialni)', () => {
    const s0 = createState(T0);
    const raw = { ...s0, rooms: { ...s0.rooms, bedroom: { ...s0.rooms.bedroom, items: [] } } };
    const { r } = load(raw);
    expect(r.repaired).toBe(true);
    const beds = Object.values(r.state.rooms).flatMap((room) => room.items).filter((i) => i.itemId === GABI_BED);
    expect(beds).toHaveLength(1);
    expect(r.state.rooms.bedroom.items.some((i) => i.itemId === GABI_BED)).toBe(true);
  });

  it('roślina bez wateredAt dostaje czas odczytu; pozycje poza warstwą są cicho poprawiane', () => {
    const s0 = createState(T0);
    const items = s0.rooms.salon.items.map((i) => (i.itemId === 'monstera' ? { ...i, wateredAt: undefined } : i));
    items.push({ uid: 'u90', itemId: 'pouf', x: -100, y: 3, flip: false });
    const raw = { ...s0, nextUid: 91, rooms: { ...s0.rooms, salon: { ...s0.rooms.salon, items } } };
    const { r } = load(raw, T0 + 9);
    expect(r.state.rooms.salon.items.find((i) => i.itemId === 'monstera')!.wateredAt).toBe(T0 + 9);
    expect(r.state.rooms.salon.items.find((i) => i.uid === 'u90')).toMatchObject({ x: 8, y: 132 });
  });

  it('saveState odrzuca NaN w pozycji przedmiotu i zły pokój', () => {
    const kv = memoryKV();
    const s = createState(T0);
    const bad: GameState = { ...s, rooms: { ...s.rooms, salon: { ...s.rooms.salon, items: [{ ...s.rooms.salon.items[0], x: NaN }] } } };
    expect(saveState(kv, bad)).toBe(false);
    expect(saveState(kv, { ...s, currentRoom: 'kuchnia' as GameState['currentRoom'] })).toBe(false);
    expect(saveState(kv, { ...s, inventory: { pouf: Infinity } })).toBe(false);
    expect(kv.data.size).toBe(0);
  });
});
