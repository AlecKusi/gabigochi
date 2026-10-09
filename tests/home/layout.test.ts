import { describe, expect, it } from 'vitest';
import { createState } from '../../src/core/state';
import type { GameState, PlacedItem } from '../../src/core/types';
import { CATALOG, GABI_BED, itemById, itemSize } from '../../src/home/catalog';
import { DEFAULT_LOOKS, LOOKS } from '../../src/home/looks';
import {
  GABI, GRID, ROOMS, ROOM_NAMES, applyLook, buyItem, buyLook, clampToLayer, defaultSpot, drawOrder, flipItem,
  hitItem, itemBox, moveItem, placeItem, snap, storeItem,
} from '../../src/home/layout';
import { FLOOR_Y, ROOM_H, ROOM_W } from '../../src/pet/room';

const T0 = new Date(2026, 9, 6, 12).getTime();
const base = (patch: Partial<GameState> = {}): GameState => ({ ...createState(T0), ...patch });
const empty = (patch: Partial<GameState> = {}): GameState => {
  const s = base(patch);
  return {
    ...s,
    rooms: {
      salon: { ...s.rooms.salon, items: [] },
      bedroom: { ...s.rooms.bedroom, items: [] },
      studio: { ...s.rooms.studio, items: [] },
      bathroom: { ...s.rooms.bathroom, items: [] },
      kitchen: { ...s.rooms.kitchen, items: [] },
      balcony: { ...s.rooms.balcony, items: [] },
    },
  };
};
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  if (!r.ok) throw new Error(`oczekiwano ok: ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
};
const item = (p: Partial<PlacedItem> & { itemId: string }): PlacedItem => ({ uid: p.itemId, x: 64, y: 144, flip: false, ...p });

/** Sprawdza, czy pozycja mieści się w warstwie przedmiotu. */
function inLayer(id: string, x: number, y: number): boolean {
  const d = itemById(id);
  const { w, h } = itemSize(d);
  const xOk = x - w / 2 >= 0 && x + w / 2 <= ROOM_W;
  const yOk = d.layer === 'wall' ? y <= FLOOR_Y && y - h >= 0 : y >= FLOOR_Y + 2 && y <= ROOM_H - 1;
  return xOk && yOk;
}

describe('pokoje i siatka', () => {
  it('trzy pokoje z polskimi nazwami', () => {
    expect(ROOMS).toEqual(['salon', 'bedroom', 'studio', 'bathroom', 'kitchen', 'balcony']);
    expect(ROOM_NAMES).toEqual({ salon: 'Salon', bedroom: 'Sypialnia', studio: 'Pracownia', bathroom: 'Łazienka', kitchen: 'Kuchnia', balcony: 'Balkon' });
  });

  it('snap do siatki 4 px', () => {
    expect(GRID).toBe(4);
    expect(snap(5)).toBe(4);
    expect(snap(6)).toBe(8);
    expect(snap(64)).toBe(64);
    expect(snap(-1)).toBe(0);
    expect(Object.is(snap(-1), 0)).toBe(true);
  });
});

describe('clampToLayer', () => {
  it('przedmiot ścienny: dół najwyżej na FLOOR_Y, cały na ścianie', () => {
    const poster = itemById('poster_sun'); // 17×25
    expect(clampToLayer(poster, { x: 50, y: 200 })).toEqual({ x: 52, y: FLOOR_Y });
    expect(clampToLayer(poster, { x: 50, y: 0 })).toEqual({ x: 52, y: 28 });
    expect(clampToLayer(poster, { x: -30, y: 60 })).toEqual({ x: 12, y: 60 });
    expect(clampToLayer(poster, { x: 500, y: 60 })).toEqual({ x: 116, y: 60 });
  });

  it('przedmiot podłogowy: stopy w pasie podłogi', () => {
    const chair = itemById('office_chair');
    expect(clampToLayer(chair, { x: 64, y: 40 })).toEqual({ x: 64, y: 132 });
    expect(clampToLayer(chair, { x: 64, y: 400 })).toEqual({ x: 64, y: 156 });
    expect(clampToLayer(chair, { x: 63, y: 143 })).toEqual({ x: 64, y: 144 });
  });

  it('dywan jak podłoga; szerokość ze skalą', () => {
    const rug = itemById('rug_round'); // 57×0.6 = 34.2
    expect(clampToLayer(rug, { x: 0, y: 0 })).toEqual({ x: 20, y: 132 });
    expect(clampToLayer(rug, { x: 200, y: 200 })).toEqual({ x: 108, y: 156 });
  });

  it('dla każdego przedmiotu i wielu pozycji wynik jest na siatce i w warstwie; clamp jest idempotentny', () => {
    const probes = [-50, 0, 3, 17, 40, 63, 64, 90, 127, 128, 131, 145, 159, 160, 300];
    for (const d of [...CATALOG, itemById(GABI_BED)]) {
      for (const x of probes) {
        for (const y of probes) {
          const p = clampToLayer(d, { x, y });
          expect(p.x % GRID, d.id).toBe(0);
          expect(p.y % GRID, d.id).toBe(0);
          expect(inLayer(d.id, p.x, p.y), `${d.id} ${x},${y} → ${p.x},${p.y}`).toBe(true);
          expect(clampToLayer(d, p)).toEqual(p);
        }
      }
    }
  });

  it('defaultSpot: środek warstwy', () => {
    expect(defaultSpot(itemById('office_chair'))).toEqual({ x: 64, y: 144 });
    const p = defaultSpot(itemById('poster_sun'));
    expect(p.x).toBe(64);
    expect(inLayer('poster_sun', p.x, p.y)).toBe(true);
    expect(p.y).toBeGreaterThan(40);
    expect(p.y).toBeLessThan(100);
  });
});

describe('zakupy', () => {
  it('buyItem: monety → magazyn', () => {
    const s = ok(buyItem(base({ coins: 500 }), 'pouf')).state;
    expect(s.coins).toBe(450);
    expect(s.inventory.pouf).toBe(1);
    const s2 = ok(buyItem(s, 'pouf')).state;
    expect(s2.inventory.pouf).toBe(2);
  });

  it('buyItem: brak monet, nieznany, łóżko Gabi nie na sprzedaż', () => {
    expect(buyItem(base({ coins: 10 }), 'pouf')).toEqual({ ok: false, reason: 'no-coins' });
    expect(buyItem(base({ coins: 999 }), 'nope')).toEqual({ ok: false, reason: 'unknown-item' });
    expect(buyItem(base({ coins: 999 }), GABI_BED)).toEqual({ ok: false, reason: 'unknown-item' });
    expect(buyItem(base({ coins: 999 }), 'gabi_bed_empty')).toEqual({ ok: false, reason: 'unknown-item' });
  });

  it('buyLook: kupuje raz, odmawia przy braku monet, znanym lub nieznanym', () => {
    const look = LOOKS.find((l) => l.price > 0)!;
    const s = ok(buyLook(base({ coins: 1000 }), look.id)).state;
    expect(s.coins).toBe(1000 - look.price);
    expect(s.ownedLooks).toContain(look.id);
    expect(buyLook(s, look.id)).toEqual({ ok: false, reason: 'owned' });
    expect(buyLook(base({ coins: 1000 }), DEFAULT_LOOKS.salon.wallpaper)).toEqual({ ok: false, reason: 'owned' });
    expect(buyLook(base({ coins: 0 }), look.id)).toEqual({ ok: false, reason: 'no-coins' });
    expect(buyLook(base(), 'nope')).toEqual({ ok: false, reason: 'unknown-look' });
  });
});

describe('stawianie i przesuwanie', () => {
  it('placeItem: z magazynu na środek warstwy, nowy uid, magazyn maleje', () => {
    const s0 = empty({ inventory: { pouf: 2 } });
    const s1 = ok(placeItem(s0, 'salon', 'pouf', T0)).state;
    expect(s1.inventory.pouf).toBe(1);
    expect(s1.rooms.salon.items).toEqual([{ uid: `u${s0.nextUid}`, itemId: 'pouf', x: 64, y: 144, flip: false }]);
    expect(s1.nextUid).toBe(s0.nextUid + 1);
    const s2 = ok(placeItem(s1, 'salon', 'pouf', T0, { x: 3, y: 500 })).state;
    expect(s2.inventory).toEqual({});
    expect(s2.rooms.salon.items[1]).toMatchObject({ uid: `u${s0.nextUid + 1}`, x: 8, y: 156 });
    expect(s2.rooms.bedroom).toBe(s0.rooms.bedroom);
  });

  it('placeItem: roślina dostaje wateredAt', () => {
    const s = ok(placeItem(empty({ inventory: { fern_small: 1 } }), 'studio', 'fern_small', T0 + 5)).state;
    expect(s.rooms.studio.items[0].wateredAt).toBe(T0 + 5);
  });

  it('placeItem: brak w magazynie lub nieznany → błąd', () => {
    expect(placeItem(empty(), 'salon', 'pouf', T0)).toEqual({ ok: false, reason: 'not-in-inventory' });
    expect(placeItem(empty({ inventory: { nope: 1 } }), 'salon', 'nope', T0)).toEqual({ ok: false, reason: 'unknown-item' });
  });

  it('nie zmienia stanu wejściowego', () => {
    const s0 = empty({ inventory: { pouf: 1 } });
    const before = JSON.stringify(s0);
    placeItem(s0, 'salon', 'pouf', T0);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it('moveItem: siatka + warstwa, przeniesiony przedmiot na wierzch listy', () => {
    let s = empty({ inventory: { pouf: 1, poster_sun: 1 } });
    s = ok(placeItem(s, 'salon', 'pouf', T0)).state;
    s = ok(placeItem(s, 'salon', 'poster_sun', T0)).state;
    const [pouf, poster] = s.rooms.salon.items;
    s = ok(moveItem(s, 'salon', pouf.uid, { x: 30, y: 10 })).state;
    expect(s.rooms.salon.items.map((i) => i.uid)).toEqual([poster.uid, pouf.uid]);
    expect(s.rooms.salon.items[1]).toMatchObject({ x: 32, y: 132 });
    s = ok(moveItem(s, 'salon', poster.uid, { x: 30, y: 150 })).state;
    expect(s.rooms.salon.items[1]).toMatchObject({ uid: poster.uid, x: 32, y: FLOOR_Y });
    expect(moveItem(s, 'salon', 'zzz', { x: 0, y: 0 })).toEqual({ ok: false, reason: 'not-found' });
    expect(moveItem(s, 'bedroom', pouf.uid, { x: 0, y: 0 })).toEqual({ ok: false, reason: 'not-found' });
  });

  it('flipItem odwraca w poziomie', () => {
    let s = ok(placeItem(empty({ inventory: { pouf: 1 } }), 'salon', 'pouf', T0)).state;
    const uid = s.rooms.salon.items[0].uid;
    s = ok(flipItem(s, 'salon', uid)).state;
    expect(s.rooms.salon.items[0].flip).toBe(true);
    s = ok(flipItem(s, 'salon', uid)).state;
    expect(s.rooms.salon.items[0].flip).toBe(false);
    expect(flipItem(s, 'salon', 'zzz')).toEqual({ ok: false, reason: 'not-found' });
  });

  it('storeItem: do magazynu, kasuje cooldown; łóżka Gabi nie da się schować', () => {
    let s = ok(placeItem(empty({ inventory: { pouf: 1 } }), 'salon', 'pouf', T0)).state;
    const uid = s.rooms.salon.items[0].uid;
    s = { ...s, itemCooldowns: { [uid]: T0, other: T0 } };
    s = ok(storeItem(s, 'salon', uid)).state;
    expect(s.rooms.salon.items).toEqual([]);
    expect(s.inventory).toEqual({ pouf: 1 });
    expect(s.itemCooldowns).toEqual({ other: T0 });
    expect(storeItem(s, 'salon', uid)).toEqual({ ok: false, reason: 'not-found' });
    const bed = base().rooms.bedroom.items.find((i) => i.itemId === GABI_BED)!;
    expect(storeItem(base(), 'bedroom', bed.uid)).toEqual({ ok: false, reason: 'fixed' });
  });

  it('storeItem → placeItem daje nowy uid', () => {
    let s = ok(placeItem(empty({ inventory: { pouf: 1 } }), 'salon', 'pouf', T0)).state;
    const uid = s.rooms.salon.items[0].uid;
    s = ok(storeItem(s, 'salon', uid)).state;
    s = ok(placeItem(s, 'studio', 'pouf', T0)).state;
    expect(s.rooms.studio.items[0].uid).not.toBe(uid);
  });
});

describe('applyLook', () => {
  it('stosuje posiadaną tapetę/podłogę tylko w danym pokoju', () => {
    const s0 = base();
    const s = ok(applyLook(s0, 'salon', DEFAULT_LOOKS.studio.wallpaper)).state;
    expect(s.rooms.salon.wallpaper).toBe(DEFAULT_LOOKS.studio.wallpaper);
    expect(s.rooms.salon.floor).toBe(DEFAULT_LOOKS.salon.floor);
    expect(s.rooms.studio).toBe(s0.rooms.studio);
    const s2 = ok(applyLook(s, 'salon', DEFAULT_LOOKS.bedroom.floor)).state;
    expect(s2.rooms.salon.floor).toBe(DEFAULT_LOOKS.bedroom.floor);
  });

  it('nieposiadany lub nieznany → błąd', () => {
    const paid = LOOKS.find((l) => l.price > 0)!;
    expect(applyLook(base(), 'salon', paid.id)).toEqual({ ok: false, reason: 'not-owned' });
    expect(applyLook(base(), 'salon', 'nope')).toEqual({ ok: false, reason: 'unknown-look' });
    const s = ok(buyLook(base({ coins: 1000 }), paid.id)).state;
    expect(applyLook(s, 'bedroom', paid.id).ok).toBe(true);
  });
});

describe('drawOrder i hitItem', () => {
  const rug = item({ uid: 'rug', itemId: 'rug_round', x: 64, y: 156 });
  const poster = item({ uid: 'poster', itemId: 'poster_sun', x: 64, y: 100 });
  const chairBack = item({ uid: 'chairBack', itemId: 'office_chair', x: 64, y: 136 });
  const chairFront = item({ uid: 'chairFront', itemId: 'office_chair', x: 70, y: 152 });

  it('tło → dywany → ściana → podłoga i Gabi po linii stóp', () => {
    const order = drawOrder([chairFront, poster, rug, chairBack], 144);
    expect(order.map((e) => (e === GABI ? 'gabi' : e.uid))).toEqual(['rug', 'poster', 'chairBack', 'gabi', 'chairFront']);
  });

  it('remis z Gabi: Gabi przed przedmiotem; bez stóp Gabi — bez markera', () => {
    const same = item({ uid: 's', itemId: 'pouf', y: 144 });
    expect(drawOrder([same], 144)).toEqual([same, GABI]);
    expect(drawOrder([chairFront, chairBack])).toEqual([chairBack, chairFront]);
  });

  it('w obrębie warstwy kolejność stabilna (później postawiony na wierzchu)', () => {
    const a = item({ uid: 'a', itemId: 'pouf', y: 140 });
    const b = item({ uid: 'b', itemId: 'pouf', y: 140 });
    expect(drawOrder([a, b])).toEqual([a, b]);
    const w1 = item({ uid: 'w1', itemId: 'poster_sun', y: 60 });
    const w2 = item({ uid: 'w2', itemId: 'poster_sun', y: 40 });
    expect(drawOrder([w1, w2])).toEqual([w1, w2]);
  });

  it('pomija przedmioty spoza katalogu', () => {
    expect(drawOrder([item({ itemId: 'nope' })], 144)).toEqual([GABI]);
  });

  it('itemBox: lewy górny róg i wymiary ze skalą', () => {
    const { w, h } = itemSize(itemById('rug_round'));
    expect(itemBox(rug)).toEqual({ x: 64 - w / 2, y: 156 - h, w, h });
    expect(w).toBeCloseTo(34.2);
  });

  it('hitItem zwraca najwyższy w z-order', () => {
    const items = [rug, poster, chairBack, chairFront];
    expect(hitItem(items, 70, 150)?.uid).toBe('chairFront');
    expect(hitItem(items, 58, 133)?.uid).toBe('chairBack');
    expect(hitItem(items, 50, 154)?.uid).toBe('rug');
    expect(hitItem(items, 64, 90)?.uid).toBe('poster');
    expect(hitItem(items, 5, 5)).toBeNull();
  });

  it('hitItem: granice pudełka (lewa/górna włącznie, prawa/dolna wyłącznie)', () => {
    const p = item({ uid: 'p', itemId: 'pc_desk', x: 64, y: 150 }); // 49×50
    expect(hitItem([p], 64 - 24.5, 100)?.uid).toBe('p');
    expect(hitItem([p], 64 + 24.5, 120)).toBeNull();
    expect(hitItem([p], 64, 150)).toBeNull();
  });
});
