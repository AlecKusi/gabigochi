import { describe, expect, it } from 'vitest';
import { HOUR } from '../../src/core/time';
import type { PlacedItem } from '../../src/core/types';
import { GABI_BED, itemById, itemFrames } from '../../src/home/catalog';
import { ROOMS, itemBox } from '../../src/home/layout';
import { createHome } from '../../src/home/starter';
import { ROOM_BOUNDS } from '../../src/pet/brain';
import { FEET_Y, NIGHT_TINT, ROOM_W } from '../../src/pet/room';
import { withPreview } from '../../src/ui/home/editMode';
import { inventoryEntries, ownedLooksOf } from '../../src/ui/home/inventoryPanel';
import {
  SWIPE_MIN, WILTED_TINT, WINDOW_NIGHT_TINT, entryWalk, findBed, itemAnchor, itemFrameAnchor, itemTints, needsWater,
  neighborRoom, swipeDir, wakeSpot,
} from '../../src/ui/home/scene';
import { FRAMES } from '../../src/sprites/loader';
import { deviceRect } from '../../src/ui/pixelStage';

const T0 = new Date(2026, 9, 6, 12).getTime();
const item = (itemId: string, x = 64, y = 140, extra: Partial<PlacedItem> = {}): PlacedItem => ({ uid: 'u1', itemId, x, y, flip: false, ...extra });

describe('kotwica przedmiotu', () => {
  it('zwykły przedmiot: środek dolnej krawędzi, cały sprite', () => {
    const def = itemById('pouf');
    const a = itemAnchor(item('pouf', 40, 144), def);
    expect(a).toMatchObject({ x: 40, feetY: 144 });
    expect(a.meta).toEqual({ w: def.w, h: def.h, anchorX: def.w / 2, foot: def.h, scale: def.scale });
  });

  it('łóżko Gabi: kotwica wspólna z klatkami snu — scena snu trafia w miejsce pustego łóżka', () => {
    const def = itemById(GABI_BED);
    const bed = item(GABI_BED, 64, 136);
    const a = itemAnchor(bed, def);
    // lewy górny róg pustego łóżka z kotwicy == z prostokąta przedmiotu
    const box = itemBox(bed);
    expect(a.x - a.meta.anchorX * a.meta.scale).toBeCloseTo(box.x, 6);
    expect(a.feetY - a.meta.foot! * a.meta.scale).toBeCloseTo(box.y, 6);
    // klatki snu mają tę samą skalę i są wyrównane do tej samej kotwicy
    for (const f of ['bed_1', 'bed_3', 'bed_4', 'bed_4z']) expect(FRAMES[f]!.scale).toBeCloseTo(def.scale, 4);
  });

  it('klatki stanów: ten sam punkt co przedmiot, a przedmiot pod klatką leży w swoim prostokącie', () => {
    const def = itemById('toilet');
    const it = item('toilet', 104, 136);
    const base = itemAnchor(it, def);
    const open = itemFrameAnchor(it, def, itemFrames('toilet').open);
    expect(open).toMatchObject({ x: base.x, feetY: base.feetY });
    // otwarta klapa: rysunek toalety bez zmian, więc lewy górny róg klatki == róg przedmiotu
    const box = itemBox(it);
    expect(open.x - open.meta.anchorX * open.meta.scale).toBeCloseTo(box.x, 6);
    expect(open.feetY - open.meta.foot! * open.meta.scale).toBeCloseTo(box.y, 6);
    for (const sprite of Object.values(itemFrames('bathtub'))) {
      const a = itemFrameAnchor(item('bathtub'), itemById('bathtub'), sprite);
      expect(a.meta.scale).toBe(itemById('bathtub').scale);
    }
    // klatka narysowana inaczej niż przedmiot (Gabi przy wieszaku) — na linii stóp Gabi, w osi przedmiotu
    const rail = item('towel_rail', 40, 80);
    expect(itemFrameAnchor(rail, itemById('towel_rail'), 'towel_rail_gabi')).toMatchObject({ x: 40, feetY: FEET_Y });
    expect(() => itemFrameAnchor(it, def, 'toilet')).toThrow();
  });
});

describe('nakładki koloru', () => {
  const plant = itemById('monstera');
  it('roślina: zwiędnięta brązowieje, nocą wszystko ciemnieje, okna mocniej', () => {
    expect(itemTints(plant, item('monstera', 64, 140, { wateredAt: T0 }), false, T0 + HOUR)).toEqual([]);
    expect(itemTints(plant, item('monstera', 64, 140, { wateredAt: T0 }), false, T0 + 80 * HOUR)).toEqual([WILTED_TINT]);
    expect(itemTints(plant, item('monstera', 64, 140, { wateredAt: T0 }), true, T0 + 80 * HOUR)).toEqual([WILTED_TINT, NIGHT_TINT]);
    expect(itemTints(itemById('window_flower'), item('window_flower', 24, 48), true, T0)).toEqual([NIGHT_TINT, WINDOW_NIGHT_TINT]);
    expect(itemTints(itemById('window_flower'), item('window_flower', 24, 48), false, T0)).toEqual([]);
  });

  it('zapalona lampka nocą świeci (bez przyciemnienia)', () => {
    const lamp = itemById('nightstand_lamp');
    expect(itemTints(lamp, item('nightstand_lamp', 64, 140, { lampOn: true }), true, T0)).toEqual([]);
    expect(itemTints(lamp, item('nightstand_lamp', 64, 140, { lampOn: false }), true, T0)).toEqual([NIGHT_TINT]);
  });

  it('kropla nad spragnioną i zwiędniętą rośliną', () => {
    const p = item('monstera', 64, 140, { wateredAt: T0 });
    expect(needsWater(p, T0 + 23 * HOUR)).toBe(false);
    expect(needsWater(p, T0 + 25 * HOUR)).toBe(true);
    expect(needsWater(p, T0 + 80 * HOUR)).toBe(true);
    expect(needsWater(item('pouf'), T0 + 80 * HOUR)).toBe(false);
  });
});

describe('łóżko i pobudka', () => {
  it('findBed znajduje łóżko w sypialni', () => {
    const home = createHome(T0);
    expect(findBed(home)).toEqual({ room: 'bedroom', item: home.rooms.bedroom.items.find((i) => i.itemId === GABI_BED) });
  });

  it('łóżko za linią stóp: Gabi staje przed nim (w granicach chodzenia)', () => {
    expect(wakeSpot(item(GABI_BED, 64, 136))).toBe(64);
    expect(wakeSpot(item(GABI_BED, 4, 136))).toBe(ROOM_BOUNDS.minX);
  });

  it('łóżko bliżej widza: Gabi staje obok, gdzie jest miejsce; gdy nigdzie — na wprost', () => {
    const def = itemById(GABI_BED);
    const w = def.w * def.scale;
    // łóżko przy prawej ścianie → miejsce po lewej
    const right = item(GABI_BED, 128 - w / 2, 152);
    const x = wakeSpot(right);
    expect(x).toBeLessThan(itemBox(right).x);
    expect(x).toBeGreaterThanOrEqual(ROOM_BOUNDS.minX);
    // na środku szerokie łóżko nie zostawia miejsca po bokach
    expect(wakeSpot(item(GABI_BED, 64, 152))).toBe(64);
  });
});

describe('nawigacja między pokojami', () => {
  it('przesunięcie: tylko poziome i dłuższe niż próg', () => {
    expect(swipeDir(-(SWIPE_MIN + 1), 0)).toBe(1);
    expect(swipeDir(SWIPE_MIN + 1, 5)).toBe(-1);
    expect(swipeDir(SWIPE_MIN, 0)).toBe(0);
    expect(swipeDir(-60, 80)).toBe(0);
  });

  it('sąsiednie pokoje w kółko, ogólnie dla wszystkich z ROOMS', () => {
    for (let i = 0; i < ROOMS.length; i++) {
      expect(neighborRoom(ROOMS[i], 1)).toBe(ROOMS[(i + 1) % ROOMS.length]);
      expect(neighborRoom(ROOMS[i], -1)).toBe(ROOMS[(i - 1 + ROOMS.length) % ROOMS.length]);
    }
    expect(neighborRoom('studio', 1)).toBe('bathroom');
    expect(neighborRoom('bathroom', 1)).toBe('kitchen');
    expect(neighborRoom('balcony', 1)).toBe('salon');
  });

  it('Gabi wchodzi od strony, z której przyszła, i idzie w głąb', () => {
    const r = entryWalk(1, ROOM_W);
    expect(r.x).toBeLessThan(ROOM_BOUNDS.minX);
    expect(r.targetX).toBeGreaterThan(r.x);
    expect(r.facing).toBe('right');
    const l = entryWalk(-1, ROOM_W);
    expect(l.x).toBeGreaterThan(ROOM_BOUNDS.maxX);
    expect(l.targetX).toBeLessThan(l.x);
    expect(l.facing).toBe('left');
  });
});

describe('tryb urządzania — pomocnicze', () => {
  it('podgląd przeciągania: przedmiot w nowym miejscu i na końcu listy', () => {
    const items = [item('pouf', 20, 140, { uid: 'a' }), item('pouf', 60, 140, { uid: 'b' }), item('pouf', 100, 140, { uid: 'c' })];
    const out = withPreview(items, 'a', { x: 44, y: 148 });
    expect(out.map((i) => i.uid)).toEqual(['b', 'c', 'a']);
    expect(out[2]).toMatchObject({ x: 44, y: 148 });
    expect(items[0].x).toBe(20);
    expect(withPreview(items, 'zzz', { x: 0, y: 0 })).toBe(items);
  });

  it('magazyn: tylko znane przedmioty z dodatnią liczbą', () => {
    expect(inventoryEntries({ pouf: 2, nope: 1, monstera: 0, ficus: 1 })).toEqual([
      { itemId: 'pouf', count: 2 },
      { itemId: 'ficus', count: 1 },
    ]);
  });

  it('posiadane wyglądy danego rodzaju', () => {
    const owned = createHome(T0).ownedLooks;
    const walls = ownedLooksOf(owned, 'wallpaper');
    expect(walls.length).toBe(ROOMS.length - 1); // balkon dzieli tapetę z kuchnią (niewidoczna — niebo)
    expect(walls.every((l) => l.kind === 'wallpaper')).toBe(true);
    expect(ownedLooksOf(owned, 'floor').every((l) => l.kind === 'floor')).toBe(true);
  });
});

describe('deviceRect', () => {
  it('zaokrągla krawędzie do całych pikseli urządzenia bez szczelin', () => {
    const a = deviceRect(2.93, { x: 10, y: 20, w: 5, h: 3 });
    const b = deviceRect(2.93, { x: 15, y: 20, w: 5, h: 3 });
    expect(a.x + a.w).toBe(b.x);
    for (const v of Object.values(a)) expect(Number.isInteger(v)).toBe(true);
  });
});
