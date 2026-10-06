import type { GameState, PlacedItem, RoomId, RoomState } from '../core/types';
import { FLOOR_Y, ROOM_H, ROOM_W } from '../pet/room';
import { findItem, itemSize, type ItemDef } from './catalog';
import { findLook } from './looks';

export const ROOMS: readonly RoomId[] = ['salon', 'bedroom', 'studio', 'bathroom'];

export const ROOM_NAMES: Readonly<Record<RoomId, string>> = {
  salon: 'Salon',
  bedroom: 'Sypialnia',
  studio: 'Pracownia',
  bathroom: 'Łazienka',
};

/** Siatka przesuwania przedmiotów w px logicznych. */
export const GRID = 4;

/** Najniższa i najwyższa linia stóp przedmiotów podłogowych (i dywanów). */
const FLOOR_TOP = FLOOR_Y + 2;
const FLOOR_BOTTOM = ROOM_H - 1;

export type HomeError =
  | 'unknown-item'
  | 'unknown-look'
  | 'not-in-inventory'
  | 'no-coins'
  | 'not-found'
  | 'not-owned'
  | 'owned'
  | 'fixed'
  | 'not-plant';

export type HomeOutcome = { ok: true; state: GameState } | { ok: false; reason: HomeError };

export interface Pos {
  x: number;
  y: number;
}

const fail = (reason: HomeError): HomeOutcome => ({ ok: false, reason });

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID || 0; // `|| 0` zamienia -0 na 0
}

/** Najbliższa wartość na siatce w [lo, hi]; gdy w przedziale nie ma węzła siatki — po prostu przycięta. */
function snapWithin(v: number, lo: number, hi: number): number {
  const glo = Math.ceil(lo / GRID) * GRID;
  const ghi = Math.floor(hi / GRID) * GRID;
  if (glo > ghi) return Math.min(hi, Math.max(lo, v));
  return Math.min(ghi, Math.max(glo, snap(v))) || 0;
}

/** Dozwolony zakres środka (x) i linii dolnej (y) przedmiotu w jego warstwie, przed przyciąganiem do siatki. */
export function layerBounds(def: ItemDef): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const { w, h } = itemSize(def);
  const xMin = Math.min(w / 2, ROOM_W / 2);
  const xMax = Math.max(ROOM_W - w / 2, ROOM_W / 2);
  if (def.layer === 'wall') return { xMin, xMax, yMin: Math.min(h, FLOOR_Y), yMax: FLOOR_Y };
  return { xMin, xMax, yMin: FLOOR_TOP, yMax: FLOOR_BOTTOM };
}

/**
 * Pozycja przyciągnięta do siatki i ograniczona do warstwy: ścienne — dół ≤ FLOOR_Y i cały przedmiot na ścianie;
 * podłogowe i dywany — linia dolna w pasie podłogi; w poziomie cały przedmiot (szerokość ×scale) w pokoju.
 */
export function clampToLayer(def: ItemDef, pos: Pos): Pos {
  const b = layerBounds(def);
  return { x: snapWithin(pos.x, b.xMin, b.xMax), y: snapWithin(pos.y, b.yMin, b.yMax) };
}

/** Środek warstwy — tam trafia przedmiot postawiony z magazynu bez wskazanego miejsca. */
export function defaultSpot(def: ItemDef): Pos {
  const b = layerBounds(def);
  const y = def.layer === 'wall' ? (FLOOR_Y + itemSize(def).h) / 2 : (FLOOR_TOP + FLOOR_BOTTOM) / 2;
  return clampToLayer(def, { x: ROOM_W / 2, y: Math.min(b.yMax, y) });
}

/** Lewy górny róg i wymiary przedmiotu na ekranie (px logiczne). */
export function itemBox(item: PlacedItem): { x: number; y: number; w: number; h: number } {
  const def = findItem(item.itemId);
  const { w, h } = def ? itemSize(def) : { w: 0, h: 0 };
  return { x: item.x - w / 2, y: item.y - h, w, h };
}

// --- zmiany stanu ---

function withRoom(state: GameState, room: RoomId, fn: (r: RoomState) => RoomState): GameState {
  return { ...state, rooms: { ...state.rooms, [room]: fn(state.rooms[room]) } };
}

function updateItem(state: GameState, room: RoomId, uid: string, fn: (it: PlacedItem) => PlacedItem): HomeOutcome {
  if (!state.rooms[room].items.some((i) => i.uid === uid)) return fail('not-found');
  return {
    ok: true,
    state: withRoom(state, room, (r) => ({ ...r, items: r.items.map((i) => (i.uid === uid ? fn(i) : i)) })),
  };
}

/** Kupno przedmiotu do magazynu. Łóżka Gabi nie ma w sklepie. */
export function buyItem(state: GameState, itemId: string): HomeOutcome {
  const def = findItem(itemId);
  if (!def || def.special) return fail('unknown-item');
  if (state.coins < def.price) return fail('no-coins');
  return {
    ok: true,
    state: { ...state, coins: state.coins - def.price, inventory: { ...state.inventory, [itemId]: (state.inventory[itemId] ?? 0) + 1 } },
  };
}

/** Kupno tapety lub podłogi (raz; potem w dowolnej liczbie pokoi). */
export function buyLook(state: GameState, lookId: string): HomeOutcome {
  const look = findLook(lookId);
  if (!look) return fail('unknown-look');
  if (state.ownedLooks.includes(lookId)) return fail('owned');
  if (state.coins < look.price) return fail('no-coins');
  return { ok: true, state: { ...state, coins: state.coins - look.price, ownedLooks: [...state.ownedLooks, lookId] } };
}

/** Ustawia posiadaną tapetę albo podłogę (rodzaj wynika z wyglądu) w pokoju. */
export function applyLook(state: GameState, room: RoomId, lookId: string): HomeOutcome {
  const look = findLook(lookId);
  if (!look) return fail('unknown-look');
  if (!state.ownedLooks.includes(lookId)) return fail('not-owned');
  return {
    ok: true,
    state: withRoom(state, room, (r) => (look.kind === 'wallpaper' ? { ...r, wallpaper: lookId } : { ...r, floor: lookId })),
  };
}

/** Z magazynu do pokoju — w `at` (przyciągnięte do warstwy) albo na środku warstwy. Roślina jest od razu podlana. */
export function placeItem(state: GameState, room: RoomId, itemId: string, now: number, at?: Pos): HomeOutcome {
  const def = findItem(itemId);
  if (!def) return fail('unknown-item');
  const count = state.inventory[itemId] ?? 0;
  if (count <= 0) return fail('not-in-inventory');
  const inventory = { ...state.inventory };
  if (count === 1) delete inventory[itemId];
  else inventory[itemId] = count - 1;
  const pos = at ? clampToLayer(def, at) : defaultSpot(def);
  const placed: PlacedItem = { uid: `u${state.nextUid}`, itemId, x: pos.x, y: pos.y, flip: false };
  if (def.interaction === 'water') placed.wateredAt = now;
  const next = withRoom({ ...state, inventory, nextUid: state.nextUid + 1 }, room, (r) => ({ ...r, items: [...r.items, placed] }));
  return { ok: true, state: next };
}

/** Przesuwa przedmiot (siatka + warstwa) i kładzie go na wierzch w obrębie warstwy. */
export function moveItem(state: GameState, room: RoomId, uid: string, pos: Pos): HomeOutcome {
  const it = state.rooms[room].items.find((i) => i.uid === uid);
  if (!it) return fail('not-found');
  const def = findItem(it.itemId);
  if (!def) return fail('unknown-item');
  const moved = { ...it, ...clampToLayer(def, pos) };
  return {
    ok: true,
    state: withRoom(state, room, (r) => ({ ...r, items: [...r.items.filter((i) => i.uid !== uid), moved] })),
  };
}

export function flipItem(state: GameState, room: RoomId, uid: string): HomeOutcome {
  return updateItem(state, room, uid, (i) => ({ ...i, flip: !i.flip }));
}

/** Z pokoju do magazynu (traci uid i cooldown). Łóżka Gabi nie da się schować. */
export function storeItem(state: GameState, room: RoomId, uid: string): HomeOutcome {
  const it = state.rooms[room].items.find((i) => i.uid === uid);
  if (!it) return fail('not-found');
  if (findItem(it.itemId)?.special) return fail('fixed');
  const itemCooldowns = { ...state.itemCooldowns };
  delete itemCooldowns[uid];
  const next = withRoom(
    { ...state, itemCooldowns, inventory: { ...state.inventory, [it.itemId]: (state.inventory[it.itemId] ?? 0) + 1 } },
    room,
    (r) => ({ ...r, items: r.items.filter((i) => i.uid !== uid) }),
  );
  return { ok: true, state: next };
}

// --- kolejność rysowania i trafienia ---

/** Znacznik miejsca Gabi w kolejności rysowania. */
export const GABI = 'gabi' as const;
export type DrawEntry = PlacedItem | typeof GABI;

/**
 * Kolejność rysowania: dywany → ścienne → (podłogowe + Gabi) rosnąco po linii stóp. W obrębie warstwy i przy
 * równych stopach kolejność listy (później postawiony/przesunięty na wierzchu); Gabi przed przedmiotem o tych samych
 * stopach. Bez `gabiFeetY` — bez znacznika. Przedmioty spoza katalogu są pomijane.
 */
export function drawOrder(items: readonly PlacedItem[], gabiFeetY?: number): DrawEntry[] {
  const rugs: PlacedItem[] = [];
  const walls: PlacedItem[] = [];
  const floor: { y: number; i: number; e: DrawEntry }[] = [];
  items.forEach((it, i) => {
    const layer = findItem(it.itemId)?.layer;
    if (layer === 'rug') rugs.push(it);
    else if (layer === 'wall') walls.push(it);
    else if (layer === 'floor') floor.push({ y: it.y, i, e: it });
  });
  if (gabiFeetY !== undefined) floor.push({ y: gabiFeetY, i: items.length, e: GABI });
  floor.sort((a, b) => a.y - b.y || a.i - b.i);
  return [...rugs, ...walls, ...floor.map((f) => f.e)];
}

/** Przedmiot pod punktem (prostokąt sprite'a), najwyżej w kolejności rysowania; `null`, gdy żaden. */
export function hitItem(items: readonly PlacedItem[], x: number, y: number): PlacedItem | null {
  const order = drawOrder(items);
  for (let k = order.length - 1; k >= 0; k--) {
    const it = order[k] as PlacedItem;
    const b = itemBox(it);
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return it;
  }
  return null;
}
