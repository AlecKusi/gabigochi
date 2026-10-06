import { describe, expect, it } from 'vitest';
import { GABI_BED, itemById } from '../../src/home/catalog';
import { ROOMS, clampToLayer, itemBox } from '../../src/home/layout';
import { DEFAULT_LOOKS } from '../../src/home/looks';
import { isPlant } from '../../src/home/plants';
import { STARTER_LAYOUT, createHome } from '../../src/home/starter';

const T0 = new Date(2026, 9, 6, 12).getTime();

describe('dom startowy', () => {
  const home = createHome(T0);

  it('trzy pokoje z domyślnymi wyglądami, start w salonie', () => {
    expect(Object.keys(home.rooms).sort()).toEqual([...ROOMS].sort());
    for (const r of ROOMS) {
      expect(home.rooms[r].wallpaper).toBe(DEFAULT_LOOKS[r].wallpaper);
      expect(home.rooms[r].floor).toBe(DEFAULT_LOOKS[r].floor);
    }
    expect(home.currentRoom).toBe('salon');
    expect(home.inventory).toEqual({});
    expect(home.itemCooldowns).toEqual({});
    expect([...home.ownedLooks].sort()).toEqual(Object.values(DEFAULT_LOOKS).flatMap((d) => [d.wallpaper, d.floor]).sort());
  });

  it('darmowe meble startowe w każdym pokoju', () => {
    const ids = (r: keyof typeof home.rooms) => home.rooms[r].items.map((i) => i.itemId);
    expect(ids('salon')).toEqual(['rug_round', 'window_flower', 'wall_shelves', 'monstera']);
    expect(ids('bedroom')).toEqual([GABI_BED, 'window_curtains', 'poster_moon']);
    expect(ids('studio')).toEqual(['window_blinds', 'writing_desk', 'office_chair', 'cactus_flower']);
    expect(ids('bathroom')).toEqual(['rug_striped', 'sink', 'window_flower', 'snake_plant', 'toilet']);
    expect(ids('bedroom').filter((i) => i.startsWith('nightstand'))).toEqual([]);
  });

  it('pozycje na siatce i w swoich warstwach; okno salonu po lewej jak dawniej', () => {
    for (const r of ROOMS) {
      for (const it of home.rooms[r].items) {
        expect(clampToLayer(itemById(it.itemId), it), `${r}/${it.itemId}`).toEqual({ x: it.x, y: it.y });
        expect(it.flip).toBe(false);
      }
    }
    const win = home.rooms.salon.items.find((i) => i.itemId === 'window_flower')!;
    expect(win.x).toBeLessThan(40);
    const bed = home.rooms.bedroom.items.find((i) => i.itemId === GABI_BED)!;
    expect(bed.x).toBe(64);
    // łóżko za linią stóp Gabi — chodzi przed nim, a nie za nim
    expect(bed.y).toBeLessThan(144);
    expect(STARTER_LAYOUT.salon.find((e) => e.itemId === 'rug_round')!.x).toBe(64);
  });

  it('łazienka: umywalka i toaleta za linią stóp Gabi, przedmioty (poza dywanem) nie nachodzą na siebie', () => {
    const items = home.rooms.bathroom.items;
    for (const id of ['sink', 'toilet']) {
      const it = items.find((i) => i.itemId === id)!;
      expect(itemById(id).category, id).toBe('bathroom');
      expect(it.y, id).toBeLessThan(144);
    }
    const boxes = items.filter((i) => itemById(i.itemId).layer !== 'rug').map((i) => ({ id: i.itemId, ...itemBox(i) }));
    for (const a of boxes) {
      for (const b of boxes) {
        if (a === b) continue;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.id} / ${b.id}`).toBe(true);
      }
    }
  });

  it('unikalne uid, licznik za ostatnim; rośliny podlane teraz', () => {
    const all = ROOMS.flatMap((r) => home.rooms[r].items);
    expect(new Set(all.map((i) => i.uid)).size).toBe(all.length);
    expect(home.nextUid).toBe(all.length + 1);
    for (const it of all) {
      if (isPlant(it.itemId)) expect(it.wateredAt).toBe(T0);
      else expect(it).not.toHaveProperty('wateredAt');
    }
  });

  it('każde wywołanie daje świeże obiekty', () => {
    const a = createHome(T0);
    a.rooms.salon.items.push({ uid: 'x', itemId: 'pouf', x: 64, y: 144, flip: false });
    expect(createHome(T0).rooms.salon.items).toHaveLength(4);
  });
});
